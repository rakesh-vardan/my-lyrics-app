import { NextRequest, NextResponse } from "next/server";
import { getSongById, updateSong } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseSongInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Public: one full song, used by the edit form. */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  try {
    const song = await getSongById(id);
    if (!song) {
      return NextResponse.json({ error: "Song not found." }, { status: 404 });
    }
    return NextResponse.json(song);
  } catch (error) {
    console.error(`GET /api/songs/${id} failed`, error);
    return NextResponse.json({ error: "Failed to load the song." }, { status: 500 });
  }
}

/** Admin only. */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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
    const song = await updateSong(id, parsed.value);
    if (!song) {
      return NextResponse.json({ error: "Song not found." }, { status: 404 });
    }
    return NextResponse.json(song);
  } catch (error) {
    console.error(`PATCH /api/songs/${id} failed`, error);
    return NextResponse.json({ error: "Failed to update the song." }, { status: 500 });
  }
}
