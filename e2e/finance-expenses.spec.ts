import { test, expect, Page } from "@playwright/test";

const TEST_PREFIX = "E2E Expense";
const TEST_EXPENSE_A = `${TEST_PREFIX} ${Date.now()} A`;
const TEST_EXPENSE_B = `${TEST_PREFIX} ${Date.now()} B`;
const TEST_EXPENSE_EDITED = `${TEST_PREFIX} ${Date.now()} Edited`;

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
  try {
    const res = await request.get("/api/finance/expenses");
    const expenses = await res.json();
    for (const exp of expenses) {
      if (exp.description.startsWith(TEST_PREFIX)) {
        await request.delete(`/api/finance/expenses/${exp.id}`);
      }
    }
  } catch {
    console.warn("Cleanup failed for finance expenses");
  }
});

test.describe("Household Expenses", () => {
  test.describe.serial("Expense CRUD", () => {
    test("should show empty state on finance page", async ({ page }) => {
      await page.goto("/finance");
      await dismissUserPickerIfVisible(page);

      await expect(
        page.getByRole("heading", { name: "Finance" }).first()
      ).toBeVisible();

      // Wait for loading to finish
      await expect(page.getByText("Loading expenses...")).not.toBeVisible({
        timeout: 10000,
      });

      // The page should render (either empty state or existing expenses)
      await expect(page.locator("body")).toBeVisible();
    });

    test("should create an expense", async ({ page }) => {
      await page.goto("/finance");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading expenses...")).not.toBeVisible({
        timeout: 10000,
      });

      // Click Add Expense
      await page.getByRole("button", { name: "Add Expense" }).first().click();

      // Wait for dialog
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Add Expense" })
      ).toBeVisible();

      // Fill in date
      await dialog.getByLabel("Date").fill("2026-01-15");

      // Fill in category
      await dialog.getByLabel("Category").fill("Insurance");

      // Fill in description
      await dialog.getByLabel("Description").fill(TEST_EXPENSE_A);

      // Fill in amount
      await dialog.getByLabel("Amount").fill("250.00");

      // Submit
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/finance/expenses") &&
          resp.request().method() === "POST"
      );
      await dialog.getByRole("button", { name: "Add Expense" }).click();
      await responsePromise;

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Wait for list to refresh
      await page.waitForLoadState("networkidle");

      // Expense should appear in the list
      await expect(page.getByText(TEST_EXPENSE_A).first()).toBeVisible({
        timeout: 10000,
      });
    });

    test("should filter by category", async ({ page }) => {
      // First, create a second expense in a different category
      await page.goto("/finance");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading expenses...")).not.toBeVisible({
        timeout: 10000,
      });

      await page.getByRole("button", { name: "Add Expense" }).first().click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      await dialog.getByLabel("Date").fill("2026-01-16");
      await dialog.getByLabel("Category").fill("Utilities");
      await dialog.getByLabel("Description").fill(TEST_EXPENSE_B);
      await dialog.getByLabel("Amount").fill("120.00");

      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/finance/expenses") &&
          resp.request().method() === "POST"
      );
      await dialog.getByRole("button", { name: "Add Expense" }).click();
      await responsePromise;

      await expect(dialog).not.toBeVisible({ timeout: 5000 });
      await page.waitForLoadState("networkidle");

      // Both expenses should be visible
      await expect(page.getByText(TEST_EXPENSE_A).first()).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText(TEST_EXPENSE_B).first()).toBeVisible();

      // Click "Insurance" category filter
      await page.getByRole("button", { name: "Insurance" }).click();
      await expect(page.getByText(TEST_EXPENSE_A).first()).toBeVisible();
      await expect(page.getByText(TEST_EXPENSE_B)).not.toBeVisible({
        timeout: 3000,
      });

      // Click "Utilities" category filter
      await page.getByRole("button", { name: "Utilities" }).click();
      await expect(page.getByText(TEST_EXPENSE_B).first()).toBeVisible();
      await expect(page.getByText(TEST_EXPENSE_A)).not.toBeVisible({
        timeout: 3000,
      });

      // Click "All" to reset
      await page.getByRole("button", { name: "All" }).click();
      await expect(page.getByText(TEST_EXPENSE_A).first()).toBeVisible();
      await expect(page.getByText(TEST_EXPENSE_B).first()).toBeVisible();
    });

    test("should edit an expense", async ({ page }) => {
      await page.goto("/finance");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading expenses...")).not.toBeVisible({
        timeout: 10000,
      });

      // Find the row containing our expense and click its edit button
      const row = page.locator(".divide-y > div").filter({ hasText: TEST_EXPENSE_A });
      await row.locator("button:has(svg.lucide-pencil)").first().click();

      // Wait for edit dialog
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(
        dialog.getByRole("heading", { name: "Edit Expense" })
      ).toBeVisible();

      // Change description and amount
      await dialog.getByLabel("Description").fill(TEST_EXPENSE_EDITED);
      await dialog.getByLabel("Amount").fill("300.00");

      // Submit
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/finance/expenses/") &&
          resp.request().method() === "PUT"
      );
      await dialog.getByRole("button", { name: "Save Changes" }).click();
      await responsePromise;

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Wait for list to refresh
      await page.waitForLoadState("networkidle");

      // Updated expense should appear
      await expect(page.getByText(TEST_EXPENSE_EDITED).first()).toBeVisible({
        timeout: 10000,
      });
    });

    test("should delete an expense", async ({ page }) => {
      await page.goto("/finance");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading expenses...")).not.toBeVisible({
        timeout: 10000,
      });

      // Verify the expense is visible before deleting
      await expect(
        page.getByText(TEST_EXPENSE_EDITED).first()
      ).toBeVisible();

      // Set up dialog handler for confirm
      page.on("dialog", async (d) => {
        await d.accept();
      });

      // Find the row and click delete
      const row = page
        .locator(".divide-y > div")
        .filter({ hasText: TEST_EXPENSE_EDITED });
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/finance/expenses/") &&
          resp.request().method() === "DELETE"
      );
      await row.locator("button:has(svg.lucide-trash-2)").first().click();
      await responsePromise;

      // Wait for list to refresh after delete
      await page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/finance/expenses") &&
          resp.request().method() === "GET"
      );

      // Expense should no longer be visible
      await expect(page.getByText(TEST_EXPENSE_EDITED)).not.toBeVisible({
        timeout: 10000,
      });
    });
  });
});
