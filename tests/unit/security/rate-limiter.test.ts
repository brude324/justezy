import { describe, it, expect, beforeEach } from "vitest";
import { SlidingWindowRateLimiter } from "../../../src/lib/security/rate-limiter";

describe("Sliding Window Rate Limiter (Step 5)", () => {
  let limiter: SlidingWindowRateLimiter;

  beforeEach(() => {
    limiter = new SlidingWindowRateLimiter({
      maxRequests: 3,
      windowMs: 1000,
    });
  });

  it("should permit requests within rate limit quota", () => {
    const res1 = limiter.check("ip_1");
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.check("ip_1");
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.check("ip_1");
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("should throttle and reject requests exceeding rate limit quota", () => {
    limiter.check("ip_abuser");
    limiter.check("ip_abuser");
    limiter.check("ip_abuser");

    const blockedRes = limiter.check("ip_abuser");
    expect(blockedRes.success).toBe(false);
    expect(blockedRes.remaining).toBe(0);

    const headers = SlidingWindowRateLimiter.getHeaders(blockedRes);
    expect(headers["X-RateLimit-Limit"]).toBe("3");
    expect(headers["X-RateLimit-Remaining"]).toBe("0");
    expect(Number(headers["X-RateLimit-Reset"])).toBeGreaterThan(0);
  });

  it("should track distinct clients/IPs independently", () => {
    limiter.check("client_a");
    limiter.check("client_a");
    limiter.check("client_a");

    // client_a is exhausted
    expect(limiter.check("client_a").success).toBe(false);

    // client_b is untouched
    const resB = limiter.check("client_b");
    expect(resB.success).toBe(true);
    expect(resB.remaining).toBe(2);
  });

  it("should reset client quota when reset is invoked", () => {
    limiter.check("client_c");
    limiter.check("client_c");
    limiter.check("client_c");
    expect(limiter.check("client_c").success).toBe(false);

    limiter.reset();

    const freshRes = limiter.check("client_c");
    expect(freshRes.success).toBe(true);
    expect(freshRes.remaining).toBe(2);
  });
});
