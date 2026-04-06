# 🎵 Telugu Lyrics Vault

A PWA for browsing, searching, and managing Telugu song lyrics — built for singing along, discovering classics, and building your personal lyrics collection.

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5** (strict)
- **Supabase** — PostgreSQL with pgroonga multilingual full-text search
- **Tailwind CSS v4** — dark-first theme with light mode toggle
- **Serwist** — PWA / offline support via service worker
- **Sonner** — toast notifications

## Features

### Core
- **Full-text search** — Telugu and English search powered by pgroonga, with ILIKE fallback
- **Add / Edit songs** — Admin-protected forms with password authentication and rate limiting
- **Duplicate detection** — Warns when adding a song with a title that already exists
- **Favorites** — Heart songs and filter to favorites-only (stored in localStorage)
- **Recently viewed** — Quick-access carousel of the last 10 visited songs
- **Copy & Share** — Copy lyrics to clipboard or share via Web Share API

### Browsing & Discovery
- **Browse by Movie** — Dedicated `/movies` page listing all movies alphabetically with song counts
- **Browse by Genre** — Genre tiles with icons at `/genres`, grouped song listings
- **Telugu Alphabet Index** — Filter songs by first Telugu letter (అ, ఆ, ఇ…)
- **Sort & Filter** — Sort by recent, title, or movie; filter by genre, movie, or tag
- **Infinite scroll** — Paginated song list with IntersectionObserver
- **List / Grid view** — Toggle between list and grid layouts (persisted)

### Lyrics Experience
- **Adjustable font size** — 8 sizes from 14px to 32px (persisted)
- **Auto-scroll** — Karaoke-style scrolling with adjustable speed slider (5–60 px/s)
- **Focus Mode** — Fullscreen distraction-free view hiding navbar and controls
- **Swipe navigation** — Swipe left/right on mobile to navigate between songs in the same movie
- **Previous / Next buttons** — Navigate between songs within a movie

### Media & Metadata
- **YouTube / Spotify embed** — Paste a URL and get an embedded player on the lyrics page
- **Rich song metadata** — Singer, lyricist, music director, year of release, genre, tags
- **Year of release** — Browse and filter songs by era

### PWA
- **Installable** — Add to home screen on mobile
- **Offline support** — Service worker caching via Serwist
- **Dark / Light / System theme** — Three-way toggle with OS preference detection

## Project Structure

```
app/                → Routes, layouts, API handlers
  add/              → Add song form (admin-protected)
  api/auth/         → Admin password verification
  api/search/       → pgroonga full-text search endpoint
  genres/           → Browse by genre page
  movies/           → Browse by movie page
  song/[id]/        → Song detail page
  song/[id]/edit/   → Edit song form (admin-protected)
components/         → Reusable UI components
hooks/              → Custom React hooks
lib/                → Supabase client, types, constants
supabase/           → Database schema and SQL functions
```

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project with the pgroonga extension enabled

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.local.example` to `.env.local` and fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ADMIN_PASSWORD=your_secure_password
```

### 3. Set up the database

Run the SQL files in your Supabase SQL Editor in order:

1. `supabase/schema.sql` — Creates the `songs` table with all columns and RLS policies
2. `supabase/search_function.sql` — Creates the `search_songs` RPC function

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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

## Deployment

Deploy to [Vercel](https://vercel.com), [Netlify](https://netlify.com), or any platform that supports Next.js. Set the environment variables in your hosting provider's dashboard.
