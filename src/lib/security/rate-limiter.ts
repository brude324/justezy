/**
 * Sliding Window Rate Limiter Foundation
 *
 * Provides abuse protection for critical public endpoints (e.g. Clerk webhooks,
 * authentication-adjacent endpoints, file upload requests).
 *
 * Note on horizontal scaling:
 * In a multi-node production deployment, this in-memory sliding window provides node-level
 * defense-in-depth. For cluster-wide enforcement, plug in Redis via Upstash/ioredis
 * following the documented operational runbook.
 */

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export class SlidingWindowRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private lastCleanup = Date.now();
  private readonly cleanupIntervalMs = 60_000; // 1 minute

  constructor(private defaultConfig: RateLimitConfig = { maxRequests: 60, windowMs: 60_000 }) {}

  /**
   * Checks whether the given key is allowed under rate limiting rules.
   */
  check(key: string, config: RateLimitConfig = this.defaultConfig): RateLimitResult {
    const now = Date.now();
    this.evictExpiredKeys(now);

    const windowStart = now - config.windowMs;
    let record = this.store.get(key);

    if (!record) {
      record = { timestamps: [] };
      this.store.set(key, record);
    }

    // Filter timestamps within current window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    const isAllowed = record.timestamps.length < config.maxRequests;
    if (isAllowed) {
      record.timestamps.push(now);
    }

    const remaining = Math.max(0, config.maxRequests - record.timestamps.length);
    const oldestTimestamp = record.timestamps[0] || now;
    const resetAt = Math.ceil((oldestTimestamp + config.windowMs) / 1000);

    return {
      success: isAllowed,
      limit: config.maxRequests,
      remaining,
      resetAt,
    };
  }

  /**
   * Periodically cleans up keys with no active timestamps in the window to prevent memory leaks.
   */
  private evictExpiredKeys(now: number): void {
    if (now - this.lastCleanup < this.cleanupIntervalMs) {
      return;
    }
    this.lastCleanup = now;

    this.store.forEach((record, key) => {
      record.timestamps = record.timestamps.filter((ts: number) => ts > now - this.defaultConfig.windowMs);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    });
  }

  /**
   * Generates standard HTTP rate limit headers.
   */
  static getHeaders(result: RateLimitResult): Record<string, string> {
    return {
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(result.resetAt),
    };
  }

  /**
   * Resets the store (primarily for test environments).
   */
  reset(): void {
    this.store.clear();
  }
}

// Global singletons for abuse-sensitive surfaces
export const webhookRateLimiter = new SlidingWindowRateLimiter({
  maxRequests: 120, // 120 webhook events per minute
  windowMs: 60_000,
});

export const apiRateLimiter = new SlidingWindowRateLimiter({
  maxRequests: 60, // 60 requests per minute per IP/client
  windowMs: 60_000,
});
