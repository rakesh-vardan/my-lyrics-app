"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const MIN_SWIPE_DISTANCE = 80;

export default function SwipeNavigator({
  prevId,
  nextId,
}: {
  prevId: string | null;
  nextId: string | null;
}) {
  const router = useRouter();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleSwipe = useCallback(
    (deltaX: number) => {
      if (deltaX > MIN_SWIPE_DISTANCE && prevId) {
        router.push(`/song/${prevId}`);
      } else if (deltaX < -MIN_SWIPE_DISTANCE && nextId) {
        router.push(`/song/${nextId}`);
      }
    },
    [prevId, nextId, router]
  );

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      // Only trigger if horizontal swipe is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        handleSwipe(deltaX);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [handleSwipe]);

  return (
    <div className="flex items-center justify-between mt-6 text-sm">
      {prevId ? (
        <button
          onClick={() => router.push(`/song/${prevId}`)}
          className="text-sky-400 hover:text-sky-300 transition-colors inline-flex items-center gap-1"
        >
          ← Previous
        </button>
      ) : (
        <span />
      )}
      {nextId ? (
        <button
          onClick={() => router.push(`/song/${nextId}`)}
          className="text-sky-400 hover:text-sky-300 transition-colors inline-flex items-center gap-1"
        >
          Next →
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
