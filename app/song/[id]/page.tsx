import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import CopyButton from "@/components/CopyButton";
import FavoriteButton from "@/components/FavoriteButton";
import LyricsControls from "@/components/LyricsControls";
import RecentlyViewedTracker from "@/components/RecentlyViewedTracker";
import MediaEmbed from "@/components/MediaEmbed";
import SwipeNavigator from "@/components/SwipeNavigator";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 120; // Re-generate at most every 2 minutes

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabase.from("songs").select("title_telugu, title_english").eq("id", id).single();
  return {
    title: data ? `${data.title_telugu} | Telugu Lyrics Vault` : "Song | Telugu Lyrics Vault",
  };
}

export default async function SongPage({ params }: PageProps) {
  const { id } = await params;
  const { data: song, error } = await supabase.from("songs").select("*").eq("id", id).single();

  if (error || !song) {
    notFound();
  }

  // Fetch adjacent songs by the same movie for prev/next navigation
  let prevId: string | null = null;
  let nextId: string | null = null;

  if (song.movie_name) {
    const { data: siblings } = await supabase
      .from("songs")
      .select("id")
      .eq("movie_name", song.movie_name)
      .order("created_at", { ascending: true });

    if (siblings && siblings.length > 1) {
      const idx = siblings.findIndex((s) => s.id === id);
      if (idx > 0) prevId = siblings[idx - 1].id;
      if (idx < siblings.length - 1) nextId = siblings[idx + 1].id;
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <RecentlyViewedTracker songId={song.id} />

      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 mb-4 flex-wrap">
        <Link href="/" className="hover:text-sky-400 transition-colors">Home</Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-300 truncate max-w-[260px]">{song.title_english || song.title_telugu}</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-sky-400 hover:text-sky-300 text-sm inline-flex items-center gap-1 transition-colors">
          ← Back to all songs
        </Link>
        <Link
          href={`/song/${id}/edit`}
          className="text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-slate-100 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
        >
          ✏️ Edit
        </Link>
      </div>

      <div className="mt-4 bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <div className="mb-6 pb-6 border-b border-slate-700">
          <h1 className="text-3xl font-bold text-slate-100 telugu-text leading-relaxed mb-2">
            {song.title_telugu}
          </h1>
          {song.title_english && (
            <p className="text-slate-400 text-lg">{song.title_english}</p>
          )}
          {song.movie_name && (
            <p className="text-sky-400 mt-2 flex items-center gap-1">
              ▸ <span>{song.movie_name}</span>
            </p>
          )}
          {song.year && (
            <p className="text-slate-400 text-sm mt-1">📅 {song.year}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            {song.genre && (
              <span className="inline-block text-xs bg-sky-600/30 text-sky-300 px-3 py-1 rounded-full border border-sky-500/30">
                {song.genre}
              </span>
            )}
          </div>
          {(song.singer || song.lyricist || song.music_director) && (
            <div className="mt-3 space-y-1 text-sm text-slate-400">
              {song.singer && <p>🎤 Singer: <span className="text-slate-200">{song.singer}</span></p>}
              {song.lyricist && <p>✍️ Lyricist: <span className="text-slate-200">{song.lyricist}</span></p>}
              {song.music_director && <p>🎼 Music: <span className="text-slate-200">{song.music_director}</span></p>}
            </div>
          )}
          {song.tags && song.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {song.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="text-xs bg-slate-700 text-slate-300 px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mb-4">
          <FavoriteButton songId={song.id} />
          <CopyButton lyrics={song.lyrics} />
        </div>

        <LyricsControls lyrics={song.lyrics} title={song.title_telugu} />

        {song.media_url && <MediaEmbed url={song.media_url} />}
      </div>

      <SwipeNavigator prevId={prevId} nextId={nextId} />

      <p className="text-slate-600 text-xs text-center mt-4">
        Added {new Date(song.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
      </p>
    </div>
  );
}
