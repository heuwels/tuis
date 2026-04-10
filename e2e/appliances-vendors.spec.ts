import { test, expect, Page } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const TEST_APPLIANCE_NAME = `E2E Appliance ${Date.now()}`;
const TEST_VENDOR_NAME = `E2E Vendor ${Date.now()}`;

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
  await cleanupTestData(request, "appliances", "E2E Appliance%");
  await cleanupTestData(request, "vendors", "E2E Vendor%");
});

test.describe("Appliance Management", () => {
  test.describe.serial("Appliance CRUD", () => {
    test("should navigate to appliances page", async ({ page }) => {
      await page.goto("/appliances");
      await dismissUserPickerIfVisible(page);

      await expect(
        page.getByRole("heading", { name: "Appliances" }).first()
      ).toBeVisible();

      // Wait for loading
      await expect(page.getByText("Loading appliances...")).not.toBeVisible({
        timeout: 10000,
      });
    });

    test("should create a new appliance", async ({ page }) => {
      await page.goto("/appliances");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading appliances...")).not.toBeVisible({
        timeout: 10000,
      });

      // Click Add Appliance
      await page.getByRole("button", { name: "Add Appliance" }).click();

      // Wait for dialog
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Add Appliance" })
      ).toBeVisible();

      // Fill in the form
      await dialog.getByLabel("Name").fill(TEST_APPLIANCE_NAME);

      // Select location
      const locationTrigger = dialog
        .locator("button")
        .filter({ hasText: "Select location" });
      if (await locationTrigger.isVisible().catch(() => false)) {
        await locationTrigger.click();
        await page.getByRole("option", { name: "Kitchen" }).click();
      }

      // Fill brand
      await dialog.getByLabel("Brand").fill("TestBrand");

      // Fill model
      await dialog.getByLabel("Model").fill("TB-2024");

      // Fill notes
      await dialog.getByLabel("Notes").fill("Test appliance for E2E testing");

      // Submit
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/appliances") &&
          resp.request().method() === "POST"
      );
      await dialog
        .getByRole("button", { name: "Add Appliance" })
        .click();
      await responsePromise;

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Appliance should appear
      await expect(page.getByText(TEST_APPLIANCE_NAME)).toBeVisible({
        timeout: 5000,
      });
    });

    test("should view appliance in the list", async ({ page }) => {
      await page.goto("/appliances");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading appliances...")).not.toBeVisible({
        timeout: 10000,
      });

      // Appliance name should be visible
      await expect(page.getByText(TEST_APPLIANCE_NAME)).toBeVisible();

      // Search for the appliance
      const searchInput = page.getByPlaceholder("Search appliances...");
      await searchInput.fill(TEST_APPLIANCE_NAME);
      await page.waitForTimeout(500);
      await expect(page.getByText(TEST_APPLIANCE_NAME)).toBeVisible();

      // Clear search
      await searchInput.clear();
    });

    test("should filter appliances by location", async ({ page }) => {
      await page.goto("/appliances");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading appliances...")).not.toBeVisible({
        timeout: 10000,
      });

      // Click Kitchen filter
      const kitchenFilter = page.getByRole("button", { name: "Kitchen" }).first();
      if (await kitchenFilter.isVisible().catch(() => false)) {
        await kitchenFilter.click();
        await page.waitForLoadState("networkidle");

        // Our appliance should still be visible
        await expect(page.getByText(TEST_APPLIANCE_NAME)).toBeVisible();

        // Click All to reset
        await page.getByRole("button", { name: "All Locations" }).click();
      }
    });

    test("should view appliance details", async ({ page }) => {
      await page.goto("/appliances");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading appliances...")).not.toBeVisible({
        timeout: 10000,
      });

      // Click on the appliance card
      await page.getByText(TEST_APPLIANCE_NAME).click();

      // Detail dialog should appear
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Should show appliance details
      await expect(dialog.getByText(TEST_APPLIANCE_NAME)).toBeVisible();
      await expect(dialog.getByText("TestBrand")).toBeVisible();

      // Close dialog
      await dialog.locator("button").filter({ has: page.locator("svg.lucide-x") }).click();
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    });

    test("should clean up test appliance", async ({ page }) => {
      await page.goto("/appliances");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading appliances...")).not.toBeVisible({
        timeout: 10000,
      });

      // Click on the appliance to open details
      await page.getByText(TEST_APPLIANCE_NAME).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Click delete
      const deleteBtn = dialog.getByRole("button", { name: "Delete" });
      if (await deleteBtn.isVisible().catch(() => false)) {
        page.on("dialog", async (d) => {
          await d.accept();
        });

        await deleteBtn.click();
        await page.waitForLoadState("networkidle");
      }
    });
  });
});

test.describe("Vendor Management", () => {
  test.describe.serial("Vendor CRUD", () => {
    test("should navigate to vendors page", async ({ page }) => {
      await page.goto("/vendors");
      await dismissUserPickerIfVisible(page);

      await expect(
        page.getByRole("heading", { name: "Vendors" }).first()
      ).toBeVisible();

      await expect(page.getByText("Loading vendors...")).not.toBeVisible({
        timeout: 10000,
      });
    });

    test("should create a new vendor", async ({ page }) => {
      await page.goto("/vendors");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading vendors...")).not.toBeVisible({
        timeout: 10000,
      });

      // Click Add Vendor
      await page.getByRole("button", { name: "Add Vendor" }).click();

      // Wait for dialog
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Add Vendor" })
      ).toBeVisible();

      // Fill in the form
      await dialog.getByLabel("Name").fill(TEST_VENDOR_NAME);

      // Select category
      const categoryTrigger = dialog
        .locator("button")
        .filter({ hasText: "Select category" });
      if (await categoryTrigger.isVisible().catch(() => false)) {
        await categoryTrigger.click();
        await page.getByRole("option", { name: "Plumber" }).click();
      }

      // Fill phone
      await dialog.getByLabel("Phone").fill("555-123-4567");

      // Fill email
      await dialog.getByLabel("Email").fill("test@example.com");

      // Fill notes
      await dialog.getByLabel("Notes").fill("Test vendor for E2E testing");

      // Submit
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/vendors") &&
          resp.request().method() === "POST"
      );
      await dialog.getByRole("button", { name: "Add Vendor" }).click();
      await responsePromise;

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Vendor should appear
      await expect(page.getByText(TEST_VENDOR_NAME)).toBeVisible({
        timeout: 5000,
      });
    });

    test("should view vendor in the list and search", async ({ page }) => {
      await page.goto("/vendors");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading vendors...")).not.toBeVisible({
        timeout: 10000,
      });

      // Vendor name should be visible
      await expect(page.getByText(TEST_VENDOR_NAME)).toBeVisible();

      // Search for the vendor
      const searchInput = page.getByPlaceholder("Search vendors...");
      await searchInput.fill(TEST_VENDOR_NAME);
      await page.waitForTimeout(500);
      await expect(page.getByText(TEST_VENDOR_NAME)).toBeVisible();
    });

    test("should filter vendors by category", async ({ page }) => {
      await page.goto("/vendors");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading vendors...")).not.toBeVisible({
        timeout: 10000,
      });

      // Click Plumber filter
      const plumberFilter = page.getByRole("button", { name: "Plumber" });
      if (await plumberFilter.isVisible().catch(() => false)) {
        await plumberFilter.click();
        await page.waitForLoadState("networkidle");

        // Our vendor should still be visible
        await expect(page.getByText(TEST_VENDOR_NAME)).toBeVisible();

        // Reset to All
        // The "All" button in the category filter section
        const allFilter = page
          .locator("div.flex.flex-wrap.gap-2")
          .getByRole("button", { name: "All" });
        if (await allFilter.isVisible().catch(() => false)) {
          await allFilter.click();
        }
      }
    });

    test("should view vendor details", async ({ page }) => {
      await page.goto("/vendors");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading vendors...")).not.toBeVisible({
        timeout: 10000,
      });

      // Click on the vendor card
      await page.getByText(TEST_VENDOR_NAME).click();

      // Detail dialog should appear
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Should show vendor details
      await expect(dialog.getByText(TEST_VENDOR_NAME)).toBeVisible();
      await expect(dialog.getByText("555-123-4567")).toBeVisible();

      // Close dialog
      await dialog.locator("button").filter({ has: page.locator("svg.lucide-x") }).click();
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    });

    test("should clean up test vendor", async ({ page }) => {
      await page.goto("/vendors");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading vendors...")).not.toBeVisible({
        timeout: 10000,
      });

      // Click on the vendor to open details
      await page.getByText(TEST_VENDOR_NAME).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Click delete
      const deleteBtn = dialog.getByRole("button", { name: "Delete" });
      if (await deleteBtn.isVisible().catch(() => false)) {
        page.on("dialog", async (d) => {
          await d.accept();
        });

        await deleteBtn.click();
        await page.waitForLoadState("networkidle");
      }
    });
  });
});
