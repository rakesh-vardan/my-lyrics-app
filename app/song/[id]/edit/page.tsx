"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title_telugu: "",
    title_english: "",
    movie_name: "",
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
          lyrics: data.lyrics,
          tags: data.tags ? data.tags.join(", ") : "",
        });
      } else if (error || !data) {
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
    } else {
      setAuthError("Invalid password. Please try again.");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const tags = form.tags
      ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const { error } = await supabase
      .from("songs")
      .update({
        title_telugu: form.title_telugu,
        title_english: form.title_english || null,
        movie_name: form.movie_name || null,
        lyrics: form.lyrics,
        tags: tags.length > 0 ? tags : null,
      })
      .eq("id", id);

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push(`/song/${id}`);
      }, 1500);
    }
  };

  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto mt-16">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-center mb-6 text-violet-400">🔐 Admin Access</h1>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
                autoFocus
              />
            </div>
            {authError && (
              <p className="text-red-400 text-sm">{authError}</p>
            )}
            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg font-medium transition-colors"
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
          <Link href="/" className="text-violet-400 hover:text-violet-300 underline">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/song/${id}`}
        className="text-violet-400 hover:text-violet-300 text-sm mb-6 inline-flex items-center gap-1 transition-colors"
      >
        ← Back to song
      </Link>

      <h1 className="text-2xl font-bold mb-6 mt-4 text-violet-400">✏️ Edit Song</h1>

      {success && (
        <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 mb-6 text-green-300">
          ✅ Song updated successfully! Redirecting...
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6 text-red-300">
          ❌ {error}
        </div>
      )}

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
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 telugu-text text-lg"
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
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
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
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
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
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
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
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 telugu-text text-base leading-relaxed resize-y"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-800 disabled:opacity-60 text-white py-3 rounded-xl font-semibold text-base transition-colors"
        >
          {loading ? "Saving..." : "💾 Save Changes"}
        </button>
      </form>
    </div>
  );
}
