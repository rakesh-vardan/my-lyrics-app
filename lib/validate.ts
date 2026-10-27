import { isGenre } from "./types";
import type { SongInput } from "./db";

const MAX_TITLE = 300;
const MAX_LYRICS = 200_000;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 50;

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

  const title_english = optionalText(raw.title_english, MAX_TITLE);
  const movie_name = optionalText(raw.movie_name, MAX_TITLE);
  if (title_english === undefined) {
    return { ok: false, error: "title_english must be a string up to 300 characters." };
  }
  if (movie_name === undefined) {
    return { ok: false, error: "movie_name must be a string up to 300 characters." };
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
    value: { title_telugu, title_english, movie_name, genre, lyrics, tags },
  };
}
