import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { SongMeta } from "@/lib/supabase";

const SELECT_COLS = "id, title_telugu, title_english, movie_name, genre, year, singer, lyricist, music_director, media_url, tags, created_at";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json([]);
  }

  // Try pgroonga RPC first (better Telugu/multilingual search)
  const { data: rpcData, error: rpcError } = await supabase.rpc("search_songs", { query_text: q });

  if (!rpcError) {
    return NextResponse.json((rpcData ?? []) as SongMeta[]);
  }

  // Fall back to ILIKE search — works without any extensions
  const pattern = `%${q}%`;
  const { data, error } = await supabase
    .from("songs")
    .select(SELECT_COLS)
    .or(
      `title_telugu.ilike.${pattern},title_english.ilike.${pattern},movie_name.ilike.${pattern},lyrics.ilike.${pattern}`
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []) as SongMeta[]);
}
