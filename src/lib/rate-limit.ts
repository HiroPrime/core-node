export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

type Bucket = { count: number; resetAt: number };

/** Per-process window. On serverless this limits each instance, which is what we can do without a shared store. */
export function createRateLimiter(max: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();

  return function rateLimit(key: string, now = Date.now()): RateLimitResult {
    const current = buckets.get(key);
    if (!current || now >= current.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      if (buckets.size > 5000) {
        for (const [bucketKey, bucket] of buckets) {
          if (bucket.resetAt <= now) buckets.delete(bucketKey);
        }
      }
      return { ok: true };
    }

    if (current.count >= max) {
      return {
        ok: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      };
    }

    current.count += 1;
    return { ok: true };
  };
}

/** Explore pings are one-shot. 30/minute/IP stops a flood without blocking a person clicking through the Grid. */
export const EXPLORE_LIMIT = 30;
export const EXPLORE_WINDOW_MS = 60_000;

export const limitExplore = createRateLimiter(EXPLORE_LIMIT, EXPLORE_WINDOW_MS);

export function clientAddress(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}
