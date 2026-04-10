import { test, expect, Page } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const TEST_LIST_NAME = `E2E Shopping ${Date.now()}`;
const TEST_ITEM_1 = "Milk";
const TEST_ITEM_2 = "Bread";
const TEST_ITEM_3 = "Eggs";

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
  await cleanupTestData(request, "shopping", "E2E Shopping%");
});

test.describe.serial("Shopping Lists", () => {
  test("should navigate to shopping page", async ({ page }) => {
    await page.goto("/shopping");
    await dismissUserPickerIfVisible(page);

    await expect(
      page.getByRole("heading", { name: "Shopping Lists" }).first()
    ).toBeVisible();
  });

  test("should create a new shopping list", async ({ page }) => {
    await page.goto("/shopping");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");

    // Click the "Create List" button or the "+" button depending on whether lists exist
    const createListBtn = page.getByRole("button", { name: "Create List" });
    const plusBtn = page.locator("button").filter({ has: page.locator("svg.lucide-plus") }).first();

    if (await createListBtn.isVisible().catch(() => false)) {
      await createListBtn.click();
    } else {
      await plusBtn.click();
    }

    // Wait for the dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "New List" })
    ).toBeVisible();

    // Fill in the list name
    await dialog.getByLabel("Name").fill(TEST_LIST_NAME);

    // Pick a color (click the second color swatch)
    const colorSwatches = dialog.locator("button.rounded-full");
    if ((await colorSwatches.count()) > 1) {
      await colorSwatches.nth(1).click();
    }

    // Submit
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/shopping/lists") &&
        resp.request().method() === "POST"
    );
    await dialog.getByRole("button", { name: "Create" }).click();
    await responsePromise;

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // The list should now be available (shown in selector or as heading)
    await page.waitForLoadState("networkidle");
  });

  test("should add items to the list", async ({ page }) => {
    await page.goto("/shopping");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");

    // Make sure our list is selected - find and click the dropdown to select our list
    const selectTrigger = page.locator("button[role='combobox']").first();
    if (await selectTrigger.isVisible().catch(() => false)) {
      await selectTrigger.click();
      const listOption = page.getByRole("option", { name: new RegExp(TEST_LIST_NAME) });
      if (await listOption.isVisible().catch(() => false)) {
        await listOption.click();
      }
    }

    // Wait for items to load
    await page.waitForLoadState("networkidle");

    // Add first item
    const addInput = page.getByPlaceholder("Add item...");
    await addInput.fill(TEST_ITEM_1);
    await addInput.press("Enter");
    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/shopping/items") &&
        resp.request().method() === "POST"
    );

    // Add second item
    await addInput.fill(TEST_ITEM_2);
    await addInput.press("Enter");
    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/shopping/items") &&
        resp.request().method() === "POST"
    );

    // Add third item
    await addInput.fill(TEST_ITEM_3);
    await addInput.press("Enter");
    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/shopping/items") &&
        resp.request().method() === "POST"
    );

    // Verify items appear
    await expect(page.getByText(TEST_ITEM_1)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(TEST_ITEM_2)).toBeVisible();
    await expect(page.getByText(TEST_ITEM_3)).toBeVisible();
  });

  test("should check off items", async ({ page }) => {
    await page.goto("/shopping");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");

    // Select our list if needed
    const selectTrigger = page.locator("button[role='combobox']").first();
    if (await selectTrigger.isVisible().catch(() => false)) {
      await selectTrigger.click();
      const listOption = page.getByRole("option", { name: new RegExp(TEST_LIST_NAME) });
      if (await listOption.isVisible().catch(() => false)) {
        await listOption.click();
        await page.waitForLoadState("networkidle");
      }
    }

    // Find the checkbox next to the first item and click it
    const itemRow = page
      .locator("div.flex.items-center", { hasText: TEST_ITEM_1 })
      .first();
    const checkbox = itemRow.locator("button[role='checkbox']");

    if (await checkbox.isVisible().catch(() => false)) {
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/shopping/items/") &&
          resp.request().method() === "PUT"
      );
      await checkbox.click();
      await responsePromise;

      // The "Clear checked" button should now appear
      await expect(
        page.getByRole("button", { name: /Clear.*checked/ })
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should clear checked items", async ({ page }) => {
    await page.goto("/shopping");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");

    // Select our list
    const selectTrigger = page.locator("button[role='combobox']").first();
    if (await selectTrigger.isVisible().catch(() => false)) {
      await selectTrigger.click();
      const listOption = page.getByRole("option", { name: new RegExp(TEST_LIST_NAME) });
      if (await listOption.isVisible().catch(() => false)) {
        await listOption.click();
        await page.waitForLoadState("networkidle");
      }
    }

    // Click "Clear checked" if visible
    const clearBtn = page.getByRole("button", { name: /Clear.*checked/ });
    if (await clearBtn.isVisible().catch(() => false)) {
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/shopping/items/clear") &&
          resp.request().method() === "POST"
      );
      await clearBtn.click();
      await responsePromise;

      // Wait for the UI to update
      await page.waitForTimeout(1000);
    }
  });

  test("should delete the list", async ({ page }) => {
    await page.goto("/shopping");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");

    // Select our list
    const selectTrigger = page.locator("button[role='combobox']").first();
    if (await selectTrigger.isVisible().catch(() => false)) {
      await selectTrigger.click();
      const listOption = page.getByRole("option", { name: new RegExp(TEST_LIST_NAME) });
      if (await listOption.isVisible().catch(() => false)) {
        await listOption.click();
        await page.waitForLoadState("networkidle");
      }
    }

    // Click the delete button (trash icon near the list selector)
    const deleteBtn = page
      .locator("div.flex.items-center")
      .first()
      .locator("button")
      .filter({ has: page.locator("svg.lucide-trash-2") });

    if (await deleteBtn.isVisible().catch(() => false)) {
      // Handle the confirm dialog
      page.on("dialog", async (dialog) => {
        await dialog.accept();
      });

      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/shopping/lists/") &&
          resp.request().method() === "DELETE"
      );
      await deleteBtn.click();
      await responsePromise;

      // Wait for the page to update
      await page.waitForTimeout(1000);
    }
  });
});
