import { test, expect, Page } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const TEST_QUOTE_DESC = `E2E Quote ${Date.now()}`;
const TEST_QUOTE_TOTAL = "1500";

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
  await cleanupTestData(request, "quotes", "E2E Quote%");
});

test.describe("Quote Management", () => {
  test.describe.serial("Quote CRUD", () => {
    test("should navigate to quotes page", async ({ page }) => {
      await page.goto("/quotes");
      await dismissUserPickerIfVisible(page);

      await expect(
        page.getByRole("heading", { name: "Quotes" }).first()
      ).toBeVisible();

      // Wait for loading to finish
      await expect(page.getByText("Loading quotes...")).not.toBeVisible({
        timeout: 10000,
      });
    });

    test("should create a new quote", async ({ page }) => {
      await page.goto("/quotes");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading quotes...")).not.toBeVisible({
        timeout: 10000,
      });

      // Click Add Quote
      await page.getByRole("button", { name: "Add Quote" }).click();

      // Wait for dialog
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Add Quote" })
      ).toBeVisible();

      // Fill in description
      await dialog.getByLabel("Description").fill(TEST_QUOTE_DESC);

      // Fill in total
      await dialog.getByLabel("Total Amount ($)").fill(TEST_QUOTE_TOTAL);

      // Fill in labour
      await dialog.getByLabel("Labour ($)").fill("800");

      // Fill in materials
      await dialog.getByLabel("Materials ($)").fill("700");

      // Fill in notes
      await dialog.getByLabel("Notes").fill("Test quote for E2E testing");

      // Submit
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/quotes") &&
          resp.request().method() === "POST"
      );
      await dialog.getByRole("button", { name: "Add Quote" }).click();
      await responsePromise;

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Quote should appear in the list
      await expect(page.getByText(TEST_QUOTE_DESC)).toBeVisible({
        timeout: 5000,
      });
    });

    test("should view quote in the list", async ({ page }) => {
      await page.goto("/quotes");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading quotes...")).not.toBeVisible({
        timeout: 10000,
      });

      // Quote description should be visible
      await expect(page.getByText(TEST_QUOTE_DESC)).toBeVisible();

      // Total should be visible (formatted as AUD currency)
      await expect(page.getByText("$1,500")).toBeVisible();

      // Status badge should show Pending
      await expect(page.getByText("Pending").first()).toBeVisible();
    });

    test("should view quote detail dialog", async ({ page }) => {
      await page.goto("/quotes");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading quotes...")).not.toBeVisible({
        timeout: 10000,
      });

      // Click on the quote row to open detail
      await page.getByText(TEST_QUOTE_DESC).first().click();

      // Detail dialog should appear
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Should show quote description as title
      await expect(dialog.getByText(TEST_QUOTE_DESC)).toBeVisible();

      // Should show total amount
      await expect(dialog.getByText("Total Amount")).toBeVisible();

      // Should show cost breakdown
      await expect(dialog.getByText("Cost Breakdown")).toBeVisible();
      await expect(dialog.getByText("Labour")).toBeVisible();
      await expect(dialog.getByText("Materials")).toBeVisible();

      // Should show notes
      await expect(
        dialog.getByText("Test quote for E2E testing")
      ).toBeVisible();

      // Should show Accept and Reject buttons (since status is pending)
      await expect(
        dialog.getByRole("button", { name: "Accept Quote" })
      ).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "Reject Quote" })
      ).toBeVisible();

      // Close dialog
      await dialog
        .locator("button")
        .filter({ has: page.locator("svg.lucide-x") })
        .click();
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    });

    test("should change quote status to accepted", async ({ page }) => {
      await page.goto("/quotes");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading quotes...")).not.toBeVisible({
        timeout: 10000,
      });

      // Click on the quote to open detail
      await page.getByText(TEST_QUOTE_DESC).first().click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Click Accept Quote
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/quotes/") &&
          resp.request().method() === "PUT"
      );
      await dialog
        .getByRole("button", { name: "Accept Quote" })
        .click();
      await responsePromise;

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Wait for list to refresh
      await page.waitForLoadState("networkidle");

      // Status should now show Accepted
      await expect(page.getByText("Accepted").first()).toBeVisible({
        timeout: 5000,
      });
    });

    test("should edit a quote", async ({ page }) => {
      await page.goto("/quotes");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading quotes...")).not.toBeVisible({
        timeout: 10000,
      });

      // Click on the quote to open detail
      await page.getByText(TEST_QUOTE_DESC).first().click();

      const detailDialog = page.getByRole("dialog");
      await expect(detailDialog).toBeVisible({ timeout: 5000 });

      // Click Edit button
      await detailDialog.getByRole("button", { name: "Edit" }).click();

      // Detail dialog should close and edit form should open
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      const editDialog = page.getByRole("dialog");
      await expect(
        editDialog.getByRole("heading", { name: "Edit Quote" })
      ).toBeVisible();

      // Update the notes
      await editDialog.getByLabel("Notes").fill("Updated via E2E test");

      // Submit
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/quotes/") &&
          resp.request().method() === "PUT"
      );
      await editDialog
        .getByRole("button", { name: "Save Changes" })
        .click();
      await responsePromise;

      // Dialog should close
      await expect(editDialog).not.toBeVisible({ timeout: 5000 });
    });

    test("should delete a quote", async ({ page }) => {
      await page.goto("/quotes");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading quotes...")).not.toBeVisible({
        timeout: 10000,
      });

      // Click on the quote to open detail
      await page.getByText(TEST_QUOTE_DESC).first().click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Set up dialog handler for confirm
      page.on("dialog", async (d) => {
        await d.accept();
      });

      // Click Delete
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/quotes/") &&
          resp.request().method() === "DELETE"
      );
      await dialog.getByRole("button", { name: "Delete" }).click();
      await responsePromise;

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Wait for list to refresh
      await page.waitForLoadState("networkidle");

      // Quote should no longer be visible
      await expect(page.getByText(TEST_QUOTE_DESC)).not.toBeVisible({
        timeout: 5000,
      });
    });
  });
});
