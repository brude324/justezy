import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("PWA Security & Isolation Invariants (Step 5)", () => {
  const rootDir = process.cwd();

  it("should have a valid web app manifest with standalone display and secure theme", () => {
    const manifestPath = path.join(rootDir, "public", "manifest.webmanifest");
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(manifestContent.name).toBe("SchoolyardSMS Institutional Portal");
    expect(manifestContent.display).toBe("standalone");
    expect(manifestContent.theme_color).toBe("#0284c7");
    expect(manifestContent.start_url).toBe("/");
    expect(manifestContent.icons.length).toBeGreaterThanOrEqual(2);
  });

  it("should enforce strict cache boundaries in service worker", () => {
    const swPath = path.join(rootDir, "public", "sw.js");
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, "utf-8");

    // 1. Must handle CLEAR_TENANT_CACHE message for logout / tenant switch cache purging
    expect(swContent).toContain("CLEAR_TENANT_CACHE");

    // 2. Must strictly exclude /api/ routes from caching
    expect(swContent).toContain('url.pathname.startsWith("/api/")');

    // 3. Must never intercept non-GET mutation requests
    expect(swContent).toContain('request.method !== "GET"');

    // 4. Must fall back to /offline for navigation requests
    expect(swContent).toContain('cache.match("/offline")');
  });

  it("should have an offline fallback route", () => {
    const offlinePagePath = path.join(rootDir, "src", "app", "offline", "page.tsx");
    expect(fs.existsSync(offlinePagePath)).toBe(true);

    const pageContent = fs.readFileSync(offlinePagePath, "utf-8");
    expect(pageContent).toContain("Attendance and marks cannot be modified offline");
  });
});
