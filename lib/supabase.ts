import { createClient } from '@supabase/supabase-js';

export type Song = {
  id: string;
  title_telugu: string;
  title_english: string | null;
  movie_name: string | null;
  lyrics: string;
  tags: string[] | null;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
