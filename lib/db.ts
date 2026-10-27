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
function toPgArray(values: string[] | null | undefined): string | null {
  if (!values || values.length === 0) return null;
  const quoted = values.map((v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  return `{${quoted.join(",")}}`;
}

/** Escape LIKE wildcards so user input is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

// Note: tags is selected as JSON (to_jsonb) so the driver always yields an
// array or null, never a Postgres array literal string.

export async function getAllSongsMeta(): Promise<SongMeta[]> {
  const sql = db();
  const rows = await sql`
    SELECT id, title_telugu, title_english, movie_name, genre,
           to_jsonb(tags) AS tags, created_at
    FROM songs
    ORDER BY created_at DESC
  `;
  return rows as SongMeta[];
}

// cache() de-duplicates the lookup when both generateMetadata and the page
// render ask for the same song in one request.
export const getSongById = cache(async (id: string): Promise<Song | null> => {
  if (!isUuid(id)) return null;
  const sql = db();
  const rows = await sql`
    SELECT id, title_telugu, title_english, movie_name, genre, lyrics,
           to_jsonb(tags) AS tags, created_at
    FROM songs
    WHERE id = ${id}
    LIMIT 1
  `;
  return (rows[0] as Song | undefined) ?? null;
});

export async function searchSongs(query: string): Promise<SongMeta[]> {
  const q = query.trim();
  if (!q) return [];

  const pattern = `%${escapeLike(q)}%`;
  const sql = db();

  // Title matches rank above movie matches, which rank above lyrics-only hits.
  return (await sql`
    SELECT id, title_telugu, title_english, movie_name, genre,
           to_jsonb(tags) AS tags, created_at
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

export type SongInput = {
  title_telugu: string;
  title_english: string | null;
  movie_name: string | null;
  genre: string | null;
  lyrics: string;
  tags: string[] | null;
};

export async function createSong(input: SongInput): Promise<Song> {
  const sql = db();
  const rows = await sql`
    INSERT INTO songs (title_telugu, title_english, movie_name, genre, lyrics, tags)
    VALUES (
      ${input.title_telugu}, ${input.title_english}, ${input.movie_name},
      ${input.genre}, ${input.lyrics}, ${toPgArray(input.tags)}::text[]
    )
    RETURNING id, title_telugu, title_english, movie_name, genre, lyrics,
              to_jsonb(tags) AS tags, created_at
  `;
  return rows[0] as Song;
}

export async function updateSong(id: string, input: SongInput): Promise<Song | null> {
  if (!isUuid(id)) return null;
  const sql = db();
  const rows = await sql`
    UPDATE songs SET
      title_telugu  = ${input.title_telugu},
      title_english = ${input.title_english},
      movie_name    = ${input.movie_name},
      genre         = ${input.genre},
      lyrics        = ${input.lyrics},
      tags          = ${toPgArray(input.tags)}::text[]
    WHERE id = ${id}
    RETURNING id, title_telugu, title_english, movie_name, genre, lyrics,
              to_jsonb(tags) AS tags, created_at
  `;
  return (rows[0] as Song | undefined) ?? null;
}
