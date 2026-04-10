import { test, expect, Page } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const TEST_RECIPE_NAME = `E2E Test Recipe ${Date.now()}`;

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
  await cleanupTestData(request, "recipes", "E2E Test Recipe%");
});

test.describe("Meal Planning", () => {
  test("should navigate to meals page and see week view", async ({ page }) => {
    await page.goto("/meals");
    await dismissUserPickerIfVisible(page);

    await expect(
      page.getByRole("heading", { name: "Meal Planner" }).first()
    ).toBeVisible();

    // Wait for loading to finish
    await expect(page.getByText("Loading meals...")).not.toBeVisible({
      timeout: 10000,
    });

    // Should show day names in the week grid (at least one day should be visible)
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let foundDays = 0;
    for (const day of dayNames) {
      const dayElement = page.getByText(day, { exact: false });
      if (await dayElement.first().isVisible().catch(() => false)) {
        foundDays++;
      }
    }
    expect(foundDays).toBeGreaterThan(0);
  });

  test("should navigate weeks with prev/next buttons", async ({ page }) => {
    await page.goto("/meals");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading meals...")).not.toBeVisible({
      timeout: 10000,
    });

    // Get the current week label
    const weekLabel = page.locator("span.font-medium.text-lg");
    const initialText = await weekLabel.textContent();

    // Click next week
    const nextBtn = page.locator("button").filter({ has: page.locator("svg.lucide-chevron-right") }).first();
    await nextBtn.click();
    await page.waitForLoadState("networkidle");

    // Week label should have changed
    const newText = await weekLabel.textContent();
    expect(newText).not.toBe(initialText);

    // "Today" button should appear when not on current week
    const todayBtn = page.getByRole("button", { name: "Today" });
    await expect(todayBtn).toBeVisible();

    // Click Today to go back
    await todayBtn.click();
    await page.waitForLoadState("networkidle");

    // Should be back to original week
    const restoredText = await weekLabel.textContent();
    expect(restoredText).toBe(initialText);
  });

  test("should navigate to recipes page", async ({ page }) => {
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);

    await expect(
      page.getByRole("heading", { name: "Recipe Library" }).first()
    ).toBeVisible();

    // Wait for loading
    await expect(page.getByText("Loading recipes...")).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("should create a new recipe with ingredients", async ({ page }) => {
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading recipes...")).not.toBeVisible({
      timeout: 10000,
    });

    // Click "New Recipe" button
    await page.getByRole("button", { name: "New Recipe" }).click();

    // Wait for dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "New Recipe" })
    ).toBeVisible();

    // Fill in recipe details
    await dialog.getByLabel("Recipe Name").fill(TEST_RECIPE_NAME);
    await dialog.getByLabel("Description").fill("A delicious test recipe");
    await dialog.getByLabel("Prep Time (min)").fill("15");
    await dialog.getByLabel("Cook Time (min)").fill("30");
    await dialog.getByLabel("Servings").fill("4");

    // Fill in the first ingredient (there's already one empty row)
    const ingredientNameInputs = dialog.locator(
      "input[placeholder='Ingredient name']"
    );
    await ingredientNameInputs.first().fill("Pasta");

    const amountInputs = dialog.locator("input[placeholder='Amt']");
    await amountInputs.first().fill("500");

    // Add another ingredient
    await dialog.getByRole("button", { name: "Add Ingredient" }).click();
    await ingredientNameInputs.nth(1).fill("Tomato Sauce");
    await amountInputs.nth(1).fill("400");

    // Fill instructions
    await dialog
      .getByLabel("Instructions")
      .fill("1. Boil pasta\n2. Heat sauce\n3. Combine and serve");

    // Submit
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/recipes") &&
        resp.request().method() === "POST"
    );
    await dialog.getByRole("button", { name: "Create Recipe" }).click();
    await responsePromise;

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Recipe should appear in the list
    await expect(page.getByText(TEST_RECIPE_NAME)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should search for a recipe", async ({ page }) => {
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading recipes...")).not.toBeVisible({
      timeout: 10000,
    });

    // Use the search input
    const searchInput = page.getByPlaceholder("Search recipes...");
    await searchInput.fill(TEST_RECIPE_NAME);

    // Wait for debounced search
    await page.waitForTimeout(500);

    // Recipe should be visible
    await expect(page.getByText(TEST_RECIPE_NAME)).toBeVisible();

    // Search for something nonexistent
    await searchInput.clear();
    await searchInput.fill("xyznonexistentrecipe99999");
    await page.waitForTimeout(500);

    await expect(
      page.getByText("No recipes found matching your search")
    ).toBeVisible();
  });

  test("should add a meal to the plan from meal page", async ({ page }) => {
    await page.goto("/meals");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading meals...")).not.toBeVisible({
      timeout: 10000,
    });

    // Click an "Add Meal" button in the week grid
    const addMealBtn = page.getByRole("button", { name: "Add Meal" }).first();
    if (await addMealBtn.isVisible().catch(() => false)) {
      await addMealBtn.click();

      // The recipe picker dialog should appear
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Look for our test recipe in the picker and click it
      const recipeOption = dialog.getByText(TEST_RECIPE_NAME);
      if (await recipeOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await recipeOption.click();

        // RecipePicker goes to a "confirm" step with scale options
        // Wait for the confirm view with "Add to Plan" button
        const addToPlanBtn = dialog.getByRole("button", { name: "Add to Plan" });
        await expect(addToPlanBtn).toBeVisible({ timeout: 5000 });

        // Click "Add to Plan" to confirm at 1x
        const responsePromise = page.waitForResponse(
          (resp) =>
            resp.url().includes("/api/meals/") &&
            resp.request().method() === "PUT"
        );
        await addToPlanBtn.click();
        await responsePromise;

        // Dialog should close
        await expect(dialog).not.toBeVisible({ timeout: 5000 });

        // The recipe name should now appear in the grid
        await expect(page.getByText(TEST_RECIPE_NAME).first()).toBeVisible({
          timeout: 5000,
        });
      }
    }
  });

  test("should view the current week meal plan", async ({ page }) => {
    await page.goto("/meals");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading meals...")).not.toBeVisible({
      timeout: 10000,
    });

    // The week grid should be visible
    const gridArea = page.locator(".grid").first();
    await expect(gridArea).toBeVisible();

    // Verify navigation buttons (chevron icons) are present
    await expect(
      page.locator("button").filter({ has: page.locator("svg.lucide-chevron-left") }).first()
    ).toBeVisible();
    await expect(
      page.locator("button").filter({ has: page.locator("svg.lucide-chevron-right") }).first()
    ).toBeVisible();
  });

  // Cleanup: delete the test recipe
  test("should clean up test recipe", async ({ page }) => {
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading recipes...")).not.toBeVisible({
      timeout: 10000,
    });

    // Click on the recipe card to view details
    const recipeCard = page.getByText(TEST_RECIPE_NAME);
    if (await recipeCard.isVisible().catch(() => false)) {
      await recipeCard.click();

      // Wait for the detail dialog
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Click delete button
      const deleteBtn = dialog.getByRole("button", { name: "Delete" });
      if (await deleteBtn.isVisible().catch(() => false)) {
        // Handle confirm dialog
        page.on("dialog", async (d) => {
          await d.accept();
        });

        await deleteBtn.click();
        await page.waitForLoadState("networkidle");
      }
    }
  });
});
