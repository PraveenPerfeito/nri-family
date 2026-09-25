/**
 * Fixed-window rate limiter held in memory.
 *
 * Suitable for a single instance / Phase 1 traffic. On serverless or
 * multi-instance hosting, swap `store` for a shared store (e.g. Redis) —
 * the `RateLimiter` interface stays the same.
 */
export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number };

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

export function createRateLimiter(options: { limit: number; windowMs: number; now?: () => number }): RateLimiter {
  const store = new Map<string, { count: number; resetAt: number }>();
  const now = options.now ?? Date.now;

  return {
    check(key) {
      const time = now();
      // Opportunistic cleanup so the map cannot grow without bound.
      if (store.size > 5000) {
        for (const [k, v] of store) if (v.resetAt <= time) store.delete(k);
      }

      const entry = store.get(key);
      if (!entry || entry.resetAt <= time) {
        const resetAt = time + options.windowMs;
        store.set(key, { count: 1, resetAt });
        return { allowed: true, remaining: options.limit - 1, resetAt };
      }

      entry.count += 1;
      return {
        allowed: entry.count <= options.limit,
        remaining: Math.max(0, options.limit - entry.count),
        resetAt: entry.resetAt,
      };
    },
  };
}
