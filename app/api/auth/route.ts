import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: "Admin password not configured" }, { status: 500 });
  }

  // Use timing-safe comparison to prevent timing attacks
  const inputHash = createHash("sha256").update(String(password)).digest();
  const adminHash = createHash("sha256").update(adminPassword).digest();

  if (inputHash.length === adminHash.length && timingSafeEqual(inputHash, adminHash)) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}
