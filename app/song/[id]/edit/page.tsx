"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { GENRES } from "@/lib/types";

export default function EditSongPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // The admin cookie is httpOnly, so ask the server whether we're unlocked.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth")
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data) => {
        if (!cancelled) setAuthenticated(Boolean(data.authenticated));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCheckingAuth(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [form, setForm] = useState({
    title_telugu: "",
    title_english: "",
    movie_name: "",
    genre: "",
    lyrics: "",
    tags: "",
  });

  useEffect(() => {
    async function fetchSong() {
      try {
        const res = await fetch(`/api/songs/${id}`);
        if (!res.ok) {
          setFetchError(true);
          return;
        }
        const data = await res.json();
        setForm({
          title_telugu: data.title_telugu,
          title_english: data.title_english || "",
          movie_name: data.movie_name || "",
          genre: data.genre || "",
          lyrics: data.lyrics,
          tags: data.tags ? data.tags.join(", ") : "",
        });
      } catch {
        setFetchError(true);
      } finally {
        setFetching(false);
      }
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
      setPassword("");
    } else if (res.status === 429) {
      setAuthError("Too many attempts. Try again in 15 minutes.");
    } else {
      setAuthError("Invalid password. Please try again.");
    }
  };

  const handleLock = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setAuthenticated(false);
    toast.success("Locked. Password required again.");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const tags = form.tags
      ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const res = await fetch(`/api/songs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title_telugu: form.title_telugu,
        title_english: form.title_english || null,
        movie_name: form.movie_name || null,
        genre: form.genre || null,
        lyrics: form.lyrics,
        tags,
      }),
    });

    setLoading(false);

    if (res.status === 401) {
      setAuthenticated(false);
      toast.error("Session expired. Please unlock again.");
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to update the song.");
      return;
    }

    toast.success("Song updated successfully!");
    setTimeout(() => router.push(`/song/${id}`), 1200);
  };

  if (checkingAuth) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 text-slate-400">
        Checking session…
      </div>
    );
  }

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
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 mb-4 flex-wrap">
        <Link href="/" className="hover:text-violet-400 transition-colors">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/song/${id}`} className="hover:text-violet-400 transition-colors truncate max-w-[180px]">
          {form.title_english || form.title_telugu || "Song"}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-300">Edit</span>
      </nav>

      <Link
        href={`/song/${id}`}
        className="text-violet-400 hover:text-violet-300 text-sm mb-6 inline-flex items-center gap-1 transition-colors"
      >
        ← Back to song
      </Link>

      <div className="flex items-center justify-between gap-3 mb-6 mt-4">
        <h1 className="text-2xl font-bold text-violet-400">✏️ Edit Song</h1>
        <button
          onClick={handleLock}
          className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
          title="Lock this device — password required again"
        >
          🔒 Lock
        </button>
      </div>

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
            Genre / Category
          </label>
          <select
            value={form.genre}
            onChange={(e) => setForm({ ...form, genre: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Select a genre...</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
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
