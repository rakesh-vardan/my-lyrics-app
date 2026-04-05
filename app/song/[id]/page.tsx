import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import CopyButton from "@/components/CopyButton";
import FavoriteButton from "@/components/FavoriteButton";
import RecentlyViewedTracker from "@/components/RecentlyViewedTracker";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = 'force-dynamic';

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

  return (
    <div className="max-w-2xl mx-auto">
      <RecentlyViewedTracker songId={song.id} />
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm inline-flex items-center gap-1 transition-colors">
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
            <p className="text-violet-400 mt-2 flex items-center gap-1">
              🎬 <span>{song.movie_name}</span>
            </p>
          )}
          {song.genre && (
            <span className="inline-block mt-2 text-xs bg-violet-600/30 text-violet-300 px-3 py-1 rounded-full border border-violet-500/30">
              {song.genre}
            </span>
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

        <div className="telugu-text text-xl leading-loose text-slate-100 whitespace-pre-wrap font-medium">
          {song.lyrics}
        </div>
      </div>

      <p className="text-slate-600 text-xs text-center mt-4">
        Added {new Date(song.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
      </p>
    </div>
  );
}
