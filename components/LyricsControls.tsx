"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const FONT_SIZES = [14, 16, 18, 20, 22, 24, 28, 32] as const;
const DEFAULT_IDX = 3; // 20px — matches original text-xl
const STORAGE_KEY = "lyrics-font-size-index";
const SCROLL_SPEED = 15; // px per second

export default function LyricsControls({
  lyrics,
  title,
}: {
  lyrics: string;
  title: string;
}) {
  const [sizeIdx, setSizeIdx] = useState(DEFAULT_IDX);
  const [isScrolling, setIsScrolling] = useState(false);
  const [shareLabel, setShareLabel] = useState<"share" | "copied">("share");
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Restore persisted font size preference
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const idx = parseInt(stored, 10);
      if (!isNaN(idx) && idx >= 0 && idx < FONT_SIZES.length) {
        setSizeIdx(idx);
      }
    }
  }, []);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const changeSize = (delta: number) => {
    setSizeIdx((prev) => {
      const next = Math.min(Math.max(prev + delta, 0), FONT_SIZES.length - 1);
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  const stopScroll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTimeRef.current = 0;
    setIsScrolling(false);
  }, []);

  const startScroll = useCallback(() => {
    setIsScrolling(true);
    const tick = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const elapsed = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      window.scrollBy(0, SCROLL_SPEED * elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const toggleScroll = useCallback(() => {
    if (isScrolling) {
      stopScroll();
    } else {
      startScroll();
    }
  }, [isScrolling, startScroll, stopScroll]);

  const handleShare = async () => {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled — do nothing
      }
    } else {
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(url);
        setShareLabel("copied");
        setTimeout(() => setShareLabel("share"), 2500);
      } catch {
        // clipboard denied — ignore
      }
    }
  };

  return (
    <div>
      {/* Controls bar */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {/* Font size control */}
        <div className="flex items-center gap-0.5 bg-slate-900 rounded-lg p-1 border border-slate-700">
          <button
            onClick={() => changeSize(-1)}
            disabled={sizeIdx === 0}
            className="px-2.5 py-1 rounded-md hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-sm transition-colors select-none"
            title="Decrease font size"
            aria-label="Decrease font size"
          >
            A−
          </button>
          <span className="text-slate-500 text-xs px-2 w-12 text-center tabular-nums">
            {FONT_SIZES[sizeIdx]}px
          </span>
          <button
            onClick={() => changeSize(1)}
            disabled={sizeIdx === FONT_SIZES.length - 1}
            className="px-2.5 py-1 rounded-md hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-sm transition-colors select-none"
            title="Increase font size"
            aria-label="Increase font size"
          >
            A+
          </button>
        </div>

        {/* Auto-scroll / karaoke toggle */}
        <button
          onClick={toggleScroll}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isScrolling
              ? "bg-violet-600 hover:bg-violet-500 text-white"
              : "bg-slate-700 hover:bg-slate-600 text-slate-300"
          }`}
          title={isScrolling ? "Stop auto-scroll" : "Auto-scroll (karaoke mode)"}
        >
          {isScrolling ? "⏸ Stop" : "▶ Auto-scroll"}
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-slate-100 transition-colors"
          title="Share this song"
        >
          {shareLabel === "copied" ? "✓ Link copied!" : "↗ Share"}
        </button>
      </div>

      {/* Lyrics */}
      <div
        className="telugu-text leading-loose text-slate-100 whitespace-pre-wrap font-medium transition-[font-size] duration-150"
        style={{ fontSize: `${FONT_SIZES[sizeIdx]}px` }}
      >
        {lyrics}
      </div>
    </div>
  );
}
