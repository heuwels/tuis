import { test, expect, Page } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const TEST_RECIPE_NAME = `E2E Meal Slot Recipe ${Date.now()}`;
const TEST_SIDE_NAME = `E2E Side Recipe ${Date.now()}`;
const TEST_CUSTOM_DESSERT = `E2E Custom Dessert ${Date.now()}`;

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
  await cleanupTestData(request, "recipes", "E2E Meal Slot Recipe%");
  await cleanupTestData(request, "recipes", "E2E Side Recipe%");
  await cleanupTestData(request, "meals", "E2E Custom Dessert%");
});

test.describe("Meal Planning", () => {
  test("should navigate to meals page and see week view with slot labels", async ({ page }) => {
    await page.goto("/meals");
    await dismissUserPickerIfVisible(page);

    await expect(
      page.getByRole("heading", { name: "Meal Planner" }).first()
    ).toBeVisible();

    await expect(page.getByText("Loading meals...")).not.toBeVisible({
      timeout: 10000,
    });

    // Should show day names
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let foundDays = 0;
    for (const day of dayNames) {
      const dayElement = page.getByText(day, { exact: false });
      if (await dayElement.first().isVisible().catch(() => false)) {
        foundDays++;
      }
    }
    expect(foundDays).toBeGreaterThan(0);

    // Should show slot labels (Side, Main, Dessert) in the grid
    await expect(page.getByText("Side").first()).toBeVisible();
    await expect(page.getByText("Main").first()).toBeVisible();
    await expect(page.getByText("Dessert").first()).toBeVisible();
  });

  test("should navigate weeks with prev/next buttons", async ({ page }) => {
    await page.goto("/meals");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading meals...")).not.toBeVisible({
      timeout: 10000,
    });

    const weekLabel = page.locator("span.font-medium.text-lg");
    const initialText = await weekLabel.textContent();

    const nextBtn = page.locator("button").filter({ has: page.locator("svg.lucide-chevron-right") }).first();
    await nextBtn.click();
    await page.waitForLoadState("networkidle");

    const newText = await weekLabel.textContent();
    expect(newText).not.toBe(initialText);

    const todayBtn = page.getByRole("button", { name: "Today" });
    await expect(todayBtn).toBeVisible();

    await todayBtn.click();
    await page.waitForLoadState("networkidle");

    const restoredText = await weekLabel.textContent();
    expect(restoredText).toBe(initialText);
  });

  test("should navigate to recipes page", async ({ page }) => {
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);

    await expect(
      page.getByRole("heading", { name: "Recipe Library" }).first()
    ).toBeVisible();

    await expect(page.getByText("Loading recipes...")).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("should create a main recipe with category", async ({ page }) => {
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading recipes...")).not.toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "New Recipe" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Recipe Name").fill(TEST_RECIPE_NAME);
    await dialog.getByLabel("Description").fill("A main course test recipe");
    await dialog.getByLabel("Prep Time (min)").fill("15");
    await dialog.getByLabel("Cook Time (min)").fill("30");
    await dialog.getByLabel("Servings").fill("4");

    // Category should default to Main — verify the selector exists
    const categoryTrigger = dialog.locator("button[role='combobox']").filter({ hasText: "Main" });
    await expect(categoryTrigger).toBeVisible();

    // Fill ingredient
    const ingredientNameInputs = dialog.locator("input[placeholder='Ingredient name']");
    await ingredientNameInputs.first().fill("Pasta");
    const amountInputs = dialog.locator("input[placeholder='Amt']");
    await amountInputs.first().fill("500");

    await dialog.getByLabel("Instructions").fill("1. Cook\n2. Serve");

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/recipes") &&
        resp.request().method() === "POST"
    );
    await dialog.getByRole("button", { name: "Create Recipe" }).click();
    await responsePromise;

    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(TEST_RECIPE_NAME)).toBeVisible({ timeout: 5000 });
  });

  test("should create a side recipe with side category", async ({ page }) => {
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading recipes...")).not.toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "New Recipe" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Recipe Name").fill(TEST_SIDE_NAME);
    await dialog.getByLabel("Description").fill("A side dish");
    await dialog.getByLabel("Prep Time (min)").fill("5");
    await dialog.getByLabel("Cook Time (min)").fill("10");
    await dialog.getByLabel("Servings").fill("4");

    // Change category to Side
    const categoryTrigger = dialog.locator("button[role='combobox']").filter({ hasText: "Main" });
    await categoryTrigger.click();
    await page.getByRole("option", { name: "Side" }).click();

    const ingredientNameInputs = dialog.locator("input[placeholder='Ingredient name']");
    await ingredientNameInputs.first().fill("Bread");
    const amountInputs = dialog.locator("input[placeholder='Amt']");
    await amountInputs.first().fill("1");

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/recipes") &&
        resp.request().method() === "POST"
    );
    await dialog.getByRole("button", { name: "Create Recipe" }).click();
    await responsePromise;

    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(TEST_SIDE_NAME)).toBeVisible({ timeout: 5000 });
  });

  test("should add a recipe to the main slot", async ({ page }) => {
    await page.goto("/meals");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading meals...")).not.toBeVisible({
      timeout: 10000,
    });

    // Navigate ahead to get empty slots
    const nextBtn = page.locator("button").filter({ has: page.locator("svg.lucide-chevron-right") }).first();
    for (let i = 0; i < 5; i++) {
      await nextBtn.click();
      await page.waitForLoadState("networkidle");
    }

    // Click the "Add" button in a Main slot
    // The slot label "Main" is followed by an "Add" button
    const mainAddBtns = page.locator("div").filter({ hasText: /^Main$/ }).locator(".. >> button:has-text('Add')");
    const addBtn = mainAddBtns.first();
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Dialog title should mention "Main"
    await expect(dialog.getByText("Add Main for")).toBeVisible();

    // Find and click our test recipe
    const recipeOption = dialog.getByText(TEST_RECIPE_NAME);
    await expect(recipeOption).toBeVisible({ timeout: 5000 });
    await recipeOption.click();

    // Confirm at 1x
    const addToPlanBtn = dialog.getByRole("button", { name: "Add to Plan" });
    await expect(addToPlanBtn).toBeVisible({ timeout: 5000 });

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/meals/") &&
        resp.request().method() === "PUT"
    );
    await addToPlanBtn.click();
    await responsePromise;

    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Recipe name should appear in the grid
    await expect(page.getByText(TEST_RECIPE_NAME).first()).toBeVisible({ timeout: 5000 });
  });

  test("should add a recipe to the side slot on the same day", async ({ page }) => {
    await page.goto("/meals");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading meals...")).not.toBeVisible({
      timeout: 10000,
    });

    // Navigate to the same week as the previous test
    const nextBtn = page.locator("button").filter({ has: page.locator("svg.lucide-chevron-right") }).first();
    for (let i = 0; i < 5; i++) {
      await nextBtn.click();
      await page.waitForLoadState("networkidle");
    }

    // Find the card that has the main recipe we just added
    const mainRecipeCard = page.locator(".relative").filter({ hasText: TEST_RECIPE_NAME }).first();
    await expect(mainRecipeCard).toBeVisible({ timeout: 5000 });

    // Click the "Add" button for the side slot in the same card
    const sideAddBtn = mainRecipeCard.locator("div").filter({ hasText: /^Side$/ }).locator(".. >> button:has-text('Add')");
    await expect(sideAddBtn).toBeVisible({ timeout: 5000 });
    await sideAddBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Title should mention "Side"
    await expect(dialog.getByText("Add Side for")).toBeVisible();

    // Pick the side recipe
    const recipeOption = dialog.getByText(TEST_SIDE_NAME);
    await expect(recipeOption).toBeVisible({ timeout: 5000 });
    await recipeOption.click();

    const addToPlanBtn = dialog.getByRole("button", { name: "Add to Plan" });
    await expect(addToPlanBtn).toBeVisible({ timeout: 5000 });

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/meals/") &&
        resp.request().method() === "PUT"
    );
    await addToPlanBtn.click();
    await responsePromise;

    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Both recipes should be visible in the same day card
    await expect(mainRecipeCard.getByText(TEST_RECIPE_NAME)).toBeVisible({ timeout: 5000 });
    await expect(mainRecipeCard.getByText(TEST_SIDE_NAME)).toBeVisible({ timeout: 5000 });
  });

  test("should add a custom meal to the dessert slot", async ({ page }) => {
    await page.goto("/meals");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading meals...")).not.toBeVisible({
      timeout: 10000,
    });

    // Navigate to the same week
    const nextBtn = page.locator("button").filter({ has: page.locator("svg.lucide-chevron-right") }).first();
    for (let i = 0; i < 5; i++) {
      await nextBtn.click();
      await page.waitForLoadState("networkidle");
    }

    // Find the card with both recipes
    const dayCard = page.locator(".relative").filter({ hasText: TEST_RECIPE_NAME }).first();
    await expect(dayCard).toBeVisible({ timeout: 5000 });

    // Click "Add" in the dessert slot
    const dessertAddBtn = dayCard.locator("div").filter({ hasText: /^Dessert$/ }).locator(".. >> button:has-text('Add')");
    await expect(dessertAddBtn).toBeVisible({ timeout: 5000 });
    await dessertAddBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Title should mention "Dessert"
    await expect(dialog.getByText("Add Dessert for")).toBeVisible();

    // Switch to Quick Entry mode
    await dialog.getByRole("button", { name: "Quick Entry" }).click();

    // Fill custom meal
    await dialog.getByLabel("What's for dinner?").fill(TEST_CUSTOM_DESSERT);

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/meals/") &&
        resp.request().method() === "PUT"
    );
    await dialog.getByRole("button", { name: "Add to Plan" }).click();
    await responsePromise;

    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // All three slots should be filled
    await expect(dayCard.getByText(TEST_SIDE_NAME)).toBeVisible({ timeout: 5000 });
    await expect(dayCard.getByText(TEST_RECIPE_NAME)).toBeVisible({ timeout: 5000 });
    await expect(dayCard.getByText(TEST_CUSTOM_DESSERT)).toBeVisible({ timeout: 5000 });
  });

  test("should clear a single slot without affecting others", async ({ page }) => {
    await page.goto("/meals");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading meals...")).not.toBeVisible({
      timeout: 10000,
    });

    // Navigate to the same week
    const nextBtn = page.locator("button").filter({ has: page.locator("svg.lucide-chevron-right") }).first();
    for (let i = 0; i < 5; i++) {
      await nextBtn.click();
      await page.waitForLoadState("networkidle");
    }

    // Find the day card with our test recipes
    const dayCard = page.locator(".relative").filter({ hasText: TEST_RECIPE_NAME }).first();
    await expect(dayCard).toBeVisible({ timeout: 5000 });

    // Hover over the side recipe to reveal the X button, then click it
    const sideEntry = dayCard.getByText(TEST_SIDE_NAME);
    await sideEntry.hover();

    // The X button is in the same group as the side entry
    const clearBtn = dayCard.locator(".group").filter({ hasText: TEST_SIDE_NAME }).locator("button");
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/meals/") &&
        resp.url().includes("slot=") &&
        resp.request().method() === "DELETE"
    );
    await clearBtn.click();
    await responsePromise;

    // Side should be cleared, but main and dessert remain
    await expect(dayCard.getByText(TEST_SIDE_NAME)).not.toBeVisible({ timeout: 5000 });
    await expect(dayCard.getByText(TEST_RECIPE_NAME)).toBeVisible();
    await expect(dayCard.getByText(TEST_CUSTOM_DESSERT)).toBeVisible();
  });

  test("should search for a recipe", async ({ page }) => {
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading recipes...")).not.toBeVisible({
      timeout: 10000,
    });

    const searchInput = page.getByPlaceholder("Search recipes...");
    await searchInput.fill(TEST_RECIPE_NAME);
    await page.waitForTimeout(500);

    await expect(page.getByText(TEST_RECIPE_NAME)).toBeVisible();

    await searchInput.clear();
    await searchInput.fill("xyznonexistentrecipe99999");
    await page.waitForTimeout(500);

    await expect(
      page.getByText("No recipes found matching your search")
    ).toBeVisible();
  });
});
