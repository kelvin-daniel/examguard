import { headers } from "next/headers";

/**
 * Small in-process rate limiter for the auth and join endpoints.
 *
 * Scope, honestly stated: this lives in the memory of a single serverless
 * instance, so it resets on cold start and isn't shared between concurrent
 * instances. That's a deliberate trade for a free-tier deployment — it costs
 * nothing and no extra database writes, while still stopping the case that
 * actually matters here: one client hammering login, password-reset or join
 * in a tight loop. It is not a defence against a distributed attack; if this
 * ever needs that, move the counter into Turso or a KV store behind the same
 * `rateLimit()` signature.
 */

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();
let lastSweep = 0;

/** Drop expired buckets so the map can't grow without bound. */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, hit] of buckets) {
    if (hit.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the caller may retry. Only meaningful when ok is false. */
  retryAfter: number;
};

/**
 * Fixed-window limiter. Returns ok:false once `limit` calls for the same key
 * have happened inside `windowMs`.
 */
export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const hit = buckets.get(key);
  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  hit.count += 1;
  if (hit.count > limit) {
    return { ok: false, retryAfter: Math.ceil((hit.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** Clear a key's counter — call after a success so good users aren't punished. */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Best-effort client IP from the proxy headers Vercel sets. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

/** 429 body + Retry-After header, shaped like the app's other error responses. */
export function tooManyRequests(retryAfter: number, message: string) {
  return Response.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
