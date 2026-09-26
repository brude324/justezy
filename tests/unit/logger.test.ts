import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, sanitizeLogData } from "@/lib/logger";

describe("Structured Logger & Secret Sanitization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sanitizeLogData", () => {
    it("should redact sensitive fields matching prohibited keywords", () => {
      const sensitivePayload = {
        userId: "usr_123",
        password: "SuperSecretPassword123!",
        apiKey: "live_secret_key_456",
        sessionToken: "jwt.header.payload.signature",
        nested: {
          authorization: "Bearer eyJhbGciOi...",
          cookie: "session_id=abc; path=/",
          clerk_secret_key: "sk_test_123",
          safeField: "safe value",
        },
      };

      const sanitized = sanitizeLogData(sensitivePayload) as Record<string, unknown>;

      expect(sanitized.userId).toBe("usr_123");
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.apiKey).toBe("[REDACTED]");
      expect(sanitized.sessionToken).toBe("[REDACTED]");

      const nested = sanitized.nested as Record<string, unknown>;
      expect(nested.authorization).toBe("[REDACTED]");
      expect(nested.cookie).toBe("[REDACTED]");
      expect(nested.clerk_secret_key).toBe("[REDACTED]");
      expect(nested.safeField).toBe("safe value");
    });

    it("should redact bearer tokens embedded inside raw string messages", () => {
      const message = "Request failed with Authorization: Bearer abc123def456ghi789 in header";
      const sanitized = sanitizeLogData(message);
      expect(sanitized).toBe("Request failed with Authorization: Bearer [REDACTED] in header");
    });

    it("should handle null and undefined safely", () => {
      expect(sanitizeLogData(null)).toBeNull();
      expect(sanitizeLogData(undefined)).toBeUndefined();
    });

    it("should traverse and sanitize arrays", () => {
      const list = [
        { name: "John", password: "p1" },
        { name: "Jane", token: "t2" },
      ];
      const sanitized = sanitizeLogData(list) as Array<Record<string, unknown>>;
      expect(sanitized[0].name).toBe("John");
      expect(sanitized[0].password).toBe("[REDACTED]");
      expect(sanitized[1].token).toBe("[REDACTED]");
    });
  });

  describe("logger methods", () => {
    it("should invoke console.info for info messages", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      logger.info("User logged in", { userId: "usr_123" });
      expect(spy).toHaveBeenCalled();
    });

    it("should invoke console.error for error messages", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      logger.error("Database connection lost", { tenantId: "tenant_abc" });
      expect(spy).toHaveBeenCalled();
    });

    it("should invoke console.warn for warn messages", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      logger.warn("Rate limit approaching", { rate: "95%" });
      expect(spy).toHaveBeenCalled();
    });
  });
});
