"use client";

import { useEffect } from "react";
import { trackRecentlyViewed } from "@/hooks/useRecentlyViewed";

export default function RecentlyViewedTracker({ songId }: { songId: string }) {
  useEffect(() => {
    trackRecentlyViewed(songId);
  }, [songId]);

  return null;
}
