import { test, expect, Page } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const TEST_RECIPE_NAME = `Multiplier Test Recipe ${Date.now()}`;

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
  // Clean up recipe (also removes associated ingredients and meal plan entries)
  await cleanupTestData(request, "recipes", "Multiplier Test Recipe%");
});

test.describe.serial("Recipe Multiplier", () => {
  // Step 1: Create a test recipe with structured ingredients
  test("should create a recipe with ingredients for scaling", async ({
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

    // Fill recipe details
    await dialog.getByLabel("Recipe Name").fill(TEST_RECIPE_NAME);
    await dialog.getByLabel("Description").fill("Test recipe for multiplier");
    await dialog.getByLabel("Prep Time (min)").fill("10");
    await dialog.getByLabel("Cook Time (min)").fill("20");
    await dialog.getByLabel("Servings").fill("4");

    // Fill first ingredient: 500g Chicken
    const nameInputs = dialog.locator("input[placeholder='Ingredient name']");
    const amountInputs = dialog.locator("input[placeholder='Amt']");
    await nameInputs.first().fill("Chicken");
    await amountInputs.first().fill("500");

    // Select unit "g" for first ingredient
    const unitTriggers = dialog.locator("button[role='combobox']").filter({ hasText: /Unit|g|kg|mL|L|cup|tbsp|tsp|whole/ });
    await unitTriggers.first().click();
    await page.getByRole("option", { name: "g", exact: true }).click();

    // Add second ingredient: 2 cup Rice
    await dialog.getByRole("button", { name: "Add Ingredient" }).click();
    await nameInputs.nth(1).fill("Rice");
    await amountInputs.nth(1).fill("2");

    // Select unit "cup" for second ingredient
    const unitTriggers2 = dialog.locator("button[role='combobox']").filter({ hasText: /Unit/ });
    await unitTriggers2.first().click();
    await page.getByRole("option", { name: "cup", exact: true }).click();

    // Fill instructions
    await dialog
      .getByLabel("Instructions")
      .fill("1. Cook chicken\n2. Cook rice\n3. Serve together");

    // Submit
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

  // Step 2: Open recipe detail from recipes page and use 2x scale
  test("should scale recipe to 2x in recipe detail view", async ({
    page,
  }) => {
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading recipes...")).not.toBeVisible({
      timeout: 10000,
    });

    // Click on the recipe card to open details
    await page.getByText(TEST_RECIPE_NAME).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify recipe name in detail
    await expect(dialog.getByText(TEST_RECIPE_NAME)).toBeVisible();

    // Verify the Scale section exists with scale buttons
    await expect(dialog.getByText("Scale:")).toBeVisible();

    // Click the 2x scale button
    await dialog.getByRole("button", { name: "2x" }).click();

    // Verify servings updated to 8 (4 * 2)
    await expect(dialog.getByText("8 servings")).toBeVisible();

    // Verify ingredient amounts are scaled (500g * 2 = 1kg)
    await expect(dialog.getByText("1kg")).toBeVisible();

    // Close dialog
    await dialog
      .locator("button")
      .filter({ has: page.locator("svg.lucide-x") })
      .click();
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  // Step 3: From recipes page, add recipe to meal plan via "Add to Meal Plan" button
  test("should add recipe to meal plan from recipe detail", async ({
    page,
  }) => {
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading recipes...")).not.toBeVisible({
      timeout: 10000,
    });

    // Open recipe detail
    await page.getByText(TEST_RECIPE_NAME).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click "Add to Meal Plan" button
    await dialog.getByRole("button", { name: "Add to Meal Plan" }).click();

    // This navigates to /meals?addRecipe=<id> which opens the RecipePicker
    await page.waitForURL(/\/meals/);
    await page.waitForLoadState("networkidle");

    // The RecipePicker dialog should auto-open
    const pickerDialog = page.getByRole("dialog");
    await expect(pickerDialog).toBeVisible({ timeout: 10000 });

    // Find our test recipe in the picker list and click it
    const recipeOption = pickerDialog.getByText(TEST_RECIPE_NAME);
    if (await recipeOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await recipeOption.click();

      // Should go to confirm view with scale options
      const addToPlanBtn = pickerDialog.getByRole("button", {
        name: /Add to Plan/,
      });
      await expect(addToPlanBtn).toBeVisible({ timeout: 5000 });

      // Select 2x scale
      await pickerDialog.getByRole("button", { name: "2x" }).click();

      // Button text should update to show multiplier
      await expect(
        pickerDialog.getByRole("button", { name: "Add to Plan (2x)" })
      ).toBeVisible();

      // Verify servings display is updated (4 * 2 = 8)
      await expect(pickerDialog.getByText("8 servings")).toBeVisible();

      // Confirm adding to plan
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/meals/") &&
          resp.request().method() === "PUT"
      );
      await pickerDialog
        .getByRole("button", { name: "Add to Plan (2x)" })
        .click();
      await responsePromise;

      // Dialog should close
      await expect(pickerDialog).not.toBeVisible({ timeout: 5000 });

      // The recipe should appear in the meal grid with (2x) indicator
      await expect(page.getByText(TEST_RECIPE_NAME).first()).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText("(2x)").first()).toBeVisible({ timeout: 5000 });
    }
  });

  // Step 4: From the meals page, click a day to add a recipe with 2x from the picker
  test("should add a 2x recipe from the meal plan page picker", async ({
    page,
  }) => {
    await page.goto("/meals");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading meals...")).not.toBeVisible({
      timeout: 10000,
    });

    // Navigate several weeks ahead so we have empty slots
    const nextBtn = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-chevron-right") })
      .first();
    // Go 4 weeks ahead to ensure empty slots
    for (let i = 0; i < 4; i++) {
      await nextBtn.click();
      await page.waitForLoadState("networkidle");
    }

    // Click an "Add" button in a Main slot
    const mainAddBtns = page.locator("div").filter({ hasText: /^Main$/ }).locator(".. >> button:has-text('Add')");
    const addMealBtn = mainAddBtns.first();
    await expect(addMealBtn).toBeVisible({ timeout: 5000 });
    await addMealBtn.click();

    // RecipePicker dialog should appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Find and click our test recipe
    const recipeOption = dialog.getByText(TEST_RECIPE_NAME);
    await expect(recipeOption).toBeVisible({ timeout: 5000 });
    await recipeOption.click();

    // Should show confirm view with scale options
    const addToPlanBtn = dialog.getByRole("button", { name: /Add to Plan/ });
    await expect(addToPlanBtn).toBeVisible({ timeout: 5000 });

    // Select 2x scale
    await dialog.getByRole("button", { name: "2x" }).click();

    // Verify the button shows the multiplier
    await expect(
      dialog.getByRole("button", { name: "Add to Plan (2x)" })
    ).toBeVisible();

    // Confirm
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/meals/") && resp.request().method() === "PUT"
    );
    await dialog.getByRole("button", { name: "Add to Plan (2x)" }).click();
    await responsePromise;

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Recipe should appear with (2x) in the grid
    await expect(page.getByText(TEST_RECIPE_NAME).first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("(2x)").first()).toBeVisible({ timeout: 5000 });
  });

  // Cleanup
  test("should clean up test recipe", async ({ page }) => {
    // Delete recipe via API to clean up
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading recipes...")).not.toBeVisible({
      timeout: 10000,
    });

    // Click on the recipe to open details
    const recipeCard = page.getByText(TEST_RECIPE_NAME);
    if (await recipeCard.isVisible().catch(() => false)) {
      await recipeCard.click();

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
    }
  });
});
