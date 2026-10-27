import { NextRequest, NextResponse } from "next/server";
import { findDuplicateTitle } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public: powers the "a song with this title already exists" hint on the add
 * form. Matches the title case-insensitively; no wildcards are applied.
 */
export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title")?.trim() ?? "";
  if (!title) {
    return NextResponse.json({ match: null });
  }

  try {
    return NextResponse.json({ match: await findDuplicateTitle(title) });
  } catch (error) {
    console.error("GET /api/duplicate failed", error);
    return NextResponse.json({ error: "Failed to check for duplicates." }, { status: 500 });
  }
}
