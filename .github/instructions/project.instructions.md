---
description: "Use when working on any file in the Telugu Lyrics Vault project. Covers project overview, coding conventions, component patterns, and API route standards."
applyTo: "**/*.{ts,tsx}"
---

# Telugu Lyrics Vault — Project Instructions

## Project Overview

A Next.js 16 PWA for browsing, searching, and managing Telugu song lyrics. Tech stack:

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5** (strict mode)
- **Supabase** for database (PostgreSQL with pgroonga multilingual search)
- **Tailwind CSS v4** for styling (dark-first theme with light mode toggle)
- **Serwist** for PWA/service worker support
- **Sonner** for toast notifications

## Coding Conventions

### TypeScript

- Strict mode is enabled — no implicit `any`, always type function parameters and returns
- Use `type` keyword for type-only imports: `import type { Song } from '@/lib/supabase'`
- Two main data types: `Song` (full, with lyrics) and `SongMeta` (list views, no lyrics)

### Components

- Use functional components with hooks exclusively
- Server Components by default; add `"use client"` only when interactivity is needed
- PascalCase filenames for components: `FavoriteButton.tsx`
- Custom hooks go in `/hooks/` with `use` prefix: `useFavorites.ts`

### Naming

- PascalCase: components and types (`FavoriteButton`, `SongMeta`)
- camelCase: functions, variables, hooks (`useFavorites`, `trackRecentlyViewed`)
- CONSTANT_CASE: configuration constants (`GENRES`, `PAGE_SIZE`, `FONT_SIZES`)

### File Organization

```
app/          → Routes, layouts, API handlers
components/   → Reusable UI components
hooks/        → Custom React hooks
lib/          → Utilities, Supabase client, shared config
supabase/     → Database schema and SQL functions
```

## API Route Conventions

### Structure

- API routes live under `app/api/` using Next.js Route Handlers
- Export named HTTP method functions: `GET`, `POST` (not default exports)
- Return `NextResponse.json()` with appropriate status codes

### Error Handling

- Return structured error objects: `{ error: string }`
- Use correct HTTP status codes: 400 (bad input), 429 (rate limited), 500 (server error)
- Never expose internal error details to the client

### Security

- Use `crypto.timingSafeEqual()` for password/secret comparisons
- Implement rate limiting for sensitive endpoints (auth, mutations)
- Validate and sanitize all user input from query params and request bodies
