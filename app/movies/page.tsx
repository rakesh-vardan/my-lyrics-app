import { supabase } from "@/lib/supabase";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse by Movie | Telugu Lyrics Vault",
};

export default async function MoviesPage() {
  const { data: songs } = await supabase
    .from("songs")
    .select("id, title_telugu, title_english, movie_name")
    .order("movie_name", { ascending: true });

  // Group songs by movie
  const movieMap = new Map<string, { count: number; songs: { id: string; title_telugu: string; title_english: string | null }[] }>();

  for (const song of songs ?? []) {
    const movie = song.movie_name || "Unknown / Independent";
    if (!movieMap.has(movie)) {
      movieMap.set(movie, { count: 0, songs: [] });
    }
    const entry = movieMap.get(movie)!;
    entry.count++;
    entry.songs.push({ id: song.id, title_telugu: song.title_telugu, title_english: song.title_english });
  }

  const sortedMovies = [...movieMap.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "en")
  );

  return (
    <div>
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
        <Link href="/" className="hover:text-sky-400 transition-colors">Home</Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-300">Movies</span>
      </nav>

      <h1 className="text-2xl font-bold mb-6 text-sky-400">🎬 Browse by Movie</h1>

      <p className="text-sm text-slate-500 mb-4">
        {sortedMovies.length} movie{sortedMovies.length !== 1 ? "s" : ""} in vault
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sortedMovies.map(([movie, { count, songs: movieSongs }]) => (
          <div
            key={movie}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-sky-500 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-slate-100">{movie}</h2>
              <span className="text-xs bg-sky-600/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/20">
                {count} song{count !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-1">
              {movieSongs.map((s) => (
                <Link
                  key={s.id}
                  href={`/song/${s.id}`}
                  className="block text-sm text-slate-400 hover:text-sky-400 transition-colors truncate telugu-text"
                >
                  {s.title_telugu}
                  {s.title_english && (
                    <span className="text-slate-500 ml-2 font-sans text-xs">({s.title_english})</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {sortedMovies.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-3">🎬</div>
          <p>No movies found. Add some songs first!</p>
        </div>
      )}
    </div>
  );
}
