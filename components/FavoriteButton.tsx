"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "lyrics-vault-favorites";

export default function FavoriteButton({ songId }: { songId: string }) {
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const favs: string[] = raw ? JSON.parse(raw) : [];
      setIsFav(favs.includes(songId));
    } catch {
      // ignore
    }
  }, [songId]);

  const toggle = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const favs: string[] = raw ? JSON.parse(raw) : [];
      let next: string[];
      if (favs.includes(songId)) {
        next = favs.filter((id) => id !== songId);
      } else {
        next = [...favs, songId];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setIsFav(!isFav);
    } catch {
      // ignore
    }
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      title={isFav ? "Remove from favorites" : "Add to favorites"}
    >
      {isFav ? <><span className="text-red-400">♥</span> Favorited</> : <><span className="text-slate-400">♡</span> Favorite</>}
    </button>
  );
}
