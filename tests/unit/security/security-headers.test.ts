import { describe, it, expect } from "vitest";
import nextConfig from "../../../next.config.mjs";

describe("Production Security Headers (Step 5)", () => {
  it("should configure strict security headers in next.config.mjs", async () => {
    expect(nextConfig.headers).toBeDefined();
    expect(typeof nextConfig.headers).toBe("function");

    const headerConfigs = await nextConfig.headers!();
    expect(Array.isArray(headerConfigs)).toBe(true);

    const globalHeaders = headerConfigs.find((h: any) => h.source === "/:path*");
    expect(globalHeaders).toBeDefined();

    const headersMap = new Map<string, string>();
    for (const h of (globalHeaders as any).headers) {
      headersMap.set(String(h.key), String(h.value));
    }

    // 1. Content Security Policy
    expect(headersMap.has("Content-Security-Policy")).toBe(true);
    const csp = headersMap.get("Content-Security-Policy")!;
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("https://*.clerk.accounts.dev");

    // 2. MIME sniffing protection
    expect(headersMap.get("X-Content-Type-Options")).toBe("nosniff");

    // 3. Clickjacking / Frame protection
    expect(headersMap.get("X-Frame-Options")).toBe("DENY");

    // 4. Referrer policy
    expect(headersMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");

    // 5. Permissions policy
    expect(headersMap.has("Permissions-Policy")).toBe(true);
    const permissions = headersMap.get("Permissions-Policy")!;
    expect(permissions).toContain("camera=()");
    expect(permissions).toContain("microphone=()");

    // 6. Strict Transport Security (HSTS)
    expect(headersMap.has("Strict-Transport-Security")).toBe(true);
    expect(headersMap.get("Strict-Transport-Security")).toContain("max-age=63072000");
  });
});
