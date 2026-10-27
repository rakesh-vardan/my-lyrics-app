// Apply db/schema.sql to the database over the DIRECT (unpooled) connection,
// which is the right one for migrations — PgBouncer in transaction mode does
// not support everything DDL can need.
//
// Usage: npm run db:push [path/to/file.sql]
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED (or DATABASE_URL) is not set.");
  process.exit(1);
}

const file = process.argv[2] ?? "db/schema.sql";
const source = await readFile(file, "utf8");

// Split on statement boundaries. The schema contains no `$$` bodies or
// semicolons inside string literals, so this is safe here.
const statements = source
  .split(/;\s*(?:\r?\n|$)/)
  .map((chunk) => chunk.trim())
  .filter((chunk) =>
    chunk.split("\n").some((line) => {
      const t = line.trim();
      return t.length > 0 && !t.startsWith("--");
    })
  );

const sql = neon(url);
const usingPooler = url.includes("-pooler");
console.log(
  `Applying ${statements.length} statement(s) from ${file} over the ${usingPooler ? "POOLED" : "DIRECT"} connection.`
);
if (usingPooler) {
  console.warn("Warning: DATABASE_URL_UNPOOLED is missing; DDL over the pooler can fail.");
}

for (const statement of statements) {
  const label =
    statement
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith("--")) ?? "statement";

  try {
    // sql.unsafe() only produces an interpolation token for use inside a tagged
    // template — it does not execute. sql.query() runs a raw string.
    await sql.query(statement);
    console.log(`  ✓ ${label.slice(0, 70)}`);
  } catch (error) {
    console.error(`  ✗ ${label.slice(0, 70)}`);
    console.error(`    ${error.message}`);
    process.exit(1);
  }
}

// Prove the DDL actually landed instead of trusting exit codes.
const [{ songs }] = await sql`
  SELECT to_regclass('public.songs')::text AS songs
`;
if (!songs) {
  console.error("Schema applied but public.songs is still missing — nothing was created.");
  process.exit(1);
}

console.log("Schema applied. public.songs is present.");
