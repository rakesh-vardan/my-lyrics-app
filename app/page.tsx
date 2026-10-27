"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GENRES } from "@/lib/types";
import type { SongMeta } from "@/lib/types";
import { useFavorites } from "@/hooks/useFavorites";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import AlphabetIndex from "@/components/AlphabetIndex";

type SortOption = "recent" | "title_telugu" | "title_english" | "movie_name";

const SORT_LABELS: Record<SortOption, string> = {
  recent: "Recently Added",
  title_telugu: "Telugu Title (A–Z)",
  title_english: "English Title (A–Z)",
  movie_name: "Movie Name (A–Z)",
};

const PAGE_SIZE = 20;

interface ListParams {
  ids?: string[];
  genre?: string;
  movie?: string;
  tag?: string;
  letter?: string;
  sort?: SortOption;
  limit?: number;
  offset?: number;
}

/** Builds the /api/songs URL for a filter/sort/page combination. */
function listUrl(p: ListParams): string {
  const qs = new URLSearchParams();
  if (p.ids && p.ids.length > 0) qs.set("ids", p.ids.join(","));
  if (p.genre) qs.set("genre", p.genre);
  if (p.movie) qs.set("movie", p.movie);
  if (p.tag) qs.set("tag", p.tag);
  if (p.letter) qs.set("letter", p.letter);
  if (p.sort) qs.set("sort", p.sort);
  if (p.limit !== undefined) qs.set("limit", String(p.limit));
  if (p.offset !== undefined) qs.set("offset", String(p.offset));
  const query = qs.toString();
  return query ? `/api/songs?${query}` : "/api/songs";
}

export default function HomePage() {
  const router = useRouter();

  // Server-paginated song list
  const [songs, setSongs] = useState<SongMeta[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [globalCount, setGlobalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SongMeta[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Filters
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedMovie, setSelectedMovie] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedLetter, setSelectedLetter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  // Filter dropdown options (loaded once, lightweight)
  const [availableMovies, setAvailableMovies] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);

  // Recently viewed songs (fetched by ID)
  const [recentSongs, setRecentSongs] = useState<SongMeta[]>([]);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // View mode: list or grid
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { recentIds } = useRecentlyViewed();

  // Persist view mode
  useEffect(() => {
    const stored = localStorage.getItem("lyrics-view-mode");
    if (stored === "grid" || stored === "list") setViewMode(stored);
  }, []);

  const setView = (v: "list" | "grid") => {
    setViewMode(v);
    localStorage.setItem("lyrics-view-mode", v);
  };

  // --- Load filter options once (with sessionStorage cache) ---
  useEffect(() => {
    const FILTER_CACHE_KEY = "lyrics-filter-options";
    const FILTER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    // Try sessionStorage first
    try {
      const cached = sessionStorage.getItem(FILTER_CACHE_KEY);
      if (cached) {
        const { movies, tags, genres, count, ts } = JSON.parse(cached);
        if (Date.now() - ts < FILTER_CACHE_TTL) {
          setAvailableMovies(movies);
          setAvailableTags(tags);
          setAvailableGenres(genres);
          setGlobalCount(count);
          return; // Cache hit — skip DB queries
        }
      }
    } catch { /* ignore parse errors */ }

    async function loadFilterOptions() {
      try {
        const res = await fetch("/api/filters");
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
        const data = await res.json();

        const movies: string[] = data.movies ?? [];
        const tags: string[] = data.tags ?? [];
        const present: string[] = data.genres ?? [];
        const genres = GENRES.filter((g) => present.includes(g));
        const count: number = data.total ?? 0;

        setAvailableMovies(movies);
        setAvailableTags(tags);
        setAvailableGenres(genres);
        setGlobalCount(count);

        // Persist to sessionStorage
        try {
          sessionStorage.setItem(FILTER_CACHE_KEY, JSON.stringify({ movies, tags, genres, count, ts: Date.now() }));
        } catch { /* quota exceeded — ignore */ }
      } catch (err) {
        console.error("Failed to load filter options:", err);
      }
    }
    loadFilterOptions();
  }, []);

  // --- Load recently viewed songs by ID ---
  useEffect(() => {
    if (recentIds.length === 0) { setRecentSongs([]); return; }
    let cancelled = false;
    async function loadRecent() {
      try {
        const res = await fetch(listUrl({ ids: recentIds, limit: recentIds.length }));
        if (!res.ok) return;
        const { songs: data } = await res.json();
        if (cancelled) return;
        const map = new Map((data as SongMeta[]).map(s => [s.id, s]));
        setRecentSongs(recentIds.map(id => map.get(id)).filter(Boolean) as SongMeta[]);
      } catch {
        // The carousel is a convenience; ignore failures.
      }
    }
    loadRecent();
    return () => { cancelled = true; };
  }, [recentIds]);

  // --- Stable favorites key to avoid unnecessary re-fetches ---
  const favoritesKey = showFavoritesOnly ? [...favorites].sort((a, b) => a.localeCompare(b)).join(",") : "";

  // --- Refs for loadMore to avoid stale closures ---
  const filtersRef = useRef({ showFavoritesOnly, favorites, selectedGenre, selectedMovie, selectedTag, selectedLetter, sortBy });
  useEffect(() => {
    filtersRef.current = { showFavoritesOnly, favorites, selectedGenre, selectedMovie, selectedTag, selectedLetter, sortBy };
  });
  const songsLengthRef = useRef(0);
  useEffect(() => { songsLengthRef.current = songs.length; }, [songs.length]);
  const loadingMoreRef = useRef(false);

  // --- Server-side paginated fetch (resets on filter/sort change) ---
  useEffect(() => {
    // When search is active, data comes from the search API instead
    if (debouncedQuery.trim()) return;

    let cancelled = false;

    async function fetchFirstPage() {
      setLoading(true);
      setError(null);

      // Empty favorites → show nothing immediately
      if (showFavoritesOnly && favorites.size === 0) {
        setSongs([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(listUrl({
          ids: showFavoritesOnly && favorites.size > 0 ? [...favorites] : undefined,
          genre: selectedGenre || undefined,
          movie: selectedMovie || undefined,
          tag: selectedTag || undefined,
          letter: selectedLetter || undefined,
          sort: sortBy,
          limit: PAGE_SIZE,
          offset: 0,
        }));
        if (cancelled) return;
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);

        const { songs: data, total } = await res.json();
        if (cancelled) return;

        setSongs((data as SongMeta[]) ?? []);
        if (typeof total === "number") setTotalCount(total);
      } catch (err) {
        if (cancelled) return;
        setError("Failed to load songs. Please try again in a moment.");
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchFirstPage();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoritesKey, selectedGenre, selectedMovie, selectedTag, selectedLetter, sortBy, debouncedQuery]);

  // --- Debounce search query ---
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  // --- Server-side pgroonga search ---
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults(null);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) {
          setSearchError("Search failed: " + data.error);
          setSearchResults([]);
        } else {
          setSearchResults(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        setSearchError("Search request failed.");
        setSearchResults([]);
      })
      .finally(() => setSearchLoading(false));
  }, [debouncedQuery]);

  // --- Client-side filtering for search results (search already returns ≤50 rows) ---
  const filteredSearchResults = useMemo(() => {
    if (!searchResults) return null;
    let base = searchResults;
    if (showFavoritesOnly) base = base.filter(s => favorites.has(s.id));
    if (selectedGenre) base = base.filter(s => s.genre === selectedGenre);
    if (selectedMovie) base = base.filter(s => s.movie_name === selectedMovie);
    if (selectedTag) base = base.filter(s => s.tags?.includes(selectedTag));
    if (selectedLetter) base = base.filter(s => s.title_telugu.startsWith(selectedLetter));
    return base;
  }, [searchResults, showFavoritesOnly, favorites, selectedGenre, selectedMovie, selectedTag, selectedLetter]);

  // --- What to display ---
  const isSearchActive = !!debouncedQuery.trim();
  const displaySongs = isSearchActive ? (filteredSearchResults ?? []) : songs;
  const displayTotal = isSearchActive ? (filteredSearchResults?.length ?? 0) : totalCount;
  const hasMore = !isSearchActive && songs.length < totalCount;

  // --- Load more (infinite scroll — fetches next page from server) ---
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const f = filtersRef.current;
      const from = songsLengthRef.current;

      const res = await fetch(listUrl({
        ids: f.showFavoritesOnly && f.favorites.size > 0 ? [...f.favorites] : undefined,
        genre: f.selectedGenre || undefined,
        movie: f.selectedMovie || undefined,
        tag: f.selectedTag || undefined,
        letter: f.selectedLetter || undefined,
        sort: f.sortBy,
        limit: PAGE_SIZE,
        offset: from,
      }));
      if (!res.ok) throw new Error(`Request failed with ${res.status}`);

      const { songs: data } = await res.json();
      setSongs(prev => [...prev, ...((data as SongMeta[]) ?? [])]);
    } catch (err) {
      console.error("Failed to load more songs:", err);
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Infinite scroll sentinel ---
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  // --- Random song (server-side pick) ---
  const handleSurprise = async () => {
    if (globalCount === 0) return;
    try {
      const res = await fetch("/api/random");
      if (!res.ok) return;
      const { id } = await res.json();
      if (id) router.push(`/song/${id}`);
    } catch {
      // Ignore — the button just does nothing.
    }
  };

  // --- Active filter state ---
  const activeFilters = [
    showFavoritesOnly && "Favorites",
    selectedGenre && `Genre: ${selectedGenre}`,
    selectedMovie && `Movie: ${selectedMovie}`,
    selectedTag && `Tag: ${selectedTag}`,
    selectedLetter && `Letter: ${selectedLetter}`,
  ].filter(Boolean) as string[];
  const hasActiveFilters = activeFilters.length > 0;

  const clearAllFilters = () => {
    setShowFavoritesOnly(false);
    setSelectedGenre("");
    setSelectedMovie("");
    setSelectedTag("");
    setSelectedLetter("");
  };

  // Show recently viewed only when completely unfiltered / not searching
  const showRecentSection =
    !query && !hasActiveFilters && recentSongs.length > 0 && !loading;

  // --- Chip style helpers ---
  const chipBase = "px-3 py-1 rounded-full text-xs font-medium transition-colors border";
  const chipActive = "bg-sky-600 border-sky-500 text-white";
  const chipInactive = "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600";

  return (
    <div className="overflow-x-hidden">
      {/* ── Recently Viewed ─────────────────────────────── */}
      {showRecentSection && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Recently Viewed
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentSongs.map((song) => (
              <Link
                key={song.id}
                href={`/song/${song.id}`}
                className="shrink-0 w-40 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-sky-500 rounded-xl p-3 transition-all"
              >
                <p className="text-sm font-semibold text-slate-100 telugu-text line-clamp-2 leading-snug">
                  {song.title_telugu}
                </p>
                {song.movie_name && (
                  <p className="text-xs text-sky-400 mt-1 truncate">▸ {song.movie_name}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Search bar ──────────────────────────────────── */}
      <div className="relative mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, lyrics, movies in Telugu or English..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-10 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-base"
        />
        {searchLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin text-sm">⟳</div>
        )}
      </div>

      {searchError && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-3 text-amber-300 text-sm mb-4">
          ⚠️ {searchError}
        </div>
      )}

      {/* ── Filter & Sort bar ───────────────────────────── */}
      <div className="flex flex-col gap-3 mb-6">

        {/* Row 1: Favorites · Surprise Me · Sort */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              showFavoritesOnly
                ? "bg-pink-600/20 border-pink-500 text-pink-300"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
            }`}
          >
            {showFavoritesOnly ? <><span className="text-red-400">♥</span> Favorites</> : <><span className="text-slate-400">♡</span> Favorites</>}
          </button>

          <button
            onClick={handleSurprise}
            disabled={globalCount === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Open a random song"
          >
            ⚄ Surprise Me
          </button>

          <div className="ml-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {Object.entries(SORT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Genre chips */}
        {availableGenres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedGenre("")}
              className={`${chipBase} ${!selectedGenre ? chipActive : chipInactive}`}
            >
              All Genres
            </button>
            {availableGenres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(selectedGenre === genre ? "" : genre)}
                className={`${chipBase} ${selectedGenre === genre ? chipActive : chipInactive}`}
              >
                {genre}
              </button>
            ))}
          </div>
        )}

        {/* Row 3: Movie + Tag dropdowns */}
        {(availableMovies.length > 0 || availableTags.length > 0) && (
          <div className="flex gap-2 flex-wrap">
            {availableMovies.length > 0 && (
              <select
                value={selectedMovie}
                onChange={(e) => setSelectedMovie(e.target.value)}
                className={`bg-slate-800 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  selectedMovie ? "border-sky-500 text-sky-300" : "border-slate-700 text-slate-400"
                }`}
              >
                <option value="">▸ All Movies</option>
                {availableMovies.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
            {availableTags.length > 0 && (
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className={`bg-slate-800 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  selectedTag ? "border-sky-500 text-sky-300" : "border-slate-700 text-slate-400"
                }`}
              >
                <option value="">🏷️ All Tags</option>
                {availableTags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Row 4: Telugu alphabet index */}
        <AlphabetIndex activeLetter={selectedLetter} onSelect={setSelectedLetter} />

        {/* Row 5: Active filter pills + Clear all */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((label) => (
              <span
                key={label}
                className="text-xs bg-sky-600/20 border border-sky-500/40 text-sky-300 px-2.5 py-1 rounded-full"
              >
                {label}
              </span>
            ))}
            <button
              onClick={clearAllFilters}
              className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── States ──────────────────────────────────────── */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-700 rounded w-1/2" />
                  <div className="h-3 bg-slate-700 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && displaySongs.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-3">🔍</div>
          <p>
            {query
              ? "No songs found matching your search."
              : showFavoritesOnly
              ? "No favorite songs yet. Tap the heart on songs you love!"
              : selectedGenre
              ? `No songs in "${selectedGenre}" genre.`
              : selectedMovie
              ? `No songs from "${selectedMovie}".`
              : selectedTag
              ? `No songs tagged "${selectedTag}".`
              : "No songs yet. Add your first song!"}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="mt-4 text-sky-400 hover:text-sky-300 text-sm underline"
            >
              Clear filters
            </button>
          )}
          {!query && !hasActiveFilters && (
            <Link
              href="/add"
              className="mt-4 inline-block bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + Add Song
            </Link>
          )}
        </div>
      )}

      {/* ── Count + View toggle ─────────────────────────── */}
      {!loading && !error && (globalCount > 0 || displaySongs.length > 0) && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-500">
            {hasActiveFilters || debouncedQuery
              ? `${displayTotal} of ${globalCount} songs`
              : `${globalCount} song${globalCount !== 1 ? "s" : ""} in vault`}
          </span>
          <div className="flex items-center gap-0.5 bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button
              onClick={() => setView("list")}
              className={`px-2 py-1 rounded text-sm transition-colors ${
                viewMode === "list" ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"
              }`}
              title="List view"
              aria-label="List view"
            >
              ☰
            </button>
            <button
              onClick={() => setView("grid")}
              className={`px-2 py-1 rounded text-sm transition-colors ${
                viewMode === "grid" ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Grid view"
              aria-label="Grid view"
            >
              ⊞
            </button>
          </div>
        </div>
      )}

      {/* ── Song list / grid ────────────────────────────── */}
      {viewMode === "list" ? (
      <div className="space-y-3">
        {displaySongs.map((song) => (
          <div
            key={song.id}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-sky-500 rounded-xl transition-all"
          >
            <button
              onClick={() => toggleFavorite(song.id)}
              className="pl-4 py-4 text-lg shrink-0 hover:scale-110 transition-transform"
              title={isFavorite(song.id) ? "Remove from favorites" : "Add to favorites"}
            >
              {isFavorite(song.id) ? <span className="text-red-400">♥</span> : <span className="text-slate-500">♡</span>}
            </button>

            <Link href={`/song/${song.id}`} className="flex-1 min-w-0 p-4 pl-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-slate-100 telugu-text truncate">
                    {song.title_telugu}
                  </h2>
                  {song.title_english && (
                    <p className="text-sm text-slate-400 truncate">{song.title_english}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {song.movie_name && (
                      <p className="text-xs text-sky-400">▸ {song.movie_name}</p>
                    )}
                    {song.genre && (
                      <span className="text-xs bg-sky-600/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/20">
                        {song.genre}
                      </span>
                    )}
                  </div>
                  {song.tags && song.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {song.tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedTag(selectedTag === tag ? "" : tag);
                          }}
                          className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                            selectedTag === tag
                              ? "bg-sky-600 text-white"
                              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-slate-500 text-xl">›</span>
              </div>
            </Link>
          </div>
        ))}
      </div>

      ) : (
        /* ── Grid view ─────────────────────────────────── */
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {displaySongs.map((song) => (
            <div
              key={song.id}
              className="relative bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-sky-500 rounded-xl p-3 transition-all"
            >
              <button
                onClick={() => toggleFavorite(song.id)}
                className="absolute top-2 right-2 text-sm hover:scale-110 transition-transform"
                title={isFavorite(song.id) ? "Remove from favorites" : "Add to favorites"}
              >
                {isFavorite(song.id) ? <span className="text-red-400">♥</span> : <span className="text-slate-500">♡</span>}
              </button>
              <Link href={`/song/${song.id}`} className="block pr-6">
                <p className="text-sm font-semibold text-slate-100 telugu-text line-clamp-2 leading-snug">
                  {song.title_telugu}
                </p>
                {song.title_english && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">{song.title_english}</p>
                )}
                {song.movie_name && (
                  <p className="text-xs text-sky-400 mt-1.5 truncate">▸ {song.movie_name}</p>
                )}
                {song.genre && (
                  <span className="inline-block mt-1.5 text-xs bg-sky-600/20 text-sky-300 px-1.5 py-0.5 rounded-full border border-sky-500/20">
                    {song.genre}
                  </span>
                )}
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={sentinelRef} className="h-10" />}
      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && !error && displaySongs.length > 0 && (
        <p className="text-center text-slate-500 text-sm mt-6">
          Showing {displaySongs.length} of {displayTotal}{query ? " matched" : ""}{hasActiveFilters ? " (filtered)" : ""}
        </p>
      )}
    </div>
  );
}
