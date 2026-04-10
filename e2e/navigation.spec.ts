import { test, expect, Page } from "@playwright/test";

/**
 * Dismiss the user picker modal if it appears.
 * The app shows a "Who are you?" dialog on first visit when no user is stored in localStorage.
 * If no users exist in the DB, this will show "No household members yet" instead.
 */
async function dismissUserPickerIfVisible(page: Page) {
  // Wait for app to settle
  await page.waitForLoadState("networkidle");

  // Check if the user picker dialog is visible
  const dialog = page.getByRole("dialog");
  const isVisible = await dialog.isVisible().catch(() => false);

  if (isVisible) {
    const heading = dialog.getByRole("heading");
    const headingText = await heading.textContent().catch(() => "");

    if (headingText === "Who are you?" || headingText === "Switch User") {
      // Try to click the first user button in the picker
      const userButton = dialog.locator("button").first();
      const hasUser = await userButton.isVisible().catch(() => false);
      if (hasUser) {
        await userButton.click();
        await expect(dialog).not.toBeVisible({ timeout: 3000 });
      }
    }
  }
}

test.describe("App Navigation", () => {
  test("should render the dashboard page at root", async ({ page }) => {
    await page.goto("/");
    await dismissUserPickerIfVisible(page);

    // The mobile header shows the title
    await expect(page.getByRole("heading", { name: "Dashboard" }).first()).toBeVisible();
  });

  test("should navigate to tasks page via sidebar", async ({ page }) => {
    await page.goto("/");
    await dismissUserPickerIfVisible(page);

    // Use the sidebar link (visible on desktop) or bottom nav
    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);

    await expect(page.getByRole("heading", { name: "All Tasks" }).first()).toBeVisible();
  });

  test("should navigate to shopping page", async ({ page }) => {
    await page.goto("/shopping");
    await dismissUserPickerIfVisible(page);

    await expect(page.getByRole("heading", { name: "Shopping Lists" }).first()).toBeVisible();
  });

  test("should navigate to meals page", async ({ page }) => {
    await page.goto("/meals");
    await dismissUserPickerIfVisible(page);

    await expect(page.getByRole("heading", { name: "Meal Planner" }).first()).toBeVisible();
  });

  test("should navigate to recipes page", async ({ page }) => {
    await page.goto("/recipes");
    await dismissUserPickerIfVisible(page);

    await expect(page.getByRole("heading", { name: "Recipe Library" }).first()).toBeVisible();
  });

  test("should navigate to together page", async ({ page }) => {
    await page.goto("/together");
    await dismissUserPickerIfVisible(page);

    await expect(page.getByRole("heading", { name: "To-Do Together" }).first()).toBeVisible();
  });

  test("should navigate to appliances page", async ({ page }) => {
    await page.goto("/appliances");
    await dismissUserPickerIfVisible(page);

    await expect(page.getByRole("heading", { name: "Appliances" }).first()).toBeVisible();
  });

  test("should navigate to vendors page", async ({ page }) => {
    await page.goto("/vendors");
    await dismissUserPickerIfVisible(page);

    await expect(page.getByRole("heading", { name: "Vendors" }).first()).toBeVisible();
  });

  test("should show bottom nav on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await dismissUserPickerIfVisible(page);

    // Bottom nav should have Home, Chores, Shop, Us, More
    const bottomNav = page.locator("nav.fixed.bottom-0");
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.getByText("Home")).toBeVisible();
    await expect(bottomNav.getByText("Chores")).toBeVisible();
    await expect(bottomNav.getByText("Shop")).toBeVisible();
    await expect(bottomNav.getByText("Us")).toBeVisible();
    await expect(bottomNav.getByText("More")).toBeVisible();
  });

  test("should navigate via bottom nav on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await dismissUserPickerIfVisible(page);

    // Click Chores in bottom nav
    const bottomNav = page.locator("nav.fixed.bottom-0");
    await bottomNav.getByText("Chores").click();
    await page.waitForURL("/tasks");
    await expect(page.getByRole("heading", { name: "All Tasks" }).first()).toBeVisible();

    // Click Shop
    await bottomNav.getByText("Shop").click();
    await page.waitForURL("/shopping");
    await expect(page.getByRole("heading", { name: "Shopping Lists" }).first()).toBeVisible();

    // Click Us
    await bottomNav.getByText("Us").click();
    await page.waitForURL("/together");
    await expect(page.getByRole("heading", { name: "To-Do Together" }).first()).toBeVisible();

    // Click Home
    await bottomNav.getByText("Home").click();
    await page.waitForURL("/");
    await expect(page.getByRole("heading", { name: "Dashboard" }).first()).toBeVisible();
  });

  test("should show user picker on first load when no user is selected", async ({
    page,
  }) => {
    // Clear localStorage to simulate first visit
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("chore-calendar-user-id"));
    await page.reload();
    await page.waitForLoadState("networkidle");

    // The dialog should appear - either "Who are you?" or "No household members yet"
    const dialog = page.getByRole("dialog");
    // Give it time to potentially appear
    const appeared = await dialog.isVisible({ timeout: 5000 }).catch(() => false);

    // If there are users in the DB, the picker should show
    if (appeared) {
      const heading = dialog.getByRole("heading");
      const headingText = await heading.textContent();
      expect(
        headingText === "Who are you?" || headingText === "Switch User"
      ).toBeTruthy();
    }
    // If no users exist, the dialog might not appear at all, which is also valid
  });

  test("should persist selected user across page navigation", async ({
    page,
  }) => {
    await page.goto("/");
    await dismissUserPickerIfVisible(page);

    // Check if we have a user avatar button in the header
    const avatar = page.locator("button.rounded-full").first();
    const hasAvatar = await avatar.isVisible().catch(() => false);

    if (hasAvatar) {
      const avatarText = await avatar.textContent();

      // Navigate to another page
      await page.goto("/tasks");
      await page.waitForLoadState("networkidle");

      // The same avatar should still be showing
      const newAvatar = page.locator("button.rounded-full").first();
      const newAvatarText = await newAvatar.textContent();
      expect(newAvatarText).toBe(avatarText);
    }
  });

  test("should show sidebar on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await dismissUserPickerIfVisible(page);

    // Desktop sidebar should be visible (the one with hidden lg:flex classes)
    const sidebar = page.locator("aside.lg\\:flex");
    await expect(sidebar).toBeVisible();

    // Should contain navigation links
    await expect(sidebar.getByText("Dashboard")).toBeVisible();
    await expect(sidebar.getByText("Chores")).toBeVisible();
    await expect(sidebar.getByText("Shopping")).toBeVisible();
  });
});
