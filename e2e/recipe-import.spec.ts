import { test, expect, Page } from "@playwright/test";

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

test.describe("Recipe Import from URL", () => {
  test.describe.serial("Import Dialog UI", () => {
    test("should show Import from URL button on recipes page", async ({
      page,
    }) => {
      await page.goto("/recipes");
      await dismissUserPickerIfVisible(page);

      await expect(
        page.getByRole("button", { name: "Import from URL" })
      ).toBeVisible();
    });

    test("should open import dialog when button is clicked", async ({
      page,
    }) => {
      await page.goto("/recipes");
      await dismissUserPickerIfVisible(page);

      await page.getByRole("button", { name: "Import from URL" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Import Recipe from URL" })
      ).toBeVisible();
      await expect(dialog.getByLabel("Recipe URL")).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "Import" })
      ).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "Cancel" })
      ).toBeVisible();
    });

    test("should close dialog when Cancel is clicked", async ({ page }) => {
      await page.goto("/recipes");
      await dismissUserPickerIfVisible(page);

      await page.getByRole("button", { name: "Import from URL" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    });

    test("should disable Import button when URL is empty", async ({
      page,
    }) => {
      await page.goto("/recipes");
      await dismissUserPickerIfVisible(page);

      await page.getByRole("button", { name: "Import from URL" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      const importButton = dialog.getByRole("button", { name: "Import" });
      await expect(importButton).toBeDisabled();
    });

    test("should show error for invalid URL", async ({ page }) => {
      await page.goto("/recipes");
      await dismissUserPickerIfVisible(page);

      await page.getByRole("button", { name: "Import from URL" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      await dialog.getByLabel("Recipe URL").fill("not-a-valid-url");

      // Wait for the import button to be enabled then click
      const importButton = dialog.getByRole("button", { name: "Import" });
      await importButton.click();

      // Should show an error message
      await expect(
        dialog.getByText(/Invalid URL|Failed|error/i)
      ).toBeVisible({ timeout: 10000 });
    });

    test("should show error for unreachable URL", async ({ page }) => {
      await page.goto("/recipes");
      await dismissUserPickerIfVisible(page);

      await page.getByRole("button", { name: "Import from URL" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Use a local unreachable URL to avoid external dependencies
      await dialog
        .getByLabel("Recipe URL")
        .fill("http://localhost:1/recipe");

      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/recipes/import") &&
          resp.request().method() === "POST"
      );

      await dialog.getByRole("button", { name: "Import" }).click();
      await responsePromise;

      // Should show an error
      await expect(
        dialog.getByText(/Failed|error|timed out/i)
      ).toBeVisible({ timeout: 15000 });
    });
  });
});
