-- Telugu Lyrics Vault — Neon Postgres schema
-- Apply with `npm run db:push`, or paste into the Neon SQL editor.
--
-- Access model: the database is only reachable with DATABASE_URL, which lives
-- on the server. There are no RLS policies and no anon key, so every read and
-- write goes through the app's API routes / server components.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS songs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_telugu  TEXT NOT NULL,
  title_english TEXT,
  movie_name    TEXT,
  genre         TEXT,
  lyrics        TEXT NOT NULL,
  tags          TEXT[],
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Library listing is always newest-first.
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON songs (created_at DESC);

-- Trigram indexes keep `ILIKE '%term%'` fast for search across all four text
-- columns. Without them Postgres falls back to a sequential scan, which is
-- fine for a few hundred songs but not for thousands.
CREATE INDEX IF NOT EXISTS ix_songs_title_telugu_trgm  ON songs USING GIN (title_telugu  gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_songs_title_english_trgm ON songs USING GIN (title_english gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_songs_movie_trgm         ON songs USING GIN (movie_name    gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_songs_lyrics_trgm        ON songs USING GIN (lyrics        gin_trgm_ops);

-- Optional: speeds up the tag filter if you ever move filtering server-side.
CREATE INDEX IF NOT EXISTS ix_songs_tags ON songs USING GIN (tags);
