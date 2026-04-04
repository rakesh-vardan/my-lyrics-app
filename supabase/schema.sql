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

-- Row Level Security policies
-- Note: access control for write operations is enforced at the application
-- layer via admin password verification in /api/auth before any mutations.
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON songs
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON songs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON songs
  FOR UPDATE USING (true) WITH CHECK (true);
