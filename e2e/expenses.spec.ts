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

test.describe("Expense Summary", () => {
  test.describe.serial("Expenses page", () => {
    test("should navigate to expenses page", async ({ page }) => {
      await page.goto("/stats/expenses");
      await dismissUserPickerIfVisible(page);

      await expect(
        page.getByRole("heading", { name: "Expenses" }).first()
      ).toBeVisible();

      // Wait for loading to finish
      await expect(page.getByText("Loading expenses...")).not.toBeVisible({
        timeout: 10000,
      });
    });

    test("should display spending total and period selector", async ({
      page,
    }) => {
      await page.goto("/stats/expenses");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading expenses...")).not.toBeVisible({
        timeout: 10000,
      });

      // Period selector buttons should be visible
      await expect(page.getByRole("button", { name: "Monthly" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Yearly" })).toBeVisible();

      // Total spending label should be visible
      await expect(page.getByText("Total spending").first()).toBeVisible();
    });

    test("should switch between monthly and yearly view", async ({ page }) => {
      await page.goto("/stats/expenses");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading expenses...")).not.toBeVisible({
        timeout: 10000,
      });

      // Click Yearly button
      await page.getByRole("button", { name: "Yearly" }).click();

      // Wait for data to reload
      await expect(page.getByText("Loading expenses...")).not.toBeVisible({
        timeout: 10000,
      });

      // Should now show yearly view label
      await expect(page.getByText("yearly view").first()).toBeVisible();

      // Switch back to Monthly
      await page.getByRole("button", { name: "Monthly" }).click();
      await expect(page.getByText("Loading expenses...")).not.toBeVisible({
        timeout: 10000,
      });

      await expect(page.getByText("monthly view").first()).toBeVisible();
    });

    test("should show empty state or data sections", async ({ page }) => {
      await page.goto("/stats/expenses");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading expenses...")).not.toBeVisible({
        timeout: 10000,
      });

      // Should show either category data or an empty-state message
      const hasCategories = await page
        .getByText("Maintenance")
        .first()
        .isVisible()
        .catch(() => false);
      const hasEmptyState = await page
        .getByText("No expense data recorded yet")
        .isVisible()
        .catch(() => false);
      const hasNoExpenses = await page
        .getByText("No expenses this month")
        .isVisible()
        .catch(() => false);

      // At least one of these should be true
      expect(hasCategories || hasEmptyState || hasNoExpenses).toBeTruthy();
    });

    test("should show vendor and vehicle sections", async ({ page }) => {
      await page.goto("/stats/expenses");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading expenses...")).not.toBeVisible({
        timeout: 10000,
      });

      // Both section headings should be visible
      await expect(page.getByText("Top Vendors").first()).toBeVisible();
      await expect(page.getByText("Vehicle Costs").first()).toBeVisible();
    });

    test("should have link back to stats", async ({ page }) => {
      await page.goto("/stats/expenses");
      await dismissUserPickerIfVisible(page);
      await expect(page.getByText("Loading expenses...")).not.toBeVisible({
        timeout: 10000,
      });

      const backLink = page.getByRole("link", { name: "Back to Statistics" });
      await expect(backLink).toBeVisible();
      await backLink.click();

      // Should navigate to stats page
      await expect(page).toHaveURL(/\/stats$/);
    });
  });

  test.describe.serial("Expenses on stats page", () => {
    test("should have expense summary link on stats page", async ({ page }) => {
      await page.goto("/stats");
      await dismissUserPickerIfVisible(page);

      // Should have a link to the expense summary
      const expenseLink = page.getByRole("link", { name: /Expense Summary/ });
      await expect(expenseLink).toBeVisible({ timeout: 10000 });

      await expenseLink.click();
      await expect(page).toHaveURL(/\/stats\/expenses/);
    });
  });

  test.describe.serial("Expense widget on dashboard", () => {
    test("should show expense widget on dashboard", async ({ page }) => {
      await page.goto("/");
      await dismissUserPickerIfVisible(page);

      // The expense widget should be visible
      await expect(
        page.getByText("Spending This Month").first()
      ).toBeVisible({ timeout: 10000 });
    });

    test("should link to expenses page from widget", async ({ page }) => {
      await page.goto("/");
      await dismissUserPickerIfVisible(page);

      // Click on the widget
      const widget = page.getByText("Spending This Month").first();
      await expect(widget).toBeVisible({ timeout: 10000 });
      await widget.click();

      // Should navigate to expenses page
      await expect(page).toHaveURL(/\/stats\/expenses/);
    });
  });
});
