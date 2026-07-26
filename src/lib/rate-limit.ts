// Simple in-memory fixed-window rate limiter, keyed by an arbitrary string
// (e.g. `signup:<ip>`). Returns true if the request is allowed, false if the
// caller is over the limit for the current window.
//
// NOTE: in-memory only. On serverless (Vercel) each instance has its own map,
// so the effective limit is N× per running instance and resets on cold start.
// This is a speed bump, not an authoritative limiter — replace with a shared
// store (Turso/Upstash) before it needs to hold under real load. See PLAN.md P1.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= max) return false;

  bucket.count++;
  return true;
}

/** Best-effort client IP from proxy headers (Vercel sets `x-forwarded-for`). */
export function ipFromHeaders(headers?: Headers | null): string {
  const fwd = headers?.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers?.get("x-real-ip") ?? "unknown";
}

export function clientIp(req: { headers: Headers }): string {
  return ipFromHeaders(req.headers);
}
