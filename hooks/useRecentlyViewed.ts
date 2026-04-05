"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "lyrics-vault-recent";
const MAX_RECENT = 10;

export function useRecentlyViewed() {
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setRecentIds(raw ? JSON.parse(raw) : []);
    } catch {
      setRecentIds([]);
    }
  }, []);

  return { recentIds };
}

export function trackRecentlyViewed(songId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const recent: string[] = raw ? JSON.parse(raw) : [];
    const updated = [songId, ...recent.filter((id) => id !== songId)].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore localStorage errors (e.g. private browsing restrictions)
  }
}
