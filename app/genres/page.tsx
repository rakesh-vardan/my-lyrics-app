import { supabase } from "@/lib/supabase";
import { GENRES } from "@/lib/supabase";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse by Genre | Telugu Lyrics Vault",
};

const GENRE_ICONS: Record<string, string> = {
  Devotional: "🙏",
  Romantic: "💕",
  Melody: "🎶",
  Folk: "🪘",
  Classical: "🎻",
  Patriotic: "🇮🇳",
  Sad: "😢",
  Dance: "💃",
  Other: "🎵",
};

export default async function GenresPage() {
  const { data: songs } = await supabase
    .from("songs")
    .select("id, title_telugu, title_english, genre, movie_name")
    .order("title_telugu", { ascending: true });

  // Group songs by genre
  const genreMap = new Map<string, { id: string; title_telugu: string; title_english: string | null; movie_name: string | null }[]>();

  // Initialize all genres so they show even if empty
  for (const g of GENRES) {
    genreMap.set(g, []);
  }

  for (const song of songs ?? []) {
    const genre = song.genre || "Other";
    if (!genreMap.has(genre)) {
      genreMap.set(genre, []);
    }
    genreMap.get(genre)!.push({
      id: song.id,
      title_telugu: song.title_telugu,
      title_english: song.title_english,
      movie_name: song.movie_name,
    });
  }

  // Filter out empty genres and sort
  const genresWithSongs = [...genreMap.entries()]
    .filter(([, songs]) => songs.length > 0)
    .sort((a, b) => b[1].length - a[1].length);

  const totalSongs = (songs ?? []).length;

  return (
    <div>
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
        <Link href="/" className="hover:text-violet-400 transition-colors">Home</Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-300">Genres</span>
      </nav>

      <h1 className="text-2xl font-bold mb-6 text-violet-400">🎵 Browse by Genre</h1>

      {/* Genre tiles overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {genresWithSongs.map(([genre, genreSongs]) => (
          <a
            key={genre}
            href={`#genre-${genre}`}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-violet-500 transition-colors text-center"
          >
            <div className="text-3xl mb-2">{GENRE_ICONS[genre] || "🎵"}</div>
            <h3 className="text-sm font-semibold text-slate-200">{genre}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {genreSongs.length} song{genreSongs.length !== 1 ? "s" : ""}
            </p>
          </a>
        ))}
      </div>

      {/* Genre sections with songs */}
      <div className="space-y-8">
        {genresWithSongs.map(([genre, genreSongs]) => (
          <section key={genre} id={`genre-${genre}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{GENRE_ICONS[genre] || "🎵"}</span>
              <h2 className="text-xl font-bold text-slate-100">{genre}</h2>
              <span className="text-xs bg-violet-600/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/20">
                {genreSongs.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {genreSongs.map((s) => (
                <Link
                  key={s.id}
                  href={`/song/${s.id}`}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-3 hover:border-violet-500 hover:bg-slate-700 transition-colors"
                >
                  <p className="text-sm font-semibold text-slate-100 telugu-text truncate">
                    {s.title_telugu}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {s.title_english && (
                      <span className="text-xs text-slate-400 truncate">{s.title_english}</span>
                    )}
                    {s.movie_name && (
                      <span className="text-xs text-violet-400 truncate">🎬 {s.movie_name}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {totalSongs === 0 && (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-3">🎵</div>
          <p>No songs found. Add some songs first!</p>
        </div>
      )}
    </div>
  );
}
