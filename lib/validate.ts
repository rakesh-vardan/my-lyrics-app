import { isGenre } from "./types";
import type { SongInput } from "./db";

const MAX_TITLE = 300;
const MAX_LYRICS = 200_000;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 50;
const MAX_PERSON = 200;
const MIN_YEAR = 1900;
const MAX_YEAR = 2099;
const MAX_URL = 500;

export type ValidationResult =
  | { ok: true; value: SongInput }
  | { ok: false; error: string };

function optionalText(value: unknown, max: number): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) return undefined;
  return trimmed;
}

type FieldResult = { ok: true; value: string | null } | { ok: false; error: string };

/** Optional free-text field: null when absent, error when malformed. */
function textField(field: string, value: unknown, max: number): FieldResult {
  const parsed = optionalText(value, max);
  if (parsed === undefined) {
    return { ok: false, error: `${field} must be a string of at most ${max} characters.` };
  }
  return { ok: true, value: parsed };
}

function parseYear(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  const year = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) return undefined;
  return year;
}

/**
 * Only http(s) URLs are accepted. MediaEmbed renders unknown URLs as a link,
 * so a `javascript:` URL here would be an XSS vector.
 */
function parseMediaUrl(value: unknown): string | null | undefined {
  const text = optionalText(value, MAX_URL);
  if (text === undefined) return undefined;
  if (text === null) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function parseTags(value: unknown): string[] | null | undefined {
  if (value === undefined || value === null) return null;

  let list: unknown[];
  if (Array.isArray(value)) {
    list = value;
  } else if (typeof value === "string") {
    list = value.split(",");
  } else {
    return undefined;
  }

  const tags: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") return undefined;
    const tag = item.trim();
    if (!tag) continue;
    if (tag.length > MAX_TAG_LENGTH) return undefined;
    if (!tags.includes(tag)) tags.push(tag);
  }

  if (tags.length > MAX_TAGS) return undefined;
  return tags.length > 0 ? tags : null;
}

/**
 * Turns untrusted request JSON into a SongInput. Also grants a small amount of
 * tolerance: tags may arrive as an array (current client) or a comma string.
 */
export function parseSongInput(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Expected a JSON object." };
  }
  const raw = body as Record<string, unknown>;

  const title_telugu = optionalText(raw.title_telugu, MAX_TITLE);
  if (!title_telugu) {
    return { ok: false, error: "title_telugu is required." };
  }

  const lyrics = optionalText(raw.lyrics, MAX_LYRICS);
  if (!lyrics) {
    return { ok: false, error: "lyrics is required." };
  }

  const title_english = textField("title_english", raw.title_english, MAX_TITLE);
  if (!title_english.ok) return title_english;
  const movie_name = textField("movie_name", raw.movie_name, MAX_TITLE);
  if (!movie_name.ok) return movie_name;
  const singer = textField("singer", raw.singer, MAX_PERSON);
  if (!singer.ok) return singer;
  const lyricist = textField("lyricist", raw.lyricist, MAX_PERSON);
  if (!lyricist.ok) return lyricist;
  const music_director = textField("music_director", raw.music_director, MAX_PERSON);
  if (!music_director.ok) return music_director;

  const year = parseYear(raw.year);
  if (year === undefined) {
    return { ok: false, error: `year must be a whole number between ${MIN_YEAR} and ${MAX_YEAR}.` };
  }

  const media_url = parseMediaUrl(raw.media_url);
  if (media_url === undefined) {
    return { ok: false, error: "media_url must be an http(s) URL." };
  }

  let genre: string | null = null;
  if (raw.genre !== undefined && raw.genre !== null && raw.genre !== "") {
    if (!isGenre(raw.genre)) {
      return { ok: false, error: "genre is not a recognised value." };
    }
    genre = raw.genre;
  }

  const tags = parseTags(raw.tags);
  if (tags === undefined) {
    return {
      ok: false,
      error: `tags must be up to ${MAX_TAGS} strings of at most ${MAX_TAG_LENGTH} characters.`,
    };
  }

  return {
    ok: true,
    value: {
      title_telugu,
      title_english: title_english.value,
      movie_name: movie_name.value,
      genre,
      year,
      singer: singer.value,
      lyricist: lyricist.value,
      music_director: music_director.value,
      media_url,
      lyrics,
      tags,
    },
  };
}
