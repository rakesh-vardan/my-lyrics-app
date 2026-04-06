import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "crypto";

const SECRET = process.env.ADMIN_PASSWORD ?? "";

function isAuthorized(request: NextRequest): boolean {
  const token = request.headers.get("x-revalidate-token") ?? "";
  if (!SECRET || !token) return false;
  try {
    const a = Buffer.from(SECRET, "utf8");
    const b = Buffer.from(token, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const songId = body.songId as string | undefined;

  // Revalidate global listing pages
  revalidatePath("/movies");
  revalidatePath("/genres");

  // Revalidate specific song page if ID provided
  if (songId) {
    revalidatePath(`/song/${songId}`);
  }

  // Clear client-side filter cache hint
  return NextResponse.json({
    revalidated: true,
    paths: ["/movies", "/genres", ...(songId ? [`/song/${songId}`] : [])],
  });
}
