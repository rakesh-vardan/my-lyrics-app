"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, GENRES } from "@/lib/supabase";
import type { SongMeta } from "@/lib/supabase";
import { useFavorites } from "@/hooks/useFavorites";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";

type SortOption = "recent" | "title_telugu" | "title_english" | "movie_name";

const SORT_LABELS: Record<SortOption, string> = {
  recent: "Recently Added",
  title_telugu: "Telugu Title (A–Z)",
  title_english: "English Title (A–Z)",
  movie_name: "Movie Name (A–Z)",
};

const PAGE_SIZE = 20;

export default function HomePage() {
  const router = useRouter();

  // All song metadata (no lyrics) loaded once
  const [allSongs, setAllSongs] = useState<SongMeta[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  // Pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { recentIds } = useRecentlyViewed();

  // --- Initial load (metadata only, no lyrics) ---
  useEffect(() => {
    async function fetchSongs() {
      try {
        const { data, error } = await supabase
          .from("songs")
          .select("id, title_telugu, title_english, movie_name, genre, tags, created_at")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setAllSongs((data as SongMeta[]) || []);
      } catch (err) {
        setError("Failed to load songs. Please check your Supabase configuration.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSongs();
  }, []);

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

  // --- Derived filter options (always from allSongs, not searchResults) ---
  const availableGenres = useMemo(
    () => GENRES.filter((g) => allSongs.some((s) => s.genre === g)),
    [allSongs]
  );
  const availableMovies = useMemo(
    () =>
      [...new Set(allSongs.map((s) => s.movie_name).filter(Boolean))]
        .sort() as string[],
    [allSongs]
  );
  const availableTags = useMemo(
    () => [...new Set(allSongs.flatMap((s) => s.tags ?? []))].sort(),
    [allSongs]
  );

  // --- Recently viewed (mapped to SongMeta, preserving order) ---
  const recentSongs = useMemo(
    () =>
      recentIds
        .map((id) => allSongs.find((s) => s.id === id))
        .filter(Boolean) as SongMeta[],
    [recentIds, allSongs]
  );

  // --- Filtered + sorted results ---
  const results = useMemo(() => {
    let base = searchResults ?? allSongs;

    if (showFavoritesOnly) base = base.filter((s) => favorites.has(s.id));
    if (selectedGenre) base = base.filter((s) => s.genre === selectedGenre);
    if (selectedMovie) base = base.filter((s) => s.movie_name === selectedMovie);
    if (selectedTag) base = base.filter((s) => s.tags?.includes(selectedTag));

    // Skip sort when search is active — pgroonga already ranked by relevance
    if (!debouncedQuery.trim()) {
      return [...base].sort((a, b) => {
        switch (sortBy) {
          case "recent":
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case "title_telugu":
            return a.title_telugu.localeCompare(b.title_telugu, "te");
          case "title_english":
            return (a.title_english ?? "").localeCompare(b.title_english ?? "", "en");
          case "movie_name":
            return (a.movie_name ?? "").localeCompare(b.movie_name ?? "", "en");
          default:
            return 0;
        }
      });
    }
    return base;
  }, [searchResults, allSongs, showFavoritesOnly, selectedGenre, selectedMovie, selectedTag, sortBy, debouncedQuery, favorites]);

  const visibleResults = results.slice(0, visibleCount);
  const hasMore = visibleCount < results.length;

  // Reset pagination on any filter/search change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, showFavoritesOnly, selectedGenre, selectedMovie, selectedTag, sortBy]);

  // --- Infinite scroll sentinel ---
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisibleCount((n) => n + PAGE_SIZE); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  // --- Random song ---
  const handleSurprise = () => {
    if (allSongs.length === 0) return;
    const pick = allSongs[Math.floor(Math.random() * allSongs.length)];
    router.push(`/song/${pick.id}`);
  };

  // --- Active filter state ---
  const activeFilters = [
    showFavoritesOnly && "Favorites",
    selectedGenre && `Genre: ${selectedGenre}`,
    selectedMovie && `Movie: ${selectedMovie}`,
    selectedTag && `Tag: ${selectedTag}`,
  ].filter(Boolean) as string[];
  const hasActiveFilters = activeFilters.length > 0;

  const clearAllFilters = () => {
    setShowFavoritesOnly(false);
    setSelectedGenre("");
    setSelectedMovie("");
    setSelectedTag("");
  };

  // Show recently viewed only when completely unfiltered / not searching
  const showRecentSection =
    !query && !hasActiveFilters && recentSongs.length > 0 && !loading;

  // --- Chip style helpers ---
  const chipBase = "px-3 py-1 rounded-full text-xs font-medium transition-colors border";
  const chipActive = "bg-violet-600 border-violet-500 text-white";
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
                className="shrink-0 w-40 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-violet-500 rounded-xl p-3 transition-all"
              >
                <p className="text-sm font-semibold text-slate-100 telugu-text line-clamp-2 leading-snug">
                  {song.title_telugu}
                </p>
                {song.movie_name && (
                  <p className="text-xs text-violet-400 mt-1 truncate">🎬 {song.movie_name}</p>
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
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-10 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-base"
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
            {showFavoritesOnly ? "❤️ Favorites" : "🤍 Favorites"}
          </button>

          <button
            onClick={handleSurprise}
            disabled={allSongs.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Open a random song"
          >
            🎲 Surprise Me
          </button>

          <div className="ml-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                className={`bg-slate-800 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                  selectedMovie ? "border-violet-500 text-violet-300" : "border-slate-700 text-slate-400"
                }`}
              >
                <option value="">🎬 All Movies</option>
                {availableMovies.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
            {availableTags.length > 0 && (
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className={`bg-slate-800 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                  selectedTag ? "border-violet-500 text-violet-300" : "border-slate-700 text-slate-400"
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

        {/* Row 4: Active filter pills + Clear all */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((label) => (
              <span
                key={label}
                className="text-xs bg-violet-600/20 border border-violet-500/40 text-violet-300 px-2.5 py-1 rounded-full"
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
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-3">🎵</div>
          <p>Loading songs...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && results.length === 0 && (
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
              className="mt-4 text-violet-400 hover:text-violet-300 text-sm underline"
            >
              Clear filters
            </button>
          )}
          {!query && !hasActiveFilters && (
            <Link
              href="/add"
              className="mt-4 inline-block bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + Add Song
            </Link>
          )}
        </div>
      )}

      {/* ── Song list ───────────────────────────────────── */}
      <div className="space-y-3">
        {visibleResults.map((song) => (
          <div
            key={song.id}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-violet-500 rounded-xl transition-all"
          >
            <button
              onClick={() => toggleFavorite(song.id)}
              className="pl-4 py-4 text-lg shrink-0 hover:scale-110 transition-transform"
              title={isFavorite(song.id) ? "Remove from favorites" : "Add to favorites"}
            >
              {isFavorite(song.id) ? "❤️" : "🤍"}
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
                      <p className="text-xs text-violet-400">🎬 {song.movie_name}</p>
                    )}
                    {song.genre && (
                      <span className="text-xs bg-violet-600/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/20">
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
                              ? "bg-violet-600 text-white"
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

      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={sentinelRef} className="h-10" />}

      {!loading && !error && results.length > 0 && (
        <p className="text-center text-slate-500 text-sm mt-6">
          Showing {visibleResults.length} of {results.length} song{results.length !== 1 ? "s" : ""}
          {query ? " matched" : ""}
          {hasActiveFilters ? " (filtered)" : ""}
        </p>
      )}
    </div>
  );
}
