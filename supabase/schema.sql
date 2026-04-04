-- Enable the multilingual search extension
CREATE EXTENSION IF NOT EXISTS pgroonga;

CREATE TABLE songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title_telugu TEXT NOT NULL,
  title_english TEXT,
  movie_name TEXT,
  lyrics TEXT NOT NULL,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a high-performance multilingual index
CREATE INDEX ix_songs_all_content ON songs USING pgroonga(title_telugu, title_english, movie_name, lyrics);
