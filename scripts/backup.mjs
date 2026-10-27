// Dump every song to data/songs.json so the library can be rebuilt anywhere.
// Usage: npm run backup
import { neon } from "@neondatabase/serverless";
import { mkdir, writeFile } from "node:fs/promises";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env (or the environment).");
  process.exit(1);
}

const sql = neon(url);
const rows = await sql`
  SELECT id, title_telugu, title_english, movie_name, genre, year, singer,
         lyricist, music_director, media_url, lyrics, to_jsonb(tags) AS tags,
         created_at
  FROM songs
  ORDER BY created_at
`;

await mkdir("data", { recursive: true });
await writeFile("data/songs.json", JSON.stringify(rows, null, 2) + "\n", "utf8");

console.log(`Backed up ${rows.length} song${rows.length === 1 ? "" : "s"} to data/songs.json`);
console.log("Commit it: git add data/songs.json && git commit -m 'chore: back up lyrics'");
