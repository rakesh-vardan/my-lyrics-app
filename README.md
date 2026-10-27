# 🎵 Telugu Lyrics Vault

A personal, installable web app for storing and reading Telugu song lyrics. Paste lyrics plus
metadata, then browse, search (Telugu or English), favorite, and read with karaoke-style
auto-scroll.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Neon Postgres ·
Serwist PWA.

> Architecture diagrams: [`docs/architecture.html`](docs/architecture.html) (visual) and
> [`docs/architecture.md`](docs/architecture.md) (Mermaid).

---

## How it fits together

```
Browser ──► Next.js route handlers / server components ──► Neon Postgres
  │                     (DATABASE_URL, server-only)          (pg_trgm indexes)
  └── localStorage: favorites · recently viewed · view mode · font size · theme
```

The database connection string never reaches the browser. Reads go through `/api/songs`
and `/api/search`; writes require an admin session cookie issued by `/api/auth`.

| Route | Access | Purpose |
| --- | --- | --- |
| `GET /api/songs` | public | Library metadata (never lyrics) |
| `GET /api/songs/[id]` | public | One full song, for the edit form |
| `POST /api/songs` | admin | Create a song |
| `PATCH /api/songs/[id]` | admin | Update a song |
| `GET /api/search?q=` | public | Trigram search across titles, movie, lyrics |
| `GET/POST/DELETE /api/auth` | public | Session status / unlock / lock |

---

## Setup

### 1. Create the database

Sign up at [neon.com](https://neon.com) (free plan, no card) and create a project. Pick the
region closest to you — the Vercel deploy should use the matching function region (step 4).

The [Neon CLI](https://neon.com/docs/reference/cli) does the rest: it creates or links the
project, writes `.neon` (gitignored), and pulls the connection strings into `.env`.

```bash
npx neon@latest auth                                   # one-time browser sign-in
npx neon@latest link --project-name telugu-lyrics-vault --region-id aws-ap-southeast-1
```

Or link an existing project: `npx neon@latest link --project-id <project-id>`.

Two strings land in `.env`:

| Variable | Used for |
| --- | --- |
| `DATABASE_URL` | Pooled. Every runtime query. |
| `DATABASE_URL_UNPOOLED` | Direct. `npm run db:push` only — PgBouncer can't run all DDL. |

Now add the admin password (the CLI doesn't create it):

```bash
echo "ADMIN_PASSWORD=$(openssl rand -base64 24)" >> .env
```

`ADMIN_PASSWORD` both gates the add/edit forms and signs the session cookie. Changing it
invalidates every existing session, which is the intended way to revoke access.

Prefer clicking? Copy the two strings from *Connect* into `.env` yourself — see
[`.env.example`](.env.example) for the shape.

### 2. Create the tables

```bash
npm run db:push                      # applies db/schema.sql over the direct connection
npm run db:push -- other.sql         # or any other file
```

It prints each statement, then verifies `public.songs` actually exists — no silent no-ops.
Pasting [`db/schema.sql`](db/schema.sql) into the Neon **SQL editor** works too. `psql` is not
required.

Re-running is safe: every statement is `IF NOT EXISTS`.

### 3. Run it

```bash
npm install
npm run dev       # http://localhost:3000
```

If `DATABASE_URL` is missing the app still loads, and the API returns a clear error instead of
crashing.

### 4. Deploy

1. Push to GitHub and import the repo at [vercel.com](https://vercel.com) (Hobby plan is free).
2. Add `DATABASE_URL` and `ADMIN_PASSWORD` as environment variables (Production and Preview).
   Do **not** add `DATABASE_URL_UNPOOLED` — it's only for local migrations.
3. **Set the function region to match the database.** Vercel defaults to `us-east-1`
   (Washington); a Singapore Neon project (`aws-ap-southeast-1`) should use
   *Settings → Functions → Region → Singapore (`sin1`)*. Otherwise every query crosses the
   Pacific twice and page loads feel slow.
4. Deploy. Serverless functions talk to Neon over HTTPS, so there is no connection-pool setup
   and no pool size to tune.

---

## Your data is not precious to anyone but you

Free tiers pause, delete, or shut down. Two commands make that a non-event:

```bash
npm run backup                        # → data/songs.json
npm run import -- data/songs.json     # restore into any empty Neon database
```

Run `npm run backup` after a batch of edits and commit the file. The lyrics live in git, so any
database — Neon, Supabase, local Postgres — is disposable.

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (webpack, because Serwist needs it) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:push` | Apply `db/schema.sql` (or a file you pass) over `DATABASE_URL_UNPOOLED` |
| `npm run backup` | Export every song to `data/songs.json` |
| `npm run import -- <file>` | Upsert songs from JSON |

---

## Search

Search is `ILIKE '%term%'` across `title_telugu`, `title_english`, `movie_name` and `lyrics`,
backed by **pg_trgm** GIN indexes so it stays fast. Results rank title matches above movie
matches above lyrics-only hits. For a personal vault (hundreds to a few thousand songs) this is
instant and needs no extensions.

If you ever want multilingual relevance ranking closer to what Postgres full-text gives English,
options are `pg_trgm`'s `similarity()` ordering or moving search client-side with Fuse.js
(already a dependency).

---

## Features

- Browse with genre / movie / tag filters, four sort modes, list or grid view, infinite scroll
- Debounced server-side search, ranked by where the match occurred
- Favorites and recently viewed (last 10), stored per device
- Reading controls: font size 14–32 px, auto-scroll, copy, share
- Installable PWA with offline reading of previously opened songs
- Dark / light / system theme
- Telugu typography (Noto Sans Telugu → Mandali → Vemana2000)

---

## Notes and known rough edges

- **The rate limiter is in-memory** (5 failures / 15 min / IP). On serverless it is per-instance
  and resets on redeploy — fine for a personal app, insufficient for a public one. Move to
  Upstash Redis if that changes.
- **`components/FavoriteButton.tsx` and `hooks/useFavorites.ts`** both own
  `lyrics-vault-favorites` with separate implementations, so a toggle on the song page does not
  live-update the home list until remount. Consolidating on the hook would fix it.
- **Home fetches the whole metadata index** and filters in the browser. Great up to a few
  thousand songs; beyond that, move filtering and pagination server-side.
- `npm run lint` currently reports 8 pre-existing `react-hooks/set-state-in-effect` errors from
  localStorage hydration in `useFavorites`, `useRecentlyViewed`, `FavoriteButton`,
  `LyricsControls`, `ThemeToggle` and three effects in `app/page.tsx`. They don't block
  `next build`; the proper fix is `useSyncExternalStore`, which would also fix the duplicated
  favorites state above.
- **The `.neon` file** is local link state written by the CLI (project/branch/org). It is
  gitignored; teammates and CI use env vars instead.
