import "server-only";
import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Admin auth without a user table: a successful password check issues an
 * HMAC-signed, httpOnly cookie. Write routes verify the signature, so the
 * browser can no longer bypass the check by flipping a client-side flag.
 */

export const SESSION_COOKIE = "lyrics_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

function secret(): string {
  const value = process.env.ADMIN_PASSWORD;
  if (!value) throw new Error("ADMIN_PASSWORD is not set");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function verifyPassword(input: unknown): boolean {
  const admin = process.env.ADMIN_PASSWORD;
  if (!admin) return false;
  const a = createHash("sha256").update(String(input ?? "")).digest();
  const b = createHash("sha256").update(admin).digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSessionToken(now = Date.now()): string {
  const payload = `v1.${now + SESSION_MAX_AGE * 1000}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;

  const [, expiry, signature] = parts;
  const expected = sign(`v1.${expiry}`);
  const given = Buffer.from(signature, "utf8");
  const want = Buffer.from(expected, "utf8");
  if (given.length !== want.length || !timingSafeEqual(given, want)) return false;

  const expiresAt = Number(expiry);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

/** True when the request carries a valid, unexpired admin cookie. */
export function isAuthenticated(req: NextRequest): boolean {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

// ---------------------------------------------------------------------------
// In-memory rate limiter: 5 failures per 15 minutes per IP.
// Resets on restart and is per-instance (serverless), so it raises the cost of
// brute force rather than making it impossible. Move to Redis/Upstash if the
// app is ever shared publicly.
// ---------------------------------------------------------------------------

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

interface RateRecord {
  failures: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateRecord>();

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function isRateLimited(ip: string, now = Date.now()): boolean {
  const rec = rateLimitMap.get(ip);
  if (!rec || now - rec.windowStart > WINDOW_MS) {
    rateLimitMap.set(ip, { failures: 0, windowStart: now });
    return false;
  }
  return rec.failures >= MAX_FAILURES;
}

export function recordFailure(ip: string, now = Date.now()): void {
  const rec = rateLimitMap.get(ip);
  if (!rec || now - rec.windowStart > WINDOW_MS) {
    rateLimitMap.set(ip, { failures: 1, windowStart: now });
  } else {
    rec.failures += 1;
  }
}

export function clearFailures(ip: string): void {
  rateLimitMap.delete(ip);
}
