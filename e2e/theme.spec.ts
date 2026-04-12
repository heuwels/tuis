import { test, expect } from "@playwright/test";

test.describe("Theme toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("tuis-theme"));
    await page.reload();
  });

  test("switching to dark mode adds dark class", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("tuis-theme", "dark"));
    await page.reload();
    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    expect(hasDark).toBe(true);
  });

  test("switching to light mode removes dark class", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("tuis-theme", "dark"));
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);

    await page.evaluate(() => localStorage.setItem("tuis-theme", "light"));
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false);
  });

  test("theme persists across navigation", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("tuis-theme", "dark"));
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);

    await page.goto("/settings");
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
  });

  test("theme persists across reload", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("tuis-theme", "dark"));
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);

    await page.reload();
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem("tuis-theme"))).toBe("dark");
  });
});
