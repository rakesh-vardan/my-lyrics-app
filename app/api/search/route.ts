import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { SongMeta } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase.rpc("search_songs", { query_text: q });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []) as SongMeta[]);
}
