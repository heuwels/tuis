import { test, expect, APIRequestContext } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const TEST_USER_PREFIX = "E2E Setup User";
const TEST_USER_NAME = `${TEST_USER_PREFIX} ${Date.now()}`;

// Store existing users so we can restore them after tests
let existingUsers: Array<{ name: string; color: string }> = [];

async function backupAndClearUsers(request: APIRequestContext) {
  // Fetch existing users
  const res = await request.get("/api/users");
  if (res.ok()) {
    existingUsers = await res.json();
  }
  // Delete all users to simulate fresh install
  if (existingUsers.length > 0) {
    await cleanupTestData(request, "users", "%");
  }
}

async function restoreUsers(request: APIRequestContext) {
  // Re-create the original users
  for (const user of existingUsers) {
    await request.post("/api/users", {
      data: { name: user.name, color: user.color },
    });
  }
}

test.describe.serial("Setup Wizard", () => {
  test.beforeAll(async ({ request }) => {
    // Clean up any leftover seed data from prior runs
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

    await backupAndClearUsers(request);
  });

  test.afterAll(async ({ request }) => {
    // Clean up test user and seeded data
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

    // Restore original users
    await restoreUsers(request);
  });

  test("GET /api/setup returns needsSetup: true with empty DB", async ({
    request,
  }) => {
    const res = await request.get("/api/setup");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.needsSetup).toBe(true);
  });

  test("setup page shows welcome step", async ({ page }) => {
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Welcome to Tuis" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Get Started" })
    ).toBeVisible();
  });

  test("root page redirects to /setup when no users exist", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL("/setup", { timeout: 5000 });
  });

  test("wizard navigates through all 4 steps", async ({ page }) => {
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // Step 0: Welcome → Click Get Started
    await expect(
      page.getByRole("heading", { name: "Welcome to Tuis" })
    ).toBeVisible();
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

    // Step 2: Quick Start → Should show seed options
    await expect(
      page.getByRole("heading", { name: "Quick Start" })
    ).toBeVisible();
    await expect(page.getByText("Common household chores")).toBeVisible();
    await expect(page.getByText("Sample shopping list")).toBeVisible();
    await expect(page.getByText("Sample recipes")).toBeVisible();

    // Click Back to verify navigation works
    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByRole("heading", { name: "Who lives here?" })
    ).toBeVisible();

    // Go forward again
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("heading", { name: "Quick Start" })
    ).toBeVisible();

    // Click Finish Setup and wait for completion
    await page.getByRole("button", { name: "Finish Setup" }).click();

    // Step 3: Done → Should show success
    await expect(
      page.getByRole("heading", { name: /all set/i })
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByRole("button", { name: "Go to Dashboard" })
    ).toBeVisible();

    // Click Go to Dashboard
    await page.getByRole("button", { name: "Go to Dashboard" }).click();
    await page.waitForLoadState("networkidle");

    // Should be on the dashboard now
    await expect(page).toHaveURL("/");
  });

  test("visiting /setup after completion redirects to dashboard", async ({
    page,
  }) => {
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL("/", { timeout: 5000 });
  });
});
