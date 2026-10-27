# 🎵 Telugu Lyrics Vault

A PWA for browsing, searching, and managing Telugu song lyrics — built for singing along, discovering classics, and building your personal lyrics collection.

> Architecture diagrams: [`docs/architecture.html`](docs/architecture.html) (visual) and
> [`docs/architecture.md`](docs/architecture.md) (Mermaid).

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5** (strict)
- **Neon Postgres** — serverless Postgres with `pg_trgm` indexes for substring search
- **Tailwind CSS v4** — dark-first theme with light mode toggle
- **Serwist** — PWA / offline support via service worker
- **Sonner** — toast notifications

## How it fits together

```
Browser ──► Next.js route handlers / server components ──► Neon Postgres
  │                     (DATABASE_URL, server-only)          (pg_trgm indexes)
  └── localStorage: favorites · recently viewed · view mode · font size · theme
```

The database connection string never reaches the browser. Reads go through `/api/*`; writes
require an admin session cookie issued by `/api/auth`.

| Route | Access | Purpose |
| --- | --- | --- |
| `GET /api/songs` | public | One page of library metadata, filtered + sorted (never lyrics) |
| `POST /api/songs` | admin | Create a song |
| `GET /api/songs/[id]` | public | One full song, for the edit form and prev/next |
| `PATCH /api/songs/[id]` | admin | Update a song |
| `GET /api/search?q=` | public | Trigram search across titles, movie, lyrics |
| `GET /api/filters` | public | Movies, tags, genres and total for the filter bar |
| `GET /api/duplicate?title=` | public | "This title already exists" hint |
| `GET /api/random` | public | Surprise Me |
| `GET/POST/DELETE /api/auth` | public | Session status / unlock / lock |
| `POST /api/revalidate` | admin | Clear cached browse pages after a write |

## Features

### Core
- **Full-text search** — Telugu and English search across title, movie and lyrics, ranked by where the match occurred
- **Add / Edit songs** — Admin-protected forms; the session is an HMAC-signed httpOnly cookie
- **Duplicate detection** — Warns when adding a song with a title that already exists
- **Favorites** — Heart songs and filter to favorites-only (stored in localStorage)
- **Recently viewed** — Quick-access carousel of the last 10 visited songs
- **Copy & Share** — Copy lyrics to clipboard or share via Web Share API

### Browsing & Discovery
- **Browse by Movie** — Dedicated `/movies` page listing all movies alphabetically with song counts
- **Browse by Genre** — Genre tiles with icons at `/genres`, grouped song listings
- **Telugu Alphabet Index** — Filter songs by first Telugu letter (అ, ఆ, ఇ…)
- **Sort & Filter** — Sort by recent, title, or movie; filter by genre, movie, or tag — all server-side
- **Infinite scroll** — Paginated song list with IntersectionObserver
- **List / Grid view** — Toggle between list and grid layouts (persisted)
- **Surprise Me** — Opens a random song

### Lyrics Experience
- **Adjustable font size** — 8 sizes from 14px to 32px (persisted)
- **Auto-scroll** — Karaoke-style scrolling with adjustable speed slider (5–60 px/s)
- **Focus Mode** — Fullscreen distraction-free view hiding navbar and controls
- **Swipe navigation** — Swipe left/right on mobile to navigate between songs in the same movie
- **Previous / Next buttons** — Navigate between songs within a movie

### Media & Metadata
- **YouTube / Spotify embed** — Paste a URL and get an embedded player on the lyrics page
- **Rich song metadata** — Singer, lyricist, music director, year of release, genre, tags

### PWA
- **Installable** — Add to home screen on mobile
- **Offline support** — Service worker caching via Serwist (API calls are always network-only)
- **Dark / Light / System theme** — Three-way toggle with OS preference detection

## Project Structure

```
app/                → Routes, layouts, API handlers
  add/              → Add song form (admin-protected)
  api/auth/         → Admin password verification
  api/songs/        → List (paginated) and create
  api/songs/[id]/   → Read one, update
  api/search/       → Trigram search endpoint
  api/filters/      → Filter dropdown options
  genres/           → Browse by genre page
  movies/           → Browse by movie page
  song/[id]/        → Song detail page
  song/[id]/edit/   → Edit song form (admin-protected)
components/         → Reusable UI components
db/schema.sql       → Table, columns and indexes
hooks/              → Custom React hooks
lib/                → Data layer, auth, validation, types
scripts/            → Schema push, backup and restore
```

## Getting Started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.com) account (free plan, no card)

### 1. Create the database

Sign up and create a project, picking the region closest to you — the Vercel deploy should use
the matching function region (see [Deployment](#deployment)).

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

### 2. Install dependencies

```bash
npm install
```

### 3. Create the tables

```bash
npm run db:push                      # applies db/schema.sql over the direct connection
npm run db:push -- other.sql         # or any other file
```

It prints each statement, then verifies `public.songs` actually exists — no silent no-ops.
Pasting [`db/schema.sql`](db/schema.sql) into the Neon **SQL editor** works too, and `psql` is
not required. Re-running is safe: every statement is idempotent, and new columns added since a
previous release are applied with `ALTER TABLE … ADD COLUMN IF NOT EXISTS`.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If `DATABASE_URL` is missing the app still
loads, and the API returns a clear error instead of crashing.

## Build

```bash
npm run build
npm start
```

## Database Schema

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key (auto-generated) |
| `title_telugu` | TEXT | Telugu title (required) |
| `title_english` | TEXT | English transliteration |
| `movie_name` | TEXT | Movie or album name |
| `genre` | TEXT | One of: Devotional, Romantic, Melody, Folk, Classical, Patriotic, Sad, Dance, Other |
| `year` | INTEGER | Year of release |
| `singer` | TEXT | Singer name(s) |
| `lyricist` | TEXT | Lyricist name |
| `music_director` | TEXT | Music director name |
| `media_url` | TEXT | YouTube or Spotify URL for embedded player |
| `lyrics` | TEXT | Full lyrics text (required) |
| `tags` | TEXT[] | Array of tags for filtering |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |

## Search

Search is `ILIKE '%term%'` across `title_telugu`, `title_english`, `movie_name` and `lyrics`,
backed by **pg_trgm** GIN indexes so it stays fast. Results rank title matches above movie
matches above lyrics-only hits. For a personal vault (hundreds to a few thousand songs) this is
instant and needs no extra extensions.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (webpack, because Serwist needs it) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:push` | Apply `db/schema.sql` (or a file you pass) over `DATABASE_URL_UNPOOLED` |
| `npm run backup` | Export every song to `data/songs.json` |
| `npm run import -- <file>` | Upsert songs from JSON |

## Your data is not precious to anyone but you

Free tiers pause, delete, or shut down. Two commands make that a non-event:

```bash
npm run backup                        # → data/songs.json
npm run import -- data/songs.json     # restore into any empty Postgres
```

Run `npm run backup` after a batch of edits and commit the file. The lyrics live in git, so any
database — Neon, Supabase, local Postgres — is disposable.

## Deployment

Deploy to [Vercel](https://vercel.com) (Hobby plan is free):

1. Push to GitHub and import the repo.
2. Add `DATABASE_URL` and `ADMIN_PASSWORD` as environment variables (Production and Preview).
   Do **not** add `DATABASE_URL_UNPOOLED` — it is only for local migrations.
3. **Set the function region to match the database.** Vercel defaults to `us-east-1`; a
   Singapore Neon project (`aws-ap-southeast-1`) should use *Settings → Functions → Region →
   Singapore (`sin1`)*. Otherwise every query crosses the Pacific twice.
4. Deploy. Functions talk to Neon over HTTPS, so there is no connection-pool setup and no pool
   size to tune.

## Notes and known rough edges

- **The rate limiter is in-memory** (5 failures / 15 min / IP). On serverless it is per-instance
  and resets on redeploy — fine for a personal app, insufficient for a public one. Move to
  Upstash Redis if that changes.
- **`components/FavoriteButton.tsx` and `hooks/useFavorites.ts`** both own
  `lyrics-vault-favorites` with separate implementations, so a toggle on the song page does not
  live-update the home list until remount. Consolidating on the hook would fix it.
- `npm run lint` reports pre-existing `react-hooks/set-state-in-effect` errors from localStorage
  hydration. They don't block `next build`; the proper fix is `useSyncExternalStore`, which would
  also fix the duplicated favorites state above.
- **The `.neon` file** is local link state written by the CLI (project/branch/org). It is
  gitignored; teammates and CI use env vars instead.
