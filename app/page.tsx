"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { supabase, Song } from "@/lib/supabase";

export default function HomePage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSongs() {
      try {
        const { data, error } = await supabase
          .from("songs")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setSongs(data || []);
        setResults(data || []);
      } catch (err) {
        setError("Failed to load songs. Please check your Supabase configuration.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSongs();
  }, []);

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (!q.trim()) {
        setResults(songs);
        return;
      }
      const fuse = new Fuse(songs, {
        keys: ["title_telugu", "title_english", "movie_name", "tags"],
        threshold: 0.4,
        includeScore: true,
      });
      const fuseResults = fuse.search(q);
      setResults(fuseResults.map((r) => r.item));
    },
    [songs]
  );

  return (
    <div>
      <div className="mb-6">
        <input
          type="search"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search songs in Telugu or English..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-base"
        />
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
          <p>{query ? "No songs found matching your search." : "No songs yet. Add your first song!"}</p>
          {!query && (
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
        {results.map((song) => (
          <Link
            key={song.id}
            href={`/song/${song.id}`}
            className="block bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-violet-500 rounded-xl p-4 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-slate-100 telugu-text truncate">
                  {song.title_telugu}
                </h2>
                {song.title_english && (
                  <p className="text-sm text-slate-400 truncate">{song.title_english}</p>
                )}
                {song.movie_name && (
                  <p className="text-xs text-violet-400 mt-1">🎬 {song.movie_name}</p>
                )}
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
        ))}
      </div>

      {!loading && !error && results.length > 0 && (
        <p className="text-center text-slate-500 text-sm mt-6">
          {results.length} song{results.length !== 1 ? "s" : ""}
          {query ? " found" : " total"}
        </p>
      )}
    </div>
  );
}
