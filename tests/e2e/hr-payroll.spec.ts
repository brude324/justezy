import { test, expect } from "@playwright/test";

test.describe("V2 Wave 5: HR & Payroll E2E Flows", () => {
  test.describe("Module Entitlement Gating & Access Control", () => {
    test("hr: route renders or enforces module entitlement check", async ({ page }) => {
      const response = await page.goto("/hr");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("payroll: route renders or enforces module entitlement check", async ({ page }) => {
      const response = await page.goto("/payroll");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });
  });

  test.describe("HR Navigation & Core Views", () => {
    test("hr: staff directory view renders", async ({ page }) => {
      const response = await page.goto("/hr/employees");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("hr: departments view renders", async ({ page }) => {
      const response = await page.goto("/hr/departments");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("hr: designations view renders", async ({ page }) => {
      const response = await page.goto("/hr/designations");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("hr: contracts view renders", async ({ page }) => {
      const response = await page.goto("/hr/contracts");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("hr: leave management view renders", async ({ page }) => {
      const response = await page.goto("/hr/leave");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("hr: holidays view renders", async ({ page }) => {
      const response = await page.goto("/hr/holidays");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("hr: reports view renders", async ({ page }) => {
      const response = await page.goto("/hr/reports");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });
  });

  test.describe("Payroll Navigation & Core Views", () => {
    test("payroll: periods view renders", async ({ page }) => {
      const response = await page.goto("/payroll/periods");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("payroll: runs view renders", async ({ page }) => {
      const response = await page.goto("/payroll/runs");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("payroll: staff salary view renders", async ({ page }) => {
      const response = await page.goto("/payroll/employees");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("payroll: salary structures view renders", async ({ page }) => {
      const response = await page.goto("/payroll/salary-structures");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("payroll: adjustments view renders", async ({ page }) => {
      const response = await page.goto("/payroll/adjustments");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("payroll: payslips view renders", async ({ page }) => {
      const response = await page.goto("/payroll/payslips");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("payroll: reports view renders", async ({ page }) => {
      const response = await page.goto("/payroll/reports");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });
  });
});
