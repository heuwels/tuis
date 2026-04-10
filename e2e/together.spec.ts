import { test, expect, Page } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const TEST_ACTIVITY_TITLE = `E2E Activity ${Date.now()}`;

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
  await cleanupTestData(request, "together", "E2E Activity%");
});

test.describe.serial("To-Do Together / Activities", () => {
  test("should navigate to together page", async ({ page }) => {
    await page.goto("/together");
    await dismissUserPickerIfVisible(page);

    await expect(
      page.getByRole("heading", { name: "To-Do Together" }).first()
    ).toBeVisible();

    // Wait for loading
    await expect(page.getByText("Loading activities...")).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("should see category filter buttons", async ({ page }) => {
    await page.goto("/together");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading activities...")).not.toBeVisible({
      timeout: 10000,
    });

    // Category filter buttons should be visible
    await expect(page.getByRole("button", { name: "All" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Locations" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Activities" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Restaurants" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Dishes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Films" })).toBeVisible();
  });

  test("should see status filter buttons", async ({ page }) => {
    await page.goto("/together");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading activities...")).not.toBeVisible({
      timeout: 10000,
    });

    // Status filter buttons
    // Note: "All" appears both in categories and statuses
    await expect(page.getByRole("button", { name: "Wishlist" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Planned" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Completed" })).toBeVisible();
  });

  test("should create a new activity", async ({ page }) => {
    await page.goto("/together");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading activities...")).not.toBeVisible({
      timeout: 10000,
    });

    // Click "Add New" button
    await page.getByRole("button", { name: "Add New" }).click();

    // Wait for dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Add to To-Do Together" })
    ).toBeVisible();

    // Fill in the form
    await dialog.getByLabel("Title").fill(TEST_ACTIVITY_TITLE);

    // Select category - "Restaurant"
    const categoryTrigger = dialog
      .locator("div", { hasText: /^Category/ })
      .locator("button[role='combobox']");
    await categoryTrigger.click();
    await page.getByRole("option", { name: "Restaurant" }).click();

    // Select status - "Wishlist" (should be default)
    // Status defaults to "wishlist" so we can leave it

    // Fill notes
    await dialog.getByLabel("Notes").fill("A great place to try");

    // Fill location
    await dialog.getByLabel("Location / Address").fill("123 Test Street");

    // Submit
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/together") &&
        resp.request().method() === "POST"
    );
    await dialog.getByRole("button", { name: "Add to List" }).click();
    await responsePromise;

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Activity should appear
    await expect(page.getByText(TEST_ACTIVITY_TITLE)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should filter activities by category", async ({ page }) => {
    await page.goto("/together");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading activities...")).not.toBeVisible({
      timeout: 10000,
    });

    // Click "Restaurants" category filter and wait for API response
    const restaurantResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/together") && resp.url().includes("category=restaurant")
    );
    await page.getByRole("button", { name: "Restaurants" }).click();
    await restaurantResponse;

    // Our activity should be visible (it's a restaurant)
    await expect(page.getByText(TEST_ACTIVITY_TITLE)).toBeVisible({
      timeout: 5000,
    });

    // Click "Locations" - our activity should NOT appear
    const locationResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/together") && resp.url().includes("category=location")
    );
    await page.getByRole("button", { name: "Locations" }).click();
    await locationResponse;

    // Wait for our activity to disappear from the DOM
    await expect(page.getByText(TEST_ACTIVITY_TITLE)).not.toBeVisible({
      timeout: 5000,
    });

    // Reset to "All"
    const allResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/together") && !resp.url().includes("category=")
    );
    await page.getByRole("button", { name: "All" }).first().click();
    await allResponse;

    // Activity should be visible again
    await expect(page.getByText(TEST_ACTIVITY_TITLE)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should filter activities by status", async ({ page }) => {
    await page.goto("/together");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading activities...")).not.toBeVisible({
      timeout: 10000,
    });

    // Click "Wishlist" status filter and wait for API response
    const wishlistResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/together") && resp.url().includes("status=wishlist")
    );
    await page.getByRole("button", { name: "Wishlist" }).click();
    await wishlistResponse;

    // Our activity should be visible (status is wishlist)
    await expect(page.getByText(TEST_ACTIVITY_TITLE)).toBeVisible({
      timeout: 5000,
    });

    // Click "Completed" - our activity should NOT appear
    const completedResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/together") && resp.url().includes("status=completed")
    );
    await page.getByRole("button", { name: "Completed" }).click();
    await completedResponse;

    // Wait for our activity to disappear
    await expect(page.getByText(TEST_ACTIVITY_TITLE)).not.toBeVisible({
      timeout: 5000,
    });

    // Reset by clicking the status "All" button (in the second row of filter buttons)
    const statusAllBtn = page.locator(".flex.gap-2.mb-6").getByRole("button", { name: "All" });
    const resetResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/together") && !resp.url().includes("status=")
    );
    await statusAllBtn.click();
    await resetResponse;
  });

  test("should view activity details", async ({ page }) => {
    await page.goto("/together");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading activities...")).not.toBeVisible({
      timeout: 10000,
    });

    // Click on the activity card
    await page.getByText(TEST_ACTIVITY_TITLE).click();

    // Detail dialog should appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Should show activity details
    await expect(dialog.getByText(TEST_ACTIVITY_TITLE)).toBeVisible();
    await expect(dialog.getByText("123 Test Street")).toBeVisible();

    // Close the dialog
    await dialog.locator("button").filter({ has: page.locator("svg.lucide-x") }).click();
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test("should clean up test activity", async ({ page }) => {
    await page.goto("/together");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading activities...")).not.toBeVisible({
      timeout: 10000,
    });

    // Click on the activity to open details
    await page.getByText(TEST_ACTIVITY_TITLE).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click delete
    const deleteBtn = dialog.getByRole("button", { name: "Delete" });
    if (await deleteBtn.isVisible().catch(() => false)) {
      page.on("dialog", async (d) => {
        await d.accept();
      });

      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/together/") &&
          resp.request().method() === "DELETE"
      );
      await deleteBtn.click();
      await responsePromise;

      // Wait for cleanup
      await page.waitForLoadState("networkidle");
    }

    // Activity should no longer be visible
    await expect(page.getByText(TEST_ACTIVITY_TITLE)).not.toBeVisible({
      timeout: 5000,
    });
  });
});
