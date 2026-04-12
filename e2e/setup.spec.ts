import { test, expect, Page } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const TEST_USER_PREFIX = "E2E Setup User";
const TEST_USER_NAME = `${TEST_USER_PREFIX} ${Date.now()}`;

test.afterAll(async ({ request }) => {
  // Clean up test users, seeded data
  await cleanupTestData(request, "users", `${TEST_USER_PREFIX}%`);
  await cleanupTestData(request, "tasks", "Wash dishes");
  await cleanupTestData(request, "tasks", "Wipe kitchen counters");
  await cleanupTestData(request, "tasks", "Clean stovetop");
  await cleanupTestData(request, "tasks", "Clean oven");
  await cleanupTestData(request, "tasks", "Clean fridge");
  await cleanupTestData(request, "tasks", "Empty bins");
  await cleanupTestData(request, "tasks", "Clean toilet");
  await cleanupTestData(request, "tasks", "Clean shower/bath");
  await cleanupTestData(request, "tasks", "Clean bathroom sink");
  await cleanupTestData(request, "tasks", "Wash towels");
  await cleanupTestData(request, "tasks", "Change bed sheets");
  await cleanupTestData(request, "tasks", "Vacuum bedroom");
  await cleanupTestData(request, "tasks", "Dust surfaces");
  await cleanupTestData(request, "tasks", "Vacuum living room");
  await cleanupTestData(request, "tasks", "Mop floors");
  await cleanupTestData(request, "tasks", "Dust shelves");
  await cleanupTestData(request, "tasks", "Mow lawn");
  await cleanupTestData(request, "tasks", "Water garden");
  await cleanupTestData(request, "tasks", "Sweep porch/patio");
  await cleanupTestData(request, "tasks", "Do laundry");
  await cleanupTestData(request, "tasks", "Iron clothes");
  await cleanupTestData(request, "shopping", "Groceries");
  await cleanupTestData(request, "recipes", "Pasta Bolognese");
  await cleanupTestData(request, "recipes", "Chicken Stir-Fry");
  await cleanupTestData(request, "recipes", "Scrambled Eggs on Toast");
});

test.describe.serial("Setup Wizard", () => {
  test("GET /api/setup returns needsSetup status", async ({ request }) => {
    const res = await request.get("/api/setup");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty("needsSetup");
    expect(typeof data.needsSetup).toBe("boolean");
  });

  test("setup page loads and shows welcome step", async ({ page }) => {
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // Should show the welcome screen (or redirect if setup not needed)
    // Check for either the welcome heading or the dashboard
    const welcomeHeading = page.getByRole("heading", {
      name: "Welcome to Tuis",
    });
    const isSetupPage = await welcomeHeading.isVisible().catch(() => false);

    if (isSetupPage) {
      await expect(welcomeHeading).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Get Started" })
      ).toBeVisible();
    }
    // If not visible, setup was already done — page redirected to dashboard
  });

  test("setup wizard navigates through all steps", async ({ page }) => {
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    const welcomeHeading = page.getByRole("heading", {
      name: "Welcome to Tuis",
    });
    const isSetupPage = await welcomeHeading.isVisible().catch(() => false);

    // Only run the full wizard flow if setup is actually needed
    if (!isSetupPage) {
      test.skip();
      return;
    }

    // Step 0: Welcome → Click Get Started
    await page.getByRole("button", { name: "Get Started" }).click();

    // Step 1: Members → Should show "Who lives here?"
    await expect(
      page.getByRole("heading", { name: "Who lives here?" })
    ).toBeVisible();

    // Fill in a member name
    await page.getByPlaceholder("Name").first().fill(TEST_USER_NAME);

    // Verify color buttons have aria-labels
    await expect(
      page.getByRole("button", { name: "Select Blue" })
    ).toBeVisible();

    // Click Continue
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: Quick Start → Should show checkboxes
    await expect(
      page.getByRole("heading", { name: "Quick Start" })
    ).toBeVisible();
    await expect(page.getByText("Common household chores")).toBeVisible();
    await expect(page.getByText("Sample shopping list")).toBeVisible();
    await expect(page.getByText("Sample recipes")).toBeVisible();

    // Click Back to verify navigation
    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByRole("heading", { name: "Who lives here?" })
    ).toBeVisible();

    // Go forward again
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("heading", { name: "Quick Start" })
    ).toBeVisible();

    // Click Finish Setup
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/users") && res.status() === 200
    );
    await page.getByRole("button", { name: "Finish Setup" }).click();
    await responsePromise;

    // Step 3: Done → Should show success
    await expect(
      page.getByRole("heading", { name: /all set/i })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: "Go to Dashboard" })
    ).toBeVisible();

    // Click Go to Dashboard
    await page.getByRole("button", { name: "Go to Dashboard" }).click();
    await page.waitForLoadState("networkidle");

    // Should be on the dashboard now
    await expect(page).toHaveURL("/");
  });

  test("POST /api/setup returns 409 after setup is complete", async ({
    request,
  }) => {
    // Setup is now complete (user was created in previous test)
    const res = await request.post("/api/setup", {
      data: { seedChores: true, seedShopping: true, seedRecipes: true },
    });
    // Should return 409 since users now exist
    expect(res.status()).toBe(409);
  });

  test("visiting /setup after completion redirects away", async ({ page }) => {
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // Should have been redirected to the dashboard
    await expect(page).toHaveURL("/", { timeout: 5000 });
  });
});
