import { test, expect, Page } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const TEST_VEHICLE_NAME = `E2E Fuel Delete ${Date.now()}`;

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
  await cleanupTestData(request, "vehicles", "E2E Fuel Delete%");
});

test.describe("Fuel Log Delete", () => {
  test.describe.serial("Delete fuel log from vehicle", () => {
    test("should create a vehicle and add a fuel log", async ({ page }) => {
      await page.goto("/vehicles");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading vehicles...")).not.toBeVisible({
        timeout: 10000,
      });

      // Create vehicle
      await page.getByRole("button", { name: /Add.*Vehicle/ }).first().click();
      const formDialog = page.getByRole("dialog");
      await expect(formDialog).toBeVisible();

      await formDialog.getByLabel("Name").fill(TEST_VEHICLE_NAME);

      const createResponse = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/vehicles") &&
          resp.request().method() === "POST"
      );
      await formDialog.getByRole("button", { name: "Add Vehicle" }).click();
      await createResponse;
      await expect(formDialog).not.toBeVisible({ timeout: 5000 });
      await page.waitForLoadState("networkidle");

      // Open the vehicle detail
      await page.getByText(TEST_VEHICLE_NAME).first().click();
      const detailDialog = page.getByRole("dialog");
      await expect(detailDialog).toBeVisible({ timeout: 5000 });

      // Switch to Fuel tab
      await detailDialog.getByRole("button", { name: "Fuel" }).click();

      // Open the inline fuel form
      await detailDialog.getByRole("button", { name: "Add Fuel" }).click();

      // The form uses Label without htmlFor, so locate inputs by type
      const fuelForm = detailDialog.locator("form");
      await expect(fuelForm).toBeVisible({ timeout: 5000 });

      const dateInput = fuelForm.locator('input[type="date"]');
      await dateInput.fill("2026-01-15");

      const numberInputs = fuelForm.locator('input[type="number"]');
      await numberInputs.nth(0).fill("10000"); // Odometer
      await numberInputs.nth(1).fill("40");    // Litres
      await numberInputs.nth(2).fill("80");    // Total Cost

      const fuelResponse = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/vehicles/") &&
          resp.url().includes("/fuel") &&
          resp.request().method() === "POST"
      );
      await fuelForm.getByRole("button", { name: "Add" }).click();
      await fuelResponse;
      await page.waitForLoadState("networkidle");

      // Verify fuel log appears
      await expect(detailDialog.getByText("$80.00").first()).toBeVisible({
        timeout: 5000,
      });
    });

    test("should delete the fuel log", async ({ page }) => {
      await page.goto("/vehicles");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading vehicles...")).not.toBeVisible({
        timeout: 10000,
      });

      // Open vehicle detail
      await page.getByText(TEST_VEHICLE_NAME).first().click();
      const detailDialog = page.getByRole("dialog");
      await expect(detailDialog).toBeVisible({ timeout: 5000 });

      // Switch to Fuel tab
      await detailDialog.getByRole("button", { name: "Fuel" }).click();

      // Verify fuel log is visible
      await expect(detailDialog.getByText("$80.00").first()).toBeVisible({
        timeout: 5000,
      });

      // Set up confirm dialog handler
      page.on("dialog", async (d) => {
        await d.accept();
      });

      // Click the delete (trash) button on the fuel log
      const deleteResponse = page.waitForResponse(
        (resp) =>
          resp.url().includes("/fuel/") &&
          resp.request().method() === "DELETE"
      );
      // The trash button is the icon button next to the cost badge
      await detailDialog
        .locator("button")
        .filter({ has: page.locator("svg.lucide-trash-2") })
        .first()
        .click();
      await deleteResponse;
      await page.waitForLoadState("networkidle");

      // Fuel log should be gone
      await expect(
        detailDialog.getByText("No fuel logs yet.")
      ).toBeVisible({ timeout: 5000 });
    });
  });
});
