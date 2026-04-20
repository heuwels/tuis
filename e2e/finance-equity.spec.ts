import { test, expect, Page } from "@playwright/test";

const TEST_PREFIX = "E2E Test";
const TEST_ADDRESS = `${TEST_PREFIX} ${Date.now()} St`;

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

async function cleanupTestProperties(request: import("@playwright/test").APIRequestContext) {
  try {
    const res = await request.get("/api/finance/properties");
    const properties = await res.json();
    for (const prop of properties) {
      if (prop.address.startsWith(TEST_PREFIX)) {
        await request.delete(`/api/finance/properties/${prop.id}`);
      }
    }
  } catch {
    console.warn("Cleanup failed for finance properties");
  }
}

test.beforeAll(async ({ request }) => {
  await cleanupTestProperties(request);
});

test.afterAll(async ({ request }) => {
  await cleanupTestProperties(request);
});

test.describe("Property & Equity", () => {
  test.describe.serial("Property & Equity CRUD", () => {
    test("should show property setup prompt", async ({ page }) => {
      await page.goto("/finance", { waitUntil: "networkidle" });
      await dismissUserPickerIfVisible(page);

      // The Equity tab is the default, so we should see either the setup prompt
      // (Add Property button) or the equity overview if a property already exists
      await expect(
        page.getByRole("button", { name: "Add Property" })
      ).toBeVisible({ timeout: 15000 });
    });

    test("should create a property", async ({ page }) => {
      await page.goto("/finance", { waitUntil: "networkidle" });
      await dismissUserPickerIfVisible(page);

      // Click Add Property
      await page.getByRole("button", { name: "Add Property" }).click();

      // Wait for dialog
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Add Property" })
      ).toBeVisible();

      // Fill in form fields
      await dialog.locator("#address").fill(TEST_ADDRESS);
      await dialog.locator("#purchasePrice").fill("500000");
      await dialog.locator("#purchaseDate").fill("2025-01-01");
      await dialog.locator("#loanAmountOriginal").fill("400000");

      // Submit
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/finance/properties") &&
          resp.request().method() === "POST"
      );
      await dialog.getByRole("button", { name: "Add Property" }).click();
      await responsePromise;

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Wait for page to refresh with property data
      await page.waitForLoadState("networkidle");

      // The address should now appear somewhere on the page or the equity overview loads
      // After property creation, the equity overview shows metric cards
      await expect(
        page.getByText("No equity data available").or(page.getByText("Current Value"))
      ).toBeVisible({ timeout: 10000 });
    });

    test("should add a mortgage payment", async ({ page }) => {
      await page.goto("/finance", { waitUntil: "networkidle" });
      await dismissUserPickerIfVisible(page);

      // Click Payments tab
      await page.locator("button").filter({ hasText: "Payments" }).click();

      // Wait for Payments tab content to load
      await page.waitForLoadState("networkidle");

      // Click Add Payment
      await page.getByRole("button", { name: "Add Payment" }).click();

      // Wait for dialog
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Fill in payment form
      await dialog.locator("#pay-date").fill("2025-10-01");
      await dialog.locator("#pay-amount").fill("2500");
      await dialog.locator("#pay-interest").fill("2100");
      await dialog.locator("#pay-principal").fill("400");

      // Submit
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/payments") &&
          resp.request().method() === "POST"
      );
      await dialog.getByRole("button", { name: "Add Payment" }).click();
      await responsePromise;

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
      await page.waitForLoadState("networkidle");

      // Payment amount should appear in the list
      await expect(page.getByText("$2,500.00").first()).toBeVisible({
        timeout: 10000,
      });
    });

    test("should add a valuation", async ({ page }) => {
      await page.goto("/finance", { waitUntil: "networkidle" });
      await dismissUserPickerIfVisible(page);

      // Click Payments tab
      await page.locator("button").filter({ hasText: "Payments" }).click();
      await page.waitForLoadState("networkidle");

      // Click Add Valuation
      await page.getByRole("button", { name: "Add Valuation" }).click();

      // Wait for dialog
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Fill in valuation form
      await dialog.locator("#val-date").fill("2025-10-01");
      await dialog.locator("#val-value").fill("520000");
      await dialog.locator("#val-source").fill("Bank");

      // Submit
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/valuations") &&
          resp.request().method() === "POST"
      );
      await dialog.getByRole("button", { name: "Add Valuation" }).click();
      await responsePromise;

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
      await page.waitForLoadState("networkidle");

      // Valuation amount should appear in the list
      await expect(page.getByText("$520,000.00").first()).toBeVisible({
        timeout: 10000,
      });
    });

    test("should display equity metrics", async ({ page }) => {
      await page.goto("/finance", { waitUntil: "networkidle" });
      await dismissUserPickerIfVisible(page);

      // Equity tab is the default — wait for data to load
      await expect(page.getByText("Loading equity data...")).not.toBeVisible({
        timeout: 15000,
      });

      // Verify the four metric cards are visible
      await expect(page.getByText("Current Value")).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText("Loan Balance").first()).toBeVisible();
      await expect(page.getByText("Total Equity").first()).toBeVisible();
      await expect(page.getByText("LVR").first()).toBeVisible();
    });
  });
});
