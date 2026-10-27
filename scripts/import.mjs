// Restore songs into the database from a JSON export.
// Usage: npm run import -- data/songs.json
// Accepts an array of rows (this app's backup format, or a Supabase table
// export) and upserts by id, preserving ids and created_at.
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env (or the environment).");
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run import -- path/to/songs.json");
  process.exit(1);
}

function toPgArray(values) {
  if (!values || values.length === 0) return null;
  const quoted = values.map((v) => `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  return `{${quoted.join(",")}}`;
}

const parsed = JSON.parse(await readFile(file, "utf8"));
const rows = Array.isArray(parsed) ? parsed : parsed.songs;
if (!Array.isArray(rows)) {
  console.error("Expected a JSON array of songs, or an object with a `songs` array.");
  process.exit(1);
}

const sql = neon(url);
let imported = 0;

for (const row of rows) {
  if (!row?.title_telugu || !row?.lyrics) {
    console.warn(`Skipping row without title_telugu/lyrics: ${row?.id ?? "(no id)"}`);
    continue;
  }
  await sql`
    INSERT INTO songs (id, title_telugu, title_english, movie_name, genre, lyrics, tags, created_at)
    VALUES (
      COALESCE(${row.id ?? null}::uuid, gen_random_uuid()),
      ${row.title_telugu},
      ${row.title_english ?? null},
      ${row.movie_name ?? null},
      ${row.genre ?? null},
      ${row.lyrics},
      ${toPgArray(row.tags)}::text[],
      COALESCE(${row.created_at ?? null}::timestamptz, NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
      title_telugu  = EXCLUDED.title_telugu,
      title_english = EXCLUDED.title_english,
      movie_name    = EXCLUDED.movie_name,
      genre         = EXCLUDED.genre,
      lyrics        = EXCLUDED.lyrics,
      tags          = EXCLUDED.tags
  `;
  imported += 1;
}

console.log(`Imported ${imported} song${imported === 1 ? "" : "s"} from ${file}`);
