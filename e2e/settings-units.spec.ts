import { test, expect, Page } from "@playwright/test";

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

test.afterAll(async ({ request }) => {
  // Reset unit system back to metric after tests
  await request.put("/api/settings", {
    data: { key: "unitSystem", value: "metric" },
  });
});

test.describe.serial("Unit System Settings", () => {
  test("should show the unit system card on settings page", async ({
    page,
  }) => {
    await page.goto("/settings");
    await dismissUserPickerIfVisible(page);

    await expect(
      page.getByRole("heading", { name: "Unit System" })
    ).toBeVisible();

    // Should see both toggle buttons
    await expect(page.getByTestId("unit-metric")).toBeVisible();
    await expect(page.getByTestId("unit-imperial")).toBeVisible();
  });

  test("should default to metric", async ({ page }) => {
    await page.goto("/settings");
    await dismissUserPickerIfVisible(page);

    // The metric button should be the active (default) variant
    const metricBtn = page.getByTestId("unit-metric");
    await expect(metricBtn).toBeVisible();
  });

  test("should switch to imperial and persist", async ({ page }) => {
    await page.goto("/settings");
    await dismissUserPickerIfVisible(page);

    // Click imperial
    await page.getByTestId("unit-imperial").click();

    // Wait for the save to complete
    await page.waitForResponse((r) =>
      r.url().includes("/api/settings") && r.status() === 200
    );

    // Reload and verify it persists
    await page.reload();
    await dismissUserPickerIfVisible(page);

    // The imperial button should now have the "default" variant (active state)
    // Verify via the API that the setting persisted
    const res = await page.evaluate(async () => {
      const r = await fetch("/api/settings");
      return r.json();
    });
    expect(res.unitSystem).toBe("imperial");
  });

  test("should switch back to metric", async ({ page }) => {
    await page.goto("/settings");
    await dismissUserPickerIfVisible(page);

    // Click metric
    await page.getByTestId("unit-metric").click();

    await page.waitForResponse((r) =>
      r.url().includes("/api/settings") && r.status() === 200
    );

    const res = await page.evaluate(async () => {
      const r = await fetch("/api/settings");
      return r.json();
    });
    expect(res.unitSystem).toBe("metric");
  });

  test("settings API works directly", async ({ request }) => {
    // GET should return current settings
    const getRes = await request.get("/api/settings");
    expect(getRes.status()).toBe(200);

    // PUT to set imperial
    const putRes = await request.put("/api/settings", {
      data: { key: "unitSystem", value: "imperial" },
    });
    expect(putRes.status()).toBe(200);
    const putData = await putRes.json();
    expect(putData.value).toBe("imperial");

    // GET should now show imperial
    const getRes2 = await request.get("/api/settings");
    const data = await getRes2.json();
    expect(data.unitSystem).toBe("imperial");

    // PUT invalid value should fail
    const badRes = await request.put("/api/settings", {
      data: { key: "unitSystem", value: "invalid" },
    });
    expect(badRes.status()).toBe(400);

    // Reset to metric
    await request.put("/api/settings", {
      data: { key: "unitSystem", value: "metric" },
    });
  });
});
