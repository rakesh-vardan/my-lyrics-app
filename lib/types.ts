export type Song = {
  id: string;
  title_telugu: string;
  title_english: string | null;
  movie_name: string | null;
  genre: string | null;
  lyrics: string;
  tags: string[] | null;
  created_at: string;
};

// Song metadata without lyrics — used for list/search views to reduce payload
export type SongMeta = Omit<Song, "lyrics">;

export const GENRES = [
  "Devotional",
  "Romantic",
  "Melody",
  "Folk",
  "Classical",
  "Patriotic",
  "Sad",
  "Dance",
  "Other",
] as const;

export type Genre = (typeof GENRES)[number];

export function isGenre(value: unknown): value is Genre {
  return typeof value === "string" && (GENRES as readonly string[]).includes(value);
}
