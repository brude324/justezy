import { test, expect } from "@playwright/test";

test.describe("V1 Academics & V2 Wave 2 Admissions E2E Flows", () => {
  test.describe("Admissions Navigation & Core Views", () => {
    test("admissions: overview view renders", async ({ page }) => {
      const response = await page.goto("/admissions");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("admissions: enquiries view renders", async ({ page }) => {
      const response = await page.goto("/admissions/enquiries");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("admissions: applications view renders", async ({ page }) => {
      const response = await page.goto("/admissions/applications");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("admissions: interviews view renders", async ({ page }) => {
      const response = await page.goto("/admissions/interviews");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("admissions: offers view renders", async ({ page }) => {
      const response = await page.goto("/admissions/offers");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("admissions: reports view renders", async ({ page }) => {
      const response = await page.goto("/admissions/reports");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });
  });

  test.describe("V1 Academic Core Views & Navigation", () => {
    test("academics: teachers list renders", async ({ page }) => {
      const response = await page.goto("/list/teachers");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("academics: students list renders", async ({ page }) => {
      const response = await page.goto("/list/students");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("academics: parents list renders", async ({ page }) => {
      const response = await page.goto("/list/parents");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("academics: subjects list renders", async ({ page }) => {
      const response = await page.goto("/list/subjects");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("academics: classes list renders", async ({ page }) => {
      const response = await page.goto("/list/classes");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("academics: lessons list renders", async ({ page }) => {
      const response = await page.goto("/list/lessons");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("academics: exams list renders", async ({ page }) => {
      const response = await page.goto("/list/exams");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("academics: assignments list renders", async ({ page }) => {
      const response = await page.goto("/list/assignments");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("academics: results list renders", async ({ page }) => {
      const response = await page.goto("/list/results");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("academics: attendance list renders", async ({ page }) => {
      const response = await page.goto("/list/attendance");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("academics: events list renders", async ({ page }) => {
      const response = await page.goto("/list/events");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("academics: announcements list renders", async ({ page }) => {
      const response = await page.goto("/list/announcements");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("academics: messages list renders", async ({ page }) => {
      const response = await page.goto("/list/messages");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("user: profile view renders", async ({ page }) => {
      const response = await page.goto("/profile");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("user: settings view renders", async ({ page }) => {
      const response = await page.goto("/settings");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });

    test("user: logout view renders", async ({ page }) => {
      const response = await page.goto("/logout");
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
    });
  });
});
