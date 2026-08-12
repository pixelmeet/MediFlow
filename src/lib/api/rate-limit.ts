/**
 * In-memory sliding-window rate limiter.
 *
 * Keyed by `IP:routeName`. Each entry tracks hit timestamps within the window.
 * This is a development/single-instance stopgap. For multi-instance production
 * deployments, replace the `store` Map with Upstash Redis (same interface).
 *
 * Usage:
 *   const { allowed, retryAfter } = rateLimit(request, { limit: 5, windowMs: 60_000 });
 *   if (!allowed) return rateLimitResponse(retryAfter);
 */

import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/utils";

interface RateLimitEntry {
  hits: number[];   // timestamps (ms) of requests within the current window
}

// Single Map for all routes. Key = `${ip}:${routeName}`
const store = new Map<string, RateLimitEntry>();

// Periodic cleanup: drop entries older than 1 hour to prevent unbounded growth.
// This runs at module load and once per hour after that.
function scheduleCleanup() {
  setInterval(() => {
    const cutoff = Date.now() - 60 * 60 * 1000; // 1 hour
    for (const [key, entry] of store.entries()) {
      entry.hits = entry.hits.filter((t) => t > cutoff);
      if (entry.hits.length === 0) store.delete(key);
    }
  }, 60 * 60 * 1000);
}

if (typeof setInterval !== "undefined") {
  scheduleCleanup();
}

/**
 * Extract client IP from Next.js request headers.
 * Checks X-Forwarded-For (Vercel / proxied), then falls back to "unknown".
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  // Next.js edge/node doesn't expose raw socket IP via Request — "unknown" is safe for dev
  return "unknown";
}

export interface RateLimitOptions {
  /** Max requests allowed in `windowMs`. */
  limit: number;
  /** Time window in milliseconds. */
  windowMs: number;
  /**
   * Optional custom key suffix (e.g. userId) to namespace limits per user.
   * Defaults to client IP.
   */
  identifier?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the oldest request falls out of the window. Only set when !allowed. */
  retryAfter?: number;
  /** How many requests remain in this window. */
  remaining: number;
}

/**
 * Check and record a rate-limit hit.
 * Call at the start of every route handler that should be limited.
 */
export function rateLimit(
  request: Request,
  routeName: string,
  options: RateLimitOptions
): RateLimitResult {
  const { limit, windowMs, identifier } = options;
  const ip = identifier ?? getClientIp(request);
  const key = `${ip}:${routeName}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const entry = store.get(key) ?? { hits: [] };

  // Slide: keep only hits within the current window
  entry.hits = entry.hits.filter((t) => t > windowStart);

  if (entry.hits.length >= limit) {
    store.set(key, entry);
    const oldestHit = entry.hits[0];
    const retryAfter = Math.ceil((oldestHit + windowMs - now) / 1000);
    return { allowed: false, retryAfter, remaining: 0 };
  }

  entry.hits.push(now);
  store.set(key, entry);

  return { allowed: true, remaining: limit - entry.hits.length };
}

/**
 * Convenience helper: returns a 429 NextResponse with Retry-After header.
 */
export function rateLimitResponse(retryAfter?: number): NextResponse {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (retryAfter != null) {
    headers["Retry-After"] = String(retryAfter);
  }
  return NextResponse.json(
    errorResponse(
      "RATE_LIMIT_EXCEEDED",
      retryAfter
        ? `Too many requests. Please try again in ${retryAfter} second(s).`
        : "Too many requests. Please slow down."
    ),
    { status: 429, headers }
  );
}
