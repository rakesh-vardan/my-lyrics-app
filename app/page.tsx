"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { supabase, Song, GENRES } from "@/lib/supabase";
import { useFavorites } from "@/hooks/useFavorites";

type SortOption = "recent" | "title_telugu" | "title_english" | "movie_name";

const SORT_LABELS: Record<SortOption, string> = {
  recent: "Recently Added",
  title_telugu: "Telugu Title (A-Z)",
  title_english: "English Title (A-Z)",
  movie_name: "Movie Name (A-Z)",
};

const PAGE_SIZE = 20;

export default function HomePage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  // Pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { favorites, toggleFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    async function fetchSongs() {
      try {
        const { data, error } = await supabase
          .from("songs")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setSongs(data || []);
      } catch (err) {
        setError("Failed to load songs. Please check your Supabase configuration.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSongs();
  }, []);

  // Derive filtered + sorted + searched results
  const getFilteredResults = useCallback(() => {
    let filtered = [...songs];

    // Favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter((s) => favorites.has(s.id));
    }

    // Genre filter
    if (selectedGenre) {
      filtered = filtered.filter((s) => s.genre === selectedGenre);
    }

    // Search
    if (query.trim()) {
      const fuse = new Fuse(filtered, {
        keys: ["title_telugu", "title_english", "movie_name", "tags"],
        threshold: 0.4,
        includeScore: true,
      });
      filtered = fuse.search(query).map((r) => r.item);
    }

    // Sort (skip if search is active — Fuse already ranks by relevance)
    if (!query.trim()) {
      filtered.sort((a, b) => {
        switch (sortBy) {
          case "recent":
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case "title_telugu":
            return a.title_telugu.localeCompare(b.title_telugu, "te");
          case "title_english":
            return (a.title_english || "").localeCompare(b.title_english || "", "en");
          case "movie_name":
            return (a.movie_name || "").localeCompare(b.movie_name || "", "en");
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [songs, query, showFavoritesOnly, selectedGenre, sortBy, favorites]);

  const results = getFilteredResults();
  const visibleResults = results.slice(0, visibleCount);
  const hasMore = visibleCount < results.length;

  // Reset visible count when filters/search change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, showFavoritesOnly, selectedGenre, sortBy]);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  // Collect genres that actually exist in the data for filter chips
  const availableGenres = [...new Set(songs.map((s) => s.genre).filter(Boolean))] as string[];

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs in Telugu or English..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-base"
        />
      </div>

      {/* Filters & Sort Bar */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Favorites toggle + Sort */}
        <div className="flex items-center gap-3 flex-wrap">
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

          <div className="ml-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {Object.entries(SORT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Genre filter chips */}
        {availableGenres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedGenre("")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                !selectedGenre
                  ? "bg-violet-600 border-violet-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
              }`}
            >
              All Genres
            </button>
            {GENRES.filter((g) => availableGenres.includes(g)).map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(selectedGenre === genre ? "" : genre)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  selectedGenre === genre
                    ? "bg-violet-600 border-violet-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        )}
      </div>

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
              : "No songs yet. Add your first song!"}
          </p>
          {!query && !showFavoritesOnly && !selectedGenre && (
            <Link
              href="/add"
              className="mt-4 inline-block bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + Add Song
            </Link>
          )}
        </div>
      )}

      <div className="space-y-3">
        {visibleResults.map((song) => (
          <div
            key={song.id}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-violet-500 rounded-xl transition-all"
          >
            {/* Favorite toggle */}
            <button
              onClick={() => toggleFavorite(song.id)}
              className="pl-4 py-4 text-lg shrink-0 hover:scale-110 transition-transform"
              title={isFavorite(song.id) ? "Remove from favorites" : "Add to favorites"}
            >
              {isFavorite(song.id) ? "❤️" : "🤍"}
            </button>

            {/* Song link */}
            <Link
              href={`/song/${song.id}`}
              className="flex-1 min-w-0 p-4 pl-2"
            >
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
                        <span
                          key={tag}
                          className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
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
          {query ? " found" : ""}
          {showFavoritesOnly ? " in favorites" : ""}
          {selectedGenre ? ` in ${selectedGenre}` : ""}
        </p>
      )}
    </div>
  );
}
