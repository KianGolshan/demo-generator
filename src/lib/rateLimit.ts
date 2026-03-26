/**
 * Simple in-memory rate limiter.
 * Works on persistent Node servers (Railway, Render, Fly).
 * Not suitable for edge functions or multi-instance deployments.
 *
 * Usage:
 *   const allowed = rateLimit("generate", userId, { max: 5, windowMs: 60_000 });
 *   if (!allowed) return 429;
 */

interface Bucket {
  count:     number;
  resetAt:   number;
}

const store = new Map<string, Bucket>();

// Prune stale entries every 10 minutes to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  store.forEach((bucket, key) => {
    if (bucket.resetAt < now) store.delete(key);
  });
}, 10 * 60 * 1000);

/**
 * Returns true if the request is allowed, false if rate-limited.
 *
 * @param namespace - Logical grouping (e.g. "generate", "analyze")
 * @param userId    - Per-user key
 * @param options   - max requests per windowMs
 */
export function rateLimit(
  namespace: string,
  userId: string,
  { max, windowMs }: { max: number; windowMs: number }
): boolean {
  const key = `${namespace}:${userId}`;
  const now = Date.now();

  const bucket = store.get(key);

  if (!bucket || bucket.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= max) return false;

  bucket.count++;
  return true;
}
