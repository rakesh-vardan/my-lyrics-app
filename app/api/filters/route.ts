import { NextRequest, NextResponse } from "next/server";
import { getFilterOptions } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public: distinct movies, tags and genres for the filter dropdowns, plus the
 * library size. One query, so the home page needs a single round trip.
 */
export async function GET() {
  try {
    return NextResponse.json(await getFilterOptions());
  } catch (error) {
    console.error("GET /api/filters failed", error);
    return NextResponse.json({ error: "Failed to load filters." }, { status: 500 });
  }
}
