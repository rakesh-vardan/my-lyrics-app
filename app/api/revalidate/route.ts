import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Clears the cached browse pages after a write. The admin cookie is the same
 * one that authorises /api/songs, so the client no longer has to keep the
 * password in sessionStorage to call this.
 */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const songId = typeof body?.songId === "string" ? body.songId : undefined;

  const paths = ["/", "/movies", "/genres"];
  for (const path of paths) revalidatePath(path);
  if (songId) {
    revalidatePath(`/song/${songId}`);
    paths.push(`/song/${songId}`);
  }

  return NextResponse.json({ revalidated: true, paths });
}
