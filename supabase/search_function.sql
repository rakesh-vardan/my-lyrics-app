-- Run this once in the Supabase SQL Editor to enable server-side pgroonga search.
-- It creates an RPC function called search_songs that the app calls via /api/search.

-- Drop first because the return type changed (new columns added)
DROP FUNCTION IF EXISTS search_songs(TEXT);

CREATE OR REPLACE FUNCTION search_songs(query_text TEXT)
RETURNS TABLE (
  id UUID,
  title_telugu TEXT,
  title_english TEXT,
  movie_name TEXT,
  genre TEXT,
  year INTEGER,
  singer TEXT,
  lyricist TEXT,
  music_director TEXT,
  media_url TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      s.id,
      s.title_telugu,
      s.title_english,
      s.movie_name,
      s.genre,
      s.year,
      s.singer,
      s.lyricist,
      s.music_director,
      s.media_url,
      s.tags,
      s.created_at
    FROM songs s
    WHERE
      s.title_telugu  &@~ query_text
      OR s.title_english &@~ query_text
      OR s.movie_name    &@~ query_text
      OR s.lyrics        &@~ query_text
    ORDER BY
      -- Prioritise title matches, then movie, then lyrics-only matches
      CASE
        WHEN s.title_telugu &@~ query_text OR s.title_english &@~ query_text THEN 0
        WHEN s.movie_name   &@~ query_text THEN 1
        ELSE 2
      END,
      s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Allow anonymous (public) access to call this function
GRANT EXECUTE ON FUNCTION search_songs(TEXT) TO anon;
