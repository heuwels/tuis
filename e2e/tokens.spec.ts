import { test, expect, Page } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const TOKEN_NAME = `E2E Test Token ${Date.now()}`;

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
  await cleanupTestData(request, "tokens", "E2E Test Token%");
});

test.describe.serial("Personal Access Tokens", () => {
  test("should show empty token list on settings page", async ({ page }) => {
    await page.goto("/settings");
    await dismissUserPickerIfVisible(page);

    await expect(
      page.getByRole("heading", { name: "Personal Access Tokens" })
    ).toBeVisible();
    await expect(
      page.getByText("No tokens yet. Create one to use with the CLI.")
    ).toBeVisible();
  });

  test("should create a token with selected scopes", async ({ page }) => {
    await page.goto("/settings");
    await dismissUserPickerIfVisible(page);

    // Open create dialog
    await page.getByRole("button", { name: "Create Token" }).click();
    await expect(
      page.getByRole("heading", { name: "Create Access Token" })
    ).toBeVisible();

    // Fill name
    await page.getByLabel("Token Name").fill(TOKEN_NAME);

    // Select scopes - click "Tasks" group label to select both read+write
    await page.getByRole("button", { name: "Tasks" }).click();

    // Create
    await page.getByRole("button", { name: "Create" }).click();

    // Should show the token once
    await expect(
      page.getByRole("heading", { name: "Token Created" })
    ).toBeVisible();
    await expect(
      page.getByText("Copy this token now. It will not be shown again.")
    ).toBeVisible();

    // Token should be visible in the input
    const tokenInput = page.locator('input[readonly]');
    const tokenValue = await tokenInput.inputValue();
    expect(tokenValue).toMatch(/^tuis_[a-f0-9]{64}$/);

    // Close dialog
    await page.getByRole("button", { name: "Done" }).click();

    // Token should appear in the list
    await expect(page.getByText(TOKEN_NAME)).toBeVisible();
  });

  test("should delete a token", async ({ page }) => {
    await page.goto("/settings");
    await dismissUserPickerIfVisible(page);

    // The token from the previous test should be visible
    await expect(page.getByText(TOKEN_NAME)).toBeVisible();

    // Click delete - handle confirm dialog
    page.on("dialog", (dialog) => dialog.accept());
    // Find the delete button in the row containing our token name
    const container = page.getByText(TOKEN_NAME).locator("../..");
    await container.getByRole("button").click();

    // Token should disappear
    await expect(page.getByText(TOKEN_NAME)).not.toBeVisible({ timeout: 5000 });
  });

  test("should enforce auth via API with valid token", async ({ request }) => {
    // Create a token via API
    const createRes = await request.post("/api/tokens", {
      data: {
        name: `E2E Test Token API ${Date.now()}`,
        scopes: ["tasks:read"],
      },
    });
    expect(createRes.status()).toBe(201);
    const { token, id } = await createRes.json();

    // Use the token to access tasks
    const tasksRes = await request.get("/api/tasks", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(tasksRes.status()).toBe(200);

    // Invalid token should fail
    const badRes = await request.get("/api/tasks", {
      headers: { Authorization: "Bearer tuis_invalid" },
    });
    expect(badRes.status()).toBe(401);

    // Wrong scope should fail
    const wrongScopeRes = await request.post("/api/tasks", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { name: "Test", area: "Kitchen", frequency: "Weekly" },
    });
    expect(wrongScopeRes.status()).toBe(403);

    // Clean up
    await request.delete(`/api/tokens/${id}`);
  });
});
