"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { supabase, GENRES } from "@/lib/supabase";

export default function EditSongPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Restore session auth
  useEffect(() => {
    try {
      if (sessionStorage.getItem("adminAuth") === "true") setAuthenticated(true);
    } catch {}
  }, []);

  const [form, setForm] = useState({
    title_telugu: "",
    title_english: "",
    movie_name: "",
    genre: "",
    year: "",
    singer: "",
    lyricist: "",
    music_director: "",
    media_url: "",
    lyrics: "",
    tags: "",
  });

  useEffect(() => {
    async function fetchSong() {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .eq("id", id)
        .single();
      if (data) {
        setForm({
          title_telugu: data.title_telugu,
          title_english: data.title_english || "",
          movie_name: data.movie_name || "",
          genre: data.genre || "",
          year: data.year ? String(data.year) : "",
          singer: data.singer || "",
          lyricist: data.lyricist || "",
          music_director: data.music_director || "",
          media_url: data.media_url || "",
          lyrics: data.lyrics,
          tags: data.tags ? data.tags.join(", ") : "",
        });
      } else {
        setFetchError(true);
      }
      setFetching(false);
    }
    fetchSong();
  }, [id]);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthenticated(true);
      setAuthError("");
      try { sessionStorage.setItem("adminAuth", "true"); } catch {}
    } else if (res.status === 429) {
      setAuthError("Too many attempts. Try again in 15 minutes.");
    } else {
      setAuthError("Invalid password. Please try again.");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const tags = form.tags
      ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const { error } = await supabase
      .from("songs")
      .update({
        title_telugu: form.title_telugu,
        title_english: form.title_english || null,
        movie_name: form.movie_name || null,
        genre: form.genre || null,
        year: form.year ? Number.parseInt(form.year, 10) : null,
        singer: form.singer || null,
        lyricist: form.lyricist || null,
        music_director: form.music_director || null,
        media_url: form.media_url || null,
        lyrics: form.lyrics,
        tags: tags.length > 0 ? tags : null,
      })
      .eq("id", id);

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Song updated successfully!");
      setTimeout(() => router.push(`/song/${id}`), 1200);
    }
  };

  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto mt-16">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-center mb-6 text-sky-400">🔐 Admin Access</h1>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
                autoFocus
              />
            </div>
            {authError && (
              <p className="text-red-400 text-sm">{authError}</p>
            )}
            <button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-700 text-white py-2 rounded-lg font-medium transition-colors"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 text-slate-400">
        Loading song...
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-red-300">
          ❌ Song not found or could not be loaded.{" "}
          <Link href="/" className="text-sky-400 hover:text-sky-300 underline">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 mb-4 flex-wrap">
        <Link href="/" className="hover:text-sky-400 transition-colors">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/song/${id}`} className="hover:text-sky-400 transition-colors truncate max-w-[180px]">
          {form.title_english || form.title_telugu || "Song"}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-300">Edit</span>
      </nav>

      <Link
        href={`/song/${id}`}
        className="text-sky-400 hover:text-sky-300 text-sm mb-6 inline-flex items-center gap-1 transition-colors"
      >
        ← Back to song
      </Link>

      <h1 className="text-2xl font-bold mb-6 mt-4 text-sky-400">✏️ Edit Song</h1>

      <form onSubmit={handleSubmit} className="space-y-5 bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Telugu Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.title_telugu}
            onChange={(e) => setForm({ ...form, title_telugu: e.target.value })}
            placeholder="e.g., నువ్వే నువ్వే"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 telugu-text text-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            English Title / Transliteration
          </label>
          <input
            type="text"
            value={form.title_english}
            onChange={(e) => setForm({ ...form, title_english: e.target.value })}
            placeholder="e.g., Nuvve Nuvve"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Movie / Album Name
          </label>
          <input
            type="text"
            value={form.movie_name}
            onChange={(e) => setForm({ ...form, movie_name: e.target.value })}
            placeholder="e.g., Nuvve Nuvve (2002)"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Genre / Category
          </label>
          <select
            value={form.genre}
            onChange={(e) => setForm({ ...form, genre: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Select a genre...</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Year of Release
          </label>
          <input
            type="number"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
            placeholder="e.g., 2002"
            min="1900"
            max="2099"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Singer(s)
            </label>
            <input
              type="text"
              value={form.singer}
              onChange={(e) => setForm({ ...form, singer: e.target.value })}
              placeholder="e.g., S.P. Balasubrahmanyam"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Lyricist
            </label>
            <input
              type="text"
              value={form.lyricist}
              onChange={(e) => setForm({ ...form, lyricist: e.target.value })}
              placeholder="e.g., Sirivennela"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Music Director
            </label>
            <input
              type="text"
              value={form.music_director}
              onChange={(e) => setForm({ ...form, music_director: e.target.value })}
              placeholder="e.g., M.M. Keeravani"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            YouTube / Spotify URL
          </label>
          <input
            type="url"
            value={form.media_url}
            onChange={(e) => setForm({ ...form, media_url: e.target.value })}
            placeholder="e.g., https://www.youtube.com/watch?v=..."
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Tags <span className="text-slate-500">(comma-separated)</span>
          </label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="e.g., Melody, Sid Sriram, Love"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Lyrics <span className="text-red-400">*</span>
          </label>
          <textarea
            value={form.lyrics}
            onChange={(e) => setForm({ ...form, lyrics: e.target.value })}
            placeholder="Paste Telugu lyrics here..."
            rows={12}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 telugu-text text-base leading-relaxed resize-y"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-sky-800 disabled:opacity-60 text-white py-3 rounded-xl font-semibold text-base transition-colors"
        >
          {loading ? "Saving..." : "💾 Save Changes"}
        </button>
      </form>
    </div>
  );
}
