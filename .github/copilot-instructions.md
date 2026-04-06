# Telugu Lyrics Vault — Copilot Instructions

## Project

A PWA for browsing, searching, and managing Telugu song lyrics. Built with Next.js 16 (App Router), React 19, TypeScript 5 (strict), Supabase (PostgreSQL + pgroonga), Tailwind CSS v4, and Serwist for offline support.

## Tech Stack Rules

- **Next.js App Router** — Use `app/` directory routing. No Pages Router patterns.
- **TypeScript strict** — No implicit `any`. Use `type` for type-only imports.
- **Tailwind CSS v4** — Utility classes only. No CSS modules, styled-components, or inline `style` props.
- **Supabase** — Use the shared client from `lib/supabase.ts`. Types `Song` (full) and `SongMeta` (no lyrics) are defined there.
- **Sonner** — Use `toast.success()` / `toast.error()` for user notifications.

## Component Patterns

- Server Components by default. Add `"use client"` only when hooks or browser APIs are needed.
- Functional components with hooks only — no class components.
- Custom hooks in `hooks/` with `use` prefix.
- Reusable UI components in `components/`.

## Naming

- **PascalCase**: components, types (`FavoriteButton`, `SongMeta`)
- **camelCase**: functions, variables, hook names (`useFavorites`, `songId`)
- **CONSTANT_CASE**: config constants (`PAGE_SIZE`, `FONT_SIZES`)

## API Routes

- Use Next.js Route Handlers with named exports (`GET`, `POST`).
- Return `NextResponse.json()` with proper status codes.
- Return `{ error: string }` for errors — never expose internals.
- Use `crypto.timingSafeEqual()` for secret comparisons.
- Validate all inputs from query params and request bodies.

## State Management

- localStorage for persistence (favorites, theme, font size, view mode).
- React hooks (`useState`, `useMemo`, `useCallback`) for component state.
- No Redux, Zustand, or other state libraries.

## Styling

- Dark theme is the default. Light mode via `html.light` class with CSS variable overrides.
- Telugu text uses the font stack: Noto Sans Telugu, Mandali, Vemana2000.
- Theme colors use Tailwind's slate palette with violet accents.
