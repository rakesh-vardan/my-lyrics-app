import { NextRequest, NextResponse } from "next/server";
import { createSong, getAllSongsMeta } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseSongInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

/** Public: the whole library's metadata (never includes lyrics). */
export async function GET() {
  try {
    return NextResponse.json(await getAllSongsMeta());
  } catch (error) {
    console.error("GET /api/songs failed", error);
    return NextResponse.json({ error: "Failed to load songs." }, { status: 500 });
  }
}

/** Admin only. */
export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseSongInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 422 });
  }

  try {
    const song = await createSong(parsed.value);
    return NextResponse.json(song, { status: 201 });
  } catch (error) {
    console.error("POST /api/songs failed", error);
    return NextResponse.json({ error: "Failed to save the song." }, { status: 500 });
  }
}
