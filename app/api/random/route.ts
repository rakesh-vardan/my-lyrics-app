import { NextResponse } from "next/server";
import { getRandomSongId } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Public: one random song id, for the "Surprise me" button. */
export async function GET() {
  try {
    const id = await getRandomSongId();
    if (!id) {
      return NextResponse.json({ error: "No songs yet." }, { status: 404 });
    }
    return NextResponse.json({ id });
  } catch (error) {
    console.error("GET /api/random failed", error);
    return NextResponse.json({ error: "Failed to pick a song." }, { status: 500 });
  }
}
