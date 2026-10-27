import { NextRequest, NextResponse } from "next/server";
import { createSong, isSongSort, listSongs } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { parseSongInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

function intParam(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Public: one page of the library's metadata (never lyrics), filtered and
 * sorted server-side. Returns `{ songs, total }` so the client can paginate.
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;

  const rawSort = p.get("sort");
  const sort = isSongSort(rawSort) ? rawSort : "recent";
  const idsParam = p.get("ids");

  try {
    const { songs, total } = await listSongs({
      ids: idsParam ? idsParam.split(",").filter(Boolean) : undefined,
      genre: p.get("genre") ?? undefined,
      movie: p.get("movie") ?? undefined,
      tag: p.get("tag") ?? undefined,
      letter: p.get("letter") ?? undefined,
      sort,
      limit: intParam(p.get("limit"), 20),
      offset: intParam(p.get("offset"), 0),
    });

    return NextResponse.json({ songs, total });
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
