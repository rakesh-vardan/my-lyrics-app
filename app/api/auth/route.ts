import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";

// In-memory rate limiter: 5 failures per 15 minutes per IP.
// Note: resets on server restart. For production use Redis instead.
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

interface RateRecord { failures: number; windowStart: number }
const rateLimitMap = new Map<string, RateRecord>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = rateLimitMap.get(ip);
  if (!rec || now - rec.windowStart > WINDOW_MS) {
    rateLimitMap.set(ip, { failures: 0, windowStart: now });
    return false;
  }
  return rec.failures >= MAX_FAILURES;
}

function recordFailure(ip: string): void {
  const now = Date.now();
  const rec = rateLimitMap.get(ip);
  if (!rec || now - rec.windowStart > WINDOW_MS) {
    rateLimitMap.set(ip, { failures: 1, windowStart: now });
  } else {
    rec.failures++;
  }
}

function clearFailures(ip: string): void {
  rateLimitMap.delete(ip);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  const { password } = await req.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: "Admin password not configured" }, { status: 500 });
  }

  // Timing-safe comparison to prevent timing attacks
  const inputHash = createHash("sha256").update(String(password)).digest();
  const adminHash = createHash("sha256").update(adminPassword).digest();

  if (inputHash.length === adminHash.length && timingSafeEqual(inputHash, adminHash)) {
    clearFailures(ip);
    return NextResponse.json({ success: true });
  }

  recordFailure(ip);
  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}
