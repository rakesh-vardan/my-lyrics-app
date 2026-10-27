import { NextRequest, NextResponse } from "next/server";
import { searchSongs } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Substring search across titles, movie and lyrics.
 * Uses pg_trgm indexes (see db/schema.sql) so ILIKE stays fast; ranking puts
 * title matches above movie matches above lyrics-only hits.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json([]);
  }

  try {
    return NextResponse.json(await searchSongs(q), {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("GET /api/search failed", error);
    return NextResponse.json({ error: "Search is temporarily unavailable." }, { status: 500 });
  }
}
