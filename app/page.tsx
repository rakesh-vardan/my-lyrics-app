"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, GENRES } from "@/lib/supabase";
import type { SongMeta } from "@/lib/supabase";
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
const SELECT_COLS = "id, title_telugu, title_english, movie_name, genre, year, singer, lyricist, music_director, media_url, tags, created_at";

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
      const [moviesRes, tagsRes, genresRes, countRes] = await Promise.all([
        supabase.from("songs").select("movie_name").not("movie_name", "is", null),
        supabase.from("songs").select("tags").not("tags", "is", null),
        supabase.from("songs").select("genre").not("genre", "is", null),
        supabase.from("songs").select("id", { count: "exact", head: true }),
      ]);
      const movies = moviesRes.data
        ? [...new Set(moviesRes.data.map((r: { movie_name: string }) => r.movie_name))].sort((a, b) => a.localeCompare(b))
        : [];
      const tags = tagsRes.data
        ? [...new Set(tagsRes.data.flatMap((r: { tags: string[] }) => r.tags ?? []))].sort((a, b) => a.localeCompare(b))
        : [];
      const genres = genresRes.data
        ? GENRES.filter(g => new Set(genresRes.data.map((r: { genre: string }) => r.genre)).has(g))
        : [];
      const count = countRes.count ?? 0;

      setAvailableMovies(movies);
      setAvailableTags(tags);
      setAvailableGenres(genres);
      setGlobalCount(count);

      // Persist to sessionStorage
      try {
        sessionStorage.setItem(FILTER_CACHE_KEY, JSON.stringify({ movies, tags, genres, count, ts: Date.now() }));
      } catch { /* quota exceeded — ignore */ }
    }
    loadFilterOptions();
  }, []);

  // --- Load recently viewed songs by ID ---
  useEffect(() => {
    if (recentIds.length === 0) { setRecentSongs([]); return; }
    async function loadRecent() {
      const { data } = await supabase
        .from("songs")
        .select(SELECT_COLS)
        .in("id", recentIds);
      if (data) {
        const map = new Map((data as SongMeta[]).map(s => [s.id, s]));
        setRecentSongs(recentIds.map(id => map.get(id)).filter(Boolean) as SongMeta[]);
      }
    }
    loadRecent();
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
        let q = supabase
          .from("songs")
          .select(SELECT_COLS, { count: "exact" });

        if (showFavoritesOnly && favorites.size > 0) q = q.in("id", [...favorites]);
        if (selectedGenre) q = q.eq("genre", selectedGenre);
        if (selectedMovie) q = q.eq("movie_name", selectedMovie);
        if (selectedTag) q = q.contains("tags", [selectedTag]);
        if (selectedLetter) q = q.like("title_telugu", `${selectedLetter}%`);

        switch (sortBy) {
          case "recent": q = q.order("created_at", { ascending: false }); break;
          case "title_telugu": q = q.order("title_telugu", { ascending: true }); break;
          case "title_english": q = q.order("title_english", { ascending: true, nullsFirst: false }); break;
          case "movie_name": q = q.order("movie_name", { ascending: true, nullsFirst: false }); break;
        }

        const { data, error: fetchError, count } = await q.range(0, PAGE_SIZE - 1);
        if (cancelled) return;
        if (fetchError) throw fetchError;

        setSongs((data as SongMeta[]) ?? []);
        if (count !== null) setTotalCount(count);
      } catch (err) {
        if (cancelled) return;
        setError("Failed to load songs. Please check your Supabase configuration.");
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

      let q = supabase.from("songs").select(SELECT_COLS);

      if (f.showFavoritesOnly && f.favorites.size > 0) q = q.in("id", [...f.favorites]);
      if (f.selectedGenre) q = q.eq("genre", f.selectedGenre);
      if (f.selectedMovie) q = q.eq("movie_name", f.selectedMovie);
      if (f.selectedTag) q = q.contains("tags", [f.selectedTag]);
      if (f.selectedLetter) q = q.like("title_telugu", `${f.selectedLetter}%`);

      switch (f.sortBy) {
        case "recent": q = q.order("created_at", { ascending: false }); break;
        case "title_telugu": q = q.order("title_telugu", { ascending: true }); break;
        case "title_english": q = q.order("title_english", { ascending: true, nullsFirst: false }); break;
        case "movie_name": q = q.order("movie_name", { ascending: true, nullsFirst: false }); break;
      }

      const { data, error } = await q.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
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
    const offset = Math.floor(Math.random() * globalCount);
    const { data } = await supabase
      .from("songs")
      .select("id")
      .order("created_at", { ascending: false })
      .range(offset, offset);
    if (data?.[0]) router.push(`/song/${data[0].id}`);
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
    <div>
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
