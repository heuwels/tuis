import { test, expect } from "@playwright/test";

test.describe.serial("Unit preferences", () => {
  test.afterAll(async ({ request }) => {
    // Reset back to metric
    await request.patch("/api/household-settings", {
      data: { measurementSystem: "metric" },
    });
  });

  test("settings page shows Measurement Units card", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Measurement Units")).toBeVisible();
  });

  test("defaults to metric", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const metricRadio = page.getByRole("radio", { name: /metric/i }).first();
    await expect(metricRadio).toBeChecked();
  });

  test("can switch to imperial", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const imperialRadio = page.getByRole("radio", { name: /imperial/i }).first();
    await imperialRadio.check();
    await page.waitForLoadState("networkidle");

    // Verify persisted via API
    const res = await page.request.get("/api/household-settings");
    const data = await res.json();
    expect(data.measurementSystem).toBe("imperial");
  });

  test("preference persists after reload", async ({ page }) => {
    // Set imperial first
    await page.request.patch("/api/household-settings", {
      data: { measurementSystem: "imperial" },
    });

    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const imperialRadio = page.getByRole("radio", { name: /imperial/i }).first();
    await expect(imperialRadio).toBeChecked();
  });

  test("can switch back to metric", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const metricRadio = page.getByRole("radio", { name: /metric/i }).first();
    await metricRadio.check();
    await page.waitForLoadState("networkidle");

    const res = await page.request.get("/api/household-settings");
    const data = await res.json();
    expect(data.measurementSystem).toBe("metric");
  });
});
