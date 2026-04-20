import { test, expect, Page } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const TEST_RECIPE_NAME = `E2E Cook Mode Recipe ${Date.now()}`;

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
  await cleanupTestData(request, "recipes", "E2E Cook Mode Recipe%");
});

test.describe.serial("Cook Mode", () => {
  test("should create a recipe with multi-step instructions", async ({
    page,
  }) => {
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading recipes...")).not.toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "New Recipe" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Recipe Name").fill(TEST_RECIPE_NAME);
    await dialog.getByLabel("Description").fill("A test recipe for cook mode");
    await dialog.getByLabel("Prep Time (min)").fill("5");
    await dialog.getByLabel("Cook Time (min)").fill("15");
    await dialog.getByLabel("Servings").fill("2");

    const ingredientNameInputs = dialog.locator(
      "input[placeholder='Ingredient name']"
    );
    await ingredientNameInputs.first().fill("Pasta");
    const amountInputs = dialog.locator("input[placeholder='Amt']");
    await amountInputs.first().fill("250");

    const unitTriggers = dialog
      .locator("button[role='combobox']")
      .filter({ hasText: /Unit|g|kg|mL|L|cup|tbsp|tsp|whole/ });
    await unitTriggers.first().click();
    await page.getByRole("option", { name: "g", exact: true }).click();

    await dialog
      .getByLabel("Instructions")
      .fill(
        "Boil a large pot of water\nCook pasta for 10 minutes\nDrain and serve"
      );

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/recipes") &&
        resp.request().method() === "POST"
    );
    await dialog.getByRole("button", { name: "Create Recipe" }).click();
    await responsePromise;

    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(TEST_RECIPE_NAME)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should open cook mode from recipe detail", async ({ page }) => {
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading recipes...")).not.toBeVisible({
      timeout: 10000,
    });

    // Open recipe detail
    await page.getByText(TEST_RECIPE_NAME).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify "Start Cooking" button is present
    const startBtn = dialog.getByTestId("start-cooking");
    await expect(startBtn).toBeVisible();

    // Click "Start Cooking"
    await startBtn.click();

    // Cook mode overlay should be visible
    const cookMode = page.getByTestId("cook-mode");
    await expect(cookMode).toBeVisible({ timeout: 3000 });

    // Should show recipe name
    await expect(cookMode.getByText(TEST_RECIPE_NAME)).toBeVisible();

    // Should show step 1 of 3
    const stepCounter = cookMode.getByTestId("step-counter");
    await expect(stepCounter).toHaveText("Step 1 of 3");

    // Should show first step text
    const stepText = cookMode.getByTestId("step-text");
    await expect(stepText).toHaveText("Boil a large pot of water");
  });

  test("should navigate steps with next/previous buttons", async ({
    page,
  }) => {
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading recipes...")).not.toBeVisible({
      timeout: 10000,
    });

    // Open recipe detail and cook mode
    await page.getByText(TEST_RECIPE_NAME).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByTestId("start-cooking").click();

    const cookMode = page.getByTestId("cook-mode");
    await expect(cookMode).toBeVisible({ timeout: 3000 });

    // Verify starting at step 1
    await expect(cookMode.getByTestId("step-counter")).toHaveText(
      "Step 1 of 3"
    );

    // Previous should be disabled on step 1
    const prevBtn = cookMode.getByTestId("cook-mode-prev");
    await expect(prevBtn).toBeDisabled();

    // Click next
    const nextBtn = cookMode.getByTestId("cook-mode-next");
    await nextBtn.click();

    // Should now be step 2
    await expect(cookMode.getByTestId("step-counter")).toHaveText(
      "Step 2 of 3"
    );
    await expect(cookMode.getByTestId("step-text")).toHaveText(
      "Cook pasta for 10 minutes"
    );

    // Previous should now be enabled
    await expect(prevBtn).toBeEnabled();

    // Click next again to step 3
    await nextBtn.click();
    await expect(cookMode.getByTestId("step-counter")).toHaveText(
      "Step 3 of 3"
    );
    await expect(cookMode.getByTestId("step-text")).toHaveText(
      "Drain and serve"
    );

    // Next should be disabled on last step
    await expect(nextBtn).toBeDisabled();

    // Go back to step 2
    await prevBtn.click();
    await expect(cookMode.getByTestId("step-counter")).toHaveText(
      "Step 2 of 3"
    );
  });

  test("should show timer button on step with time reference", async ({
    page,
  }) => {
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading recipes...")).not.toBeVisible({
      timeout: 10000,
    });

    // Open recipe detail and cook mode
    await page.getByText(TEST_RECIPE_NAME).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByTestId("start-cooking").click();

    const cookMode = page.getByTestId("cook-mode");
    await expect(cookMode).toBeVisible({ timeout: 3000 });

    // Navigate to step 2 which has "10 minutes"
    await cookMode.getByTestId("cook-mode-next").click();
    await expect(cookMode.getByTestId("step-counter")).toHaveText(
      "Step 2 of 3"
    );

    // Should show a timer button
    const timerBtn = cookMode.getByTestId("start-timer");
    await expect(timerBtn).toBeVisible();
    await expect(timerBtn).toContainText("10 minutes");
  });

  test("should close cook mode with close button", async ({ page }) => {
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading recipes...")).not.toBeVisible({
      timeout: 10000,
    });

    // Open recipe detail and cook mode
    await page.getByText(TEST_RECIPE_NAME).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByTestId("start-cooking").click();

    const cookMode = page.getByTestId("cook-mode");
    await expect(cookMode).toBeVisible({ timeout: 3000 });

    // Click close button
    await cookMode.getByTestId("cook-mode-close").click();

    // Cook mode should be gone
    await expect(cookMode).not.toBeVisible({ timeout: 3000 });

    // Recipe detail dialog should still be visible
    await expect(dialog).toBeVisible();
  });
});
