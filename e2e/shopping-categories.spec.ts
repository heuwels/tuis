import { test, expect, Page } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const TEST_LIST_NAME = `E2E Categories ${Date.now()}`;

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
  await cleanupTestData(request, "shopping", "E2E Categories%");
});

test.describe.serial("Shopping List Category Grouping", () => {
  test("should create a list and add items that get auto-categorized", async ({
    page,
  }) => {
    await page.goto("/shopping");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");

    // Create a new list
    const createListBtn = page.getByRole("button", { name: "Create List" });
    const plusBtn = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-plus") })
      .first();

    if (await createListBtn.isVisible().catch(() => false)) {
      await createListBtn.click();
    } else {
      await plusBtn.click();
    }

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Name").fill(TEST_LIST_NAME);

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/shopping/lists") &&
        resp.request().method() === "POST"
    );
    await dialog.getByRole("button", { name: "Create" }).click();
    await responsePromise;
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await page.waitForLoadState("networkidle");

    // Select our list
    const selectTrigger = page.locator("button[role='combobox']").first();
    if (await selectTrigger.isVisible().catch(() => false)) {
      await selectTrigger.click();
      const listOption = page.getByRole("option", {
        name: new RegExp(TEST_LIST_NAME),
      });
      if (await listOption.isVisible().catch(() => false)) {
        await listOption.click();
      }
    }
    await page.waitForLoadState("networkidle");

    // Add items from different categories
    const addInput = page.getByPlaceholder("Add item...");

    // Add a dairy item
    await addInput.fill("Milk");
    await addInput.press("Enter");
    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/shopping/items") &&
        resp.request().method() === "POST"
    );

    // Add a bakery item
    await addInput.fill("Bread");
    await addInput.press("Enter");
    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/shopping/items") &&
        resp.request().method() === "POST"
    );

    // Add a meat item
    await addInput.fill("Chicken");
    await addInput.press("Enter");
    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/shopping/items") &&
        resp.request().method() === "POST"
    );

    // Wait for items to render
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Verify category section headers appear
    await expect(page.getByText("Dairy").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Bakery").first()).toBeVisible();
    await expect(page.getByText("Meat & Seafood").first()).toBeVisible();

    // Verify items are visible
    await expect(page.getByText("Milk")).toBeVisible();
    await expect(page.getByText("Bread")).toBeVisible();
    await expect(page.getByText("Chicken")).toBeVisible();
  });

  test("should allow manual category change via dropdown", async ({
    page,
  }) => {
    await page.goto("/shopping");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");

    // Select our test list
    const selectTrigger = page.locator("button[role='combobox']").first();
    if (await selectTrigger.isVisible().catch(() => false)) {
      await selectTrigger.click();
      const listOption = page.getByRole("option", {
        name: new RegExp(TEST_LIST_NAME),
      });
      if (await listOption.isVisible().catch(() => false)) {
        await listOption.click();
        await page.waitForLoadState("networkidle");
      }
    }

    // Find the Milk item row and hover to reveal the category dropdown
    const milkRow = page
      .locator("div.flex.items-center", { hasText: "Milk" })
      .first();
    await milkRow.hover();

    // Click the category select within the milk row
    const categoryTrigger = milkRow.locator("button[role='combobox']");
    if (await categoryTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await categoryTrigger.click();

      // Select "Frozen" category
      const frozenOption = page.getByRole("option", { name: "Frozen" });
      if (await frozenOption.isVisible().catch(() => false)) {
        const updatePromise = page.waitForResponse(
          (resp) =>
            resp.url().includes("/api/shopping/items/") &&
            resp.request().method() === "PUT"
        );
        await frozenOption.click();
        await updatePromise;

        // Wait for re-render
        await page.waitForTimeout(500);

        // Verify "Frozen" section header now appears
        await expect(page.getByText("Frozen").first()).toBeVisible({
          timeout: 5000,
        });
      }
    }
  });

  test("should show category badges on items", async ({ page }) => {
    await page.goto("/shopping");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");

    // Select our test list
    const selectTrigger = page.locator("button[role='combobox']").first();
    if (await selectTrigger.isVisible().catch(() => false)) {
      await selectTrigger.click();
      const listOption = page.getByRole("option", {
        name: new RegExp(TEST_LIST_NAME),
      });
      if (await listOption.isVisible().catch(() => false)) {
        await listOption.click();
        await page.waitForLoadState("networkidle");
      }
    }

    // Verify that category badges are rendered (small colored spans)
    // The Bread item should have a "Bakery" badge
    const breadRow = page
      .locator("div.flex.items-center", { hasText: "Bread" })
      .first();
    const bakeryBadge = breadRow.locator("span.rounded-full", {
      hasText: "Bakery",
    });
    await expect(bakeryBadge).toBeVisible({ timeout: 5000 });
  });
});
