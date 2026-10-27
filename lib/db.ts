import "server-only";
import { cache } from "react";
import { neon } from "@neondatabase/serverless";
import type { Song, SongMeta } from "./types";

/**
 * Neon Postgres data layer. Server-only: the connection string must never
 * reach the browser, so every read and write goes through an API route or a
 * server component.
 */

function db() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy the connection string from the Neon console into your environment."
    );
  }
  return neon(url);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Serialise a JS array into a Postgres array literal, then cast it in SQL.
 * Explicit and driver-independent — no reliance on implicit array params.
 */
function toPgArray(values: readonly string[] | null | undefined): string | null {
  if (!values || values.length === 0) return null;
  const quoted = values.map((v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  return `{${quoted.join(",")}}`;
}

/** Escape LIKE wildcards so user input is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

// tags is selected as JSON (to_jsonb) so the driver always yields an array or
// null, never a Postgres array literal string.
const META_COLUMNS = `
  id, title_telugu, title_english, movie_name, genre, year, singer, lyricist,
  music_director, media_url, to_jsonb(tags) AS tags, created_at
`;

const FULL_COLUMNS = `${META_COLUMNS}, lyrics`;

// ---------------------------------------------------------------------------
// Listing, filtering, pagination
// ---------------------------------------------------------------------------

export const SONG_SORTS = ["recent", "title_telugu", "title_english", "movie_name"] as const;
export type SongSort = (typeof SONG_SORTS)[number];

export function isSongSort(value: unknown): value is SongSort {
  return typeof value === "string" && (SONG_SORTS as readonly string[]).includes(value);
}

export interface SongQuery {
  /** Restrict to these ids (favorites). Ignored when empty. */
  ids?: string[];
  genre?: string;
  movie?: string;
  tag?: string;
  /** First character of title_telugu — drives the Telugu alphabet index. */
  letter?: string;
  sort?: SongSort;
  limit?: number;
  offset?: number;
}

const ORDER_BY: Record<SongSort, string> = {
  recent: "created_at DESC",
  title_telugu: "title_telugu ASC",
  title_english: "title_english ASC NULLS LAST",
  movie_name: "movie_name ASC NULLS LAST",
};

/**
 * Builds the shared WHERE clause for listing. Parameters are positional
 * ($1, $2, …) and always passed as values, never interpolated.
 */
function buildWhere(query: SongQuery): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const push = (sql: (n: number) => string, value: unknown) => {
    params.push(value);
    conditions.push(sql(params.length));
  };

  if (query.ids && query.ids.length > 0) {
    const ids = query.ids.filter(isUuid);
    if (ids.length === 0) {
      // No valid ids: match nothing rather than ignore the filter.
      conditions.push("FALSE");
    } else {
      push((n) => `id = ANY($${n}::uuid[])`, toPgArray(ids));
    }
  }
  if (query.genre) push((n) => `genre = $${n}`, query.genre);
  if (query.movie) push((n) => `movie_name = $${n}`, query.movie);
  if (query.tag) push((n) => `$${n} = ANY(tags)`, query.tag);
  if (query.letter) {
    push((n) => `title_telugu LIKE $${n}`, `${escapeLike(query.letter)}%`);
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

/**
 * One page of the library plus the total for the same filters, so the client
 * can paginate without refetching everything.
 */
export async function listSongs(
  query: SongQuery = {}
): Promise<{ songs: SongMeta[]; total: number }> {
  const sql = db();
  const { clause, params } = buildWhere(query);

  const limit = Math.min(Math.max(query.limit ?? 20, 1), 200);
  const offset = Math.max(query.offset ?? 0, 0);
  const orderBy = ORDER_BY[query.sort ?? "recent"];

  // count and page share the same parameters, so run them together.
  const [page, counted] = await Promise.all([
    sql.query(
      `SELECT ${META_COLUMNS} FROM songs ${clause}
       ORDER BY ${orderBy}, id
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    sql.query(`SELECT count(*)::int AS total FROM songs ${clause}`, params),
  ]);

  return {
    songs: page as SongMeta[],
    total: (counted as { total: number }[])[0]?.total ?? 0,
  };
}

/** Distinct values for the filter dropdowns, plus the library size. */
export async function getFilterOptions(): Promise<{
  movies: string[];
  tags: string[];
  genres: string[];
  total: number;
}> {
  const sql = db();
  const rows = (await sql`
    SELECT
      (SELECT COALESCE(jsonb_agg(DISTINCT movie_name ORDER BY movie_name), '[]'::jsonb)
         FROM songs WHERE movie_name IS NOT NULL AND movie_name <> '') AS movies,
      (SELECT COALESCE(jsonb_agg(DISTINCT tag ORDER BY tag), '[]'::jsonb)
         FROM songs, LATERAL unnest(tags) AS tag) AS tags,
      (SELECT COALESCE(jsonb_agg(DISTINCT genre ORDER BY genre), '[]'::jsonb)
         FROM songs WHERE genre IS NOT NULL) AS genres,
      (SELECT count(*)::int FROM songs) AS total
  `) as { movies: string[]; tags: string[]; genres: string[]; total: number }[];

  const row = rows[0];
  return {
    movies: row?.movies ?? [],
    tags: row?.tags ?? [],
    genres: row?.genres ?? [],
    total: row?.total ?? 0,
  };
}

/** Metadata for a set of ids, ordered to match the input. */
export async function getSongsByIds(ids: string[]): Promise<SongMeta[]> {
  const valid = ids.filter(isUuid);
  if (valid.length === 0) return [];

  const sql = db();
  const rows = (await sql`
    SELECT ${sql.unsafe(META_COLUMNS)}
    FROM songs
    WHERE id = ANY(${toPgArray(valid)}::uuid[])
  `) as SongMeta[];

  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row): row is SongMeta => Boolean(row));
}

/** A random song id, for "Surprise me". Null when the library is empty. */
export async function getRandomSongId(): Promise<string | null> {
  const sql = db();
  const rows = (await sql`SELECT id FROM songs ORDER BY random() LIMIT 1`) as { id: string }[];
  return rows[0]?.id ?? null;
}

/** True when a song with this exact title (case-insensitive) already exists. */
export async function findDuplicateTitle(
  title: string
): Promise<{ id: string; title_telugu: string; movie_name: string | null } | null> {
  const sql = db();
  const rows = (await sql`
    SELECT id, title_telugu, movie_name
    FROM songs
    WHERE title_telugu ILIKE ${title}
    LIMIT 1
  `) as { id: string; title_telugu: string; movie_name: string | null }[];
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Browse pages
// ---------------------------------------------------------------------------

export interface GenreRow {
  id: string;
  title_telugu: string;
  title_english: string | null;
  genre: string | null;
  movie_name: string | null;
}

export async function getSongsForGenres(): Promise<GenreRow[]> {
  const sql = db();
  return (await sql`
    SELECT id, title_telugu, title_english, genre, movie_name
    FROM songs
    ORDER BY title_telugu
  `) as GenreRow[];
}

export interface MovieRow {
  id: string;
  title_telugu: string;
  title_english: string | null;
  movie_name: string | null;
}

export async function getSongsForMovies(): Promise<MovieRow[]> {
  const sql = db();
  return (await sql`
    SELECT id, title_telugu, title_english, movie_name
    FROM songs
    ORDER BY movie_name ASC NULLS LAST, title_telugu
  `) as MovieRow[];
}

// ---------------------------------------------------------------------------
// Single song
// ---------------------------------------------------------------------------

// cache() de-duplicates the lookup when both generateMetadata and the page
// render ask for the same song in one request.
export const getSongById = cache(async (id: string): Promise<Song | null> => {
  if (!isUuid(id)) return null;
  const sql = db();
  const rows = (await sql`
    SELECT ${sql.unsafe(FULL_COLUMNS)}
    FROM songs
    WHERE id = ${id}
    LIMIT 1
  `) as Song[];
  return rows[0] ?? null;
});

/** Ids of the songs in the same movie, oldest first — drives prev/next. */
export async function getMovieSiblingIds(movieName: string): Promise<string[]> {
  const sql = db();
  const rows = (await sql`
    SELECT id FROM songs
    WHERE movie_name = ${movieName}
    ORDER BY created_at ASC, id
  `) as { id: string }[];
  return rows.map((row) => row.id);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchSongs(query: string): Promise<SongMeta[]> {
  const q = query.trim();
  if (!q) return [];

  const pattern = `%${escapeLike(q)}%`;
  const sql = db();

  // Title matches rank above movie matches, which rank above lyrics-only hits.
  return (await sql`
    SELECT ${sql.unsafe(META_COLUMNS)}
    FROM songs
    WHERE title_telugu  ILIKE ${pattern}
       OR title_english ILIKE ${pattern}
       OR movie_name    ILIKE ${pattern}
       OR lyrics        ILIKE ${pattern}
    ORDER BY
      CASE
        WHEN title_telugu ILIKE ${pattern} OR title_english ILIKE ${pattern} THEN 0
        WHEN movie_name   ILIKE ${pattern} THEN 1
        ELSE 2
      END,
      created_at DESC
    LIMIT 50
  `) as SongMeta[];
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export type SongInput = {
  title_telugu: string;
  title_english: string | null;
  movie_name: string | null;
  genre: string | null;
  year: number | null;
  singer: string | null;
  lyricist: string | null;
  music_director: string | null;
  media_url: string | null;
  lyrics: string;
  tags: string[] | null;
};

export async function createSong(input: SongInput): Promise<Song> {
  const sql = db();
  const rows = (await sql`
    INSERT INTO songs (
      title_telugu, title_english, movie_name, genre, year, singer, lyricist,
      music_director, media_url, lyrics, tags
    )
    VALUES (
      ${input.title_telugu}, ${input.title_english}, ${input.movie_name},
      ${input.genre}, ${input.year}, ${input.singer}, ${input.lyricist},
      ${input.music_director}, ${input.media_url}, ${input.lyrics},
      ${toPgArray(input.tags)}::text[]
    )
    RETURNING ${sql.unsafe(FULL_COLUMNS)}
  `) as Song[];
  return rows[0];
}

export async function updateSong(id: string, input: SongInput): Promise<Song | null> {
  if (!isUuid(id)) return null;
  const sql = db();
  const rows = (await sql`
    UPDATE songs SET
      title_telugu   = ${input.title_telugu},
      title_english  = ${input.title_english},
      movie_name     = ${input.movie_name},
      genre          = ${input.genre},
      year           = ${input.year},
      singer         = ${input.singer},
      lyricist       = ${input.lyricist},
      music_director = ${input.music_director},
      media_url      = ${input.media_url},
      lyrics         = ${input.lyrics},
      tags           = ${toPgArray(input.tags)}::text[]
    WHERE id = ${id}
    RETURNING ${sql.unsafe(FULL_COLUMNS)}
  `) as Song[];
  return rows[0] ?? null;
}
