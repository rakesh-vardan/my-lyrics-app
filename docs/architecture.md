# Telugu Lyrics Vault — Architecture

> Rendered, styled version: open [`architecture.html`](./architecture.html) in a browser.

## System overview

```mermaid
flowchart TB
  subgraph B["Browser"]
    direction TB
    H["Home `/`<br/><i>client</i><br/>metadata only · filter · sort · infinite scroll"]
    S["Song `/song/[id]`<br/><i>server component</i> + client islands"]
    F["Add / Edit<br/><i>client</i> · admin-gated forms"]
    LS[("localStorage<br/>favorites · recent · view mode · font size · theme")]
    CK["Admin session cookie<br/><i>httpOnly · HMAC-signed · 7 days</i>"]
    SW["Service worker<br/><i>Serwist PWA</i>"]
  end

  subgraph N["Next.js server"]
    direction TB
    R0["GET /api/songs<br/>POST /api/songs"]
    R1["GET /api/songs/[id]<br/>PATCH /api/songs/[id]"]
    R2["GET /api/search<br/>pg_trgm ILIKE"]
    R3["GET · POST · DELETE /api/auth<br/>sha256 + timingSafeEqual<br/>5 fails / 15 min / IP"]
    R4["RSC render `/song/[id]`<br/>force-dynamic"]
  end

  subgraph DB["Neon Postgres"]
    direction TB
    T[("songs<br/>titles · movie · genre · tags[] · lyrics")]
    IX["pg_trgm GIN indexes<br/>4 text columns"]
  end

  H -->|GET metadata| R0
  H -->|debounced query| R2
  S --> R4
  R4 -->|select by id| T
  R0 -->|select / insert| T
  R1 -->|select / update| T
  R2 --> T
  T --- IX
  F -->|password| R3
  R3 -->|sets| CK
  F -->|reads status| R3
  F -->|POST/PATCH + cookie| R0
  F -->|POST/PATCH + cookie| R1
  H --> LS
  S --> LS
```

## Flows

### 1. Browse

```mermaid
sequenceDiagram
  autonumber
  actor U as Reader
  participant C as Home (client)
  participant A as GET /api/songs
  participant DB as Neon

  U->>C: open /
  C->>A: fetch library
  A->>DB: select metadata (no lyrics) order by created_at
  DB-->>A: rows
  A-->>C: SongMeta[]
  C->>C: filter (favorites/genre/movie/tag) + sort in memory
  C-->>U: first 20 results
  U->>C: scroll to sentinel
  C-->>U: next 20 (IntersectionObserver)
```

### 2. Search

```mermaid
sequenceDiagram
  autonumber
  actor U as Reader
  participant C as Home (client)
  participant A as GET /api/search
  participant DB as Neon

  U->>C: types a query
  Note over C: 300 ms debounce
  C->>A: ?q=…
  A->>DB: ILIKE across 4 columns<br/>(pg_trgm GIN indexes)
  DB-->>A: rows ranked title → movie → lyrics
  A-->>C: SongMeta[] (max 50)
  Note over C: relevance order kept, manual sort skipped
  C-->>U: results merged with active filters
```

### 3. Read a song

```mermaid
sequenceDiagram
  autonumber
  actor U as Reader
  participant P as /song/[id] (RSC)
  participant I as Client islands
  participant DB as Neon

  U->>P: open song
  P->>DB: select * where id = …
  DB-->>P: full row (with lyrics)
  P-->>U: HTML + page metadata
  P->>I: hydrate
  I->>I: track recently viewed (max 10)
  I-->>U: font size · auto-scroll · copy · favorite · share
```

### 4. Add / edit

```mermaid
sequenceDiagram
  autonumber
  actor U as Curator
  participant F as Add/Edit form
  participant A as /api/auth
  participant S as /api/songs
  participant DB as Neon

  U->>F: submit password
  F->>A: POST password
  A->>A: sha256 + timingSafeEqual, rate limit
  A-->>F: 200 + httpOnly signed cookie
  F->>F: reload → GET /api/auth → authenticated
  U->>F: fill in the song
  F->>S: POST /api/songs (+ cookie)
  S->>S: verify cookie signature
  S->>S: validate input
  S->>DB: insert
  DB-->>S: row
  S-->>F: 201
  F-->>U: toast + redirect
```

## Data model

```mermaid
erDiagram
  SONGS {
    uuid id PK
    text title_telugu "NOT NULL"
    text title_english
    text movie_name
    text genre "1 of 9 values"
    text lyrics "NOT NULL"
    text_array tags
    timestamptz created_at
  }
```

Browser-side state, keyed by song `id` — never stored in Postgres:

| Storage | Key | Value |
| --- | --- | --- |
| localStorage | `lyrics-vault-favorites` | array of song IDs |
| localStorage | `lyrics-vault-recent` | last 10 song IDs |
| localStorage | `lyrics-view-mode` | `list` \| `grid` |
| localStorage | `lyrics-font-size-index` | index into 14–32 px |
| localStorage | `theme` | `dark` \| `light` \| `system` |
| cookie (httpOnly) | `lyrics_admin` | HMAC-signed session, 7 days |

## Notes

- **All data access is server-side.** `DATABASE_URL` is never shipped to the client, so there is
  no anon key and no RLS to misconfigure.
- **Search uses `pg_trgm`**, not pgroonga: `ILIKE '%term%'` over four columns with GIN indexes.
  Good to a few thousand songs; ranking is match-location based.
- **Auth is stateless:** the cookie payload is `v1.<expiry>.<hmac>`, verified on every write.
  Rotating `ADMIN_PASSWORD` invalidates all sessions, which is the intended escape hatch.
- **Theme is CSS-variable inversion**, applied before paint by an inline script to avoid a flash.
- **The database is disposable:** `npm run backup` exports everything to `data/songs.json` and
  `npm run import` restores it.
