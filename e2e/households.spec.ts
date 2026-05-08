import { test, expect, Page } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const TEST_HOUSEHOLD_NAME = `E2E Household ${Date.now()}`;

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
  // The new household has tasks/quotes/etc. only via cascade once anything is
  // created in it, but in this test we only create the empty household.
  await cleanupTestData(request, "households", "E2E Household%");
});

test("add a household from settings — validates, creates, and updates the UI", async ({
  page,
}) => {
  await page.goto("/settings");
  await dismissUserPickerIfVisible(page);

  // Settings page renders
  await expect(
    page.getByRole("heading", { name: "Settings" }).first()
  ).toBeVisible({ timeout: 10000 });

  // Open the Add Household dialog
  await page.getByRole("button", { name: "Add Household" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5000 });
  await expect(
    dialog.getByRole("heading", { name: "Add Household" })
  ).toBeVisible();

  // Empty submit must not POST (the Name input is `required`)
  let postCalls = 0;
  page.on("request", (req) => {
    if (req.url().endsWith("/api/households") && req.method() === "POST") {
      postCalls++;
    }
  });
  await dialog.getByRole("button", { name: "Add" }).click();
  await page.waitForTimeout(300);
  expect(postCalls).toBe(0);
  await expect(dialog).toBeVisible();

  // Fill the name
  await dialog.getByLabel("Name").fill(TEST_HOUSEHOLD_NAME);

  // Submit and wait for the POST to complete
  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().endsWith("/api/households") &&
      resp.request().method() === "POST"
  );
  await dialog.getByRole("button", { name: "Add" }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();

  // Dialog closes
  await expect(dialog).not.toBeVisible({ timeout: 5000 });

  // The new household appears in the Households card list. Scope the
  // locator to the card to avoid matching <option> elements rendered by
  // the sidebar HouseholdSwitcher (which now shows a combobox because we
  // have 2+ households). CardTitle renders as a styled div, not an <h*>,
  // so match on the title text directly.
  const householdsCard = page
    .locator("[data-slot='card']")
    .filter({
      has: page
        .locator("[data-slot='card-title']")
        .filter({ hasText: /^Households$/ }),
    });
  await expect(
    householdsCard.getByText(TEST_HOUSEHOLD_NAME)
  ).toBeVisible({ timeout: 5000 });

  // Sidebar HouseholdSwitcher upgraded from a static label to a
  // <select> now that there are 2+ households.
  const switcher = page.getByRole("combobox").first();
  await expect(switcher).toBeVisible({ timeout: 5000 });
  await expect(switcher).toHaveValue(/^\d+$/);
});
