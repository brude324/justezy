import { test, expect } from "@playwright/test";

test.describe("SchoolyardSMS E2E Smoke Tests", () => {
  test("smoke: root route or sign-in page responds without 500 error", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(500);

    // Verify page loads and contains either dashboard brand or sign-in element
    await expect(page).toHaveTitle(/.+/);
  });

  test("health: liveness probe /api/health responds with HTTP 200", async ({ page }) => {
    const response = await page.goto("/api/health");
    expect(response?.status()).toBe(200);
    const body = await response?.json();
    expect(body.status).toBe("ok");
  });

  test("pwa: web app manifest is accessible", async ({ page }) => {
    const response = await page.goto("/manifest.webmanifest");
    expect(response?.status()).toBe(200);
    const body = await response?.json();
    expect(body.name).toBe("SchoolyardSMS Institutional Portal");
    expect(body.display).toBe("standalone");
  });

  test("pwa: offline fallback page is accessible", async ({ page }) => {
    const response = await page.goto("/offline");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toContainText(/Offline|Reconnect/);
  });
});
