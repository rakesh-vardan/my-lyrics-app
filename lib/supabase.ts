import { createClient } from '@supabase/supabase-js';

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

// Song metadata without lyrics — used for list/search views to reduce payload
export type SongMeta = Omit<Song, "lyrics">;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.error(
      'Supabase environment variables are not set. ' +
      'Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder'
);
