import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const SCREENSHOT_DIR = path.join(process.cwd(), "docs", "screenshots");

async function dismissUserPickerIfVisible(page: Page) {
  await page.waitForLoadState("networkidle");
  const dialog = page.getByRole("dialog");
  const isVisible = await dialog.isVisible().catch(() => false);
  if (isVisible) {
    const heading = dialog.getByRole("heading");
    const text = await heading.textContent().catch(() => "");
    if (text === "Who are you?" || text === "Switch User") {
      const userButton = dialog.locator("button").first();
      if (await userButton.isVisible().catch(() => false)) {
        await userButton.click();
        await expect(dialog).not.toBeVisible({ timeout: 3000 });
      }
    }
  }
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: false,
  });
}

async function screenshotFullPage(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

test.describe("Feature Screenshots", () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test("Dashboard", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    // Wait for stats to load
    await page.waitForTimeout(1500);
    await screenshot(page, "01-dashboard");
  });

  test("Dashboard - mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await screenshot(page, "01-dashboard-mobile");
  });

  test("Tasks", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await screenshot(page, "02-tasks");
  });

  test("Tasks - mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await screenshot(page, "02-tasks-mobile");
  });

  test("Shopping Lists", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/shopping");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await screenshot(page, "03-shopping");
  });

  test("Shopping List Detail", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/shopping");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    // Click first shopping list card
    const firstCard = page.locator("[class*='cursor-pointer']").first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await screenshot(page, "03-shopping-detail");
    }
  });

  test("Meals", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/meals");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await screenshot(page, "04-meals");
  });

  test("Meals - mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/meals");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await screenshot(page, "04-meals-mobile");
  });

  test("Recipes", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await screenshot(page, "05-recipes");
  });

  test("Recipe Detail", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    // Click first recipe card
    const firstCard = page.locator("[class*='cursor-pointer']").first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await page.waitForTimeout(800);
      await screenshot(page, "05-recipe-detail");
    }
  });

  test("Appliances", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/appliances");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await screenshot(page, "06-appliances");
  });

  test("Appliance Detail", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/appliances");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    const firstCard = page.locator("[class*='cursor-pointer']").first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await page.waitForTimeout(800);
      await screenshot(page, "06-appliance-detail");
    }
  });

  test("Vendors", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/vendors");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await screenshot(page, "07-vendors");
  });

  test("Vendor Detail", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/vendors");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    const firstCard = page.locator("[class*='cursor-pointer']").first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await page.waitForTimeout(800);
      await screenshot(page, "07-vendor-detail");
    }
  });

  test("Quotes", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/quotes");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await screenshot(page, "08-quotes");
  });

  test("Quotes - mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/quotes");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await screenshot(page, "08-quotes-mobile");
  });

  test("Quote Detail", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/quotes");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    // Click first quote row
    const firstRow = page.locator("[class*='cursor-pointer']").first();
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click();
      await page.waitForTimeout(800);
      await screenshot(page, "08-quote-detail");
    }
  });

  test("Together", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/together");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await screenshot(page, "09-together");
  });

  test("Stats", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/stats");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await screenshot(page, "10-stats");
  });

  test("Settings", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/settings");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await screenshot(page, "11-settings");
  });
});
