import { test, expect, Page } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const PREFIX = `E2E Sort Test ${Date.now()}`;
const TASK_DAILY = `${PREFIX} alpha-daily`;
const TASK_WEEKLY = `${PREFIX} beta-weekly`;
const TASK_MONTHLY = `${PREFIX} gamma-monthly`;

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
  await cleanupTestData(request, "tasks", "E2E Sort Test%");
});

test.describe.serial("TaskTable column sorting", () => {
  const ids: Record<string, number> = {};

  test("seed three tasks with distinct frequency, nextDue, and lastCompleted", async ({ request }) => {
    const householdsRes = await request.get("/api/households");
    const households = await householdsRes.json();
    const householdId = households[0].id;

    const seeds = [
      { name: TASK_DAILY, frequency: "daily", nextDue: "2030-01-10" },
      { name: TASK_WEEKLY, frequency: "weekly", nextDue: "2030-01-05" },
      { name: TASK_MONTHLY, frequency: "monthly", nextDue: "2030-01-20" },
    ];

    for (const seed of seeds) {
      const res = await request.post(`/api/households/${householdId}/tasks`, {
        data: { area: "Kitchen", ...seed },
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      ids[seed.name] = body.id;
    }

    // Backdate completions so Last Done has deterministic non-null values
    // for two tasks; the monthly one stays null (sorts to the end).
    // The complete endpoint overwrites nextDue, so PUT it back afterwards.
    const completions = [
      { id: ids[TASK_DAILY], completedDate: "2025-01-01", nextDue: "2030-01-10" },
      { id: ids[TASK_WEEKLY], completedDate: "2025-01-03", nextDue: "2030-01-05" },
    ];
    for (const c of completions) {
      const compRes = await request.post(`/api/tasks/${c.id}/complete`, {
        data: { completedDate: c.completedDate },
      });
      expect(compRes.ok()).toBeTruthy();
      const putRes = await request.put(`/api/tasks/${c.id}`, {
        data: { nextDue: c.nextDue },
      });
      expect(putRes.ok()).toBeTruthy();
    }
  });

  test("defaults to Next Due ascending and toggles when reclicked", async ({ page }) => {
    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading tasks...")).not.toBeVisible({ timeout: 10000 });

    // Narrow the table to our three seeded rows
    await page.getByPlaceholder("Search tasks...").fill(PREFIX);

    const taskRows = page.locator("table tbody tr");
    await expect(taskRows).toHaveCount(3);

    // Default sort: Next Due ascending → weekly (Jan 5), daily (Jan 10), monthly (Jan 20)
    await expect(taskRows.nth(0)).toContainText(TASK_WEEKLY);
    await expect(taskRows.nth(1)).toContainText(TASK_DAILY);
    await expect(taskRows.nth(2)).toContainText(TASK_MONTHLY);

    await expect(
      page.getByRole("columnheader", { name: /Next Due/ })
    ).toHaveAttribute("aria-sort", "ascending");

    // Toggle Next Due to descending
    await page.getByRole("button", { name: "Sort by Next Due" }).click();
    await expect(taskRows.nth(0)).toContainText(TASK_MONTHLY);
    await expect(taskRows.nth(1)).toContainText(TASK_DAILY);
    await expect(taskRows.nth(2)).toContainText(TASK_WEEKLY);

    await expect(
      page.getByRole("columnheader", { name: /Next Due/ })
    ).toHaveAttribute("aria-sort", "descending");
  });

  test("sorts by Frequency using semantic rank and toggles direction", async ({ page }) => {
    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading tasks...")).not.toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder("Search tasks...").fill(PREFIX);

    const taskRows = page.locator("table tbody tr");
    await expect(taskRows).toHaveCount(3);

    // Ascending: daily (rank 1), weekly (3), monthly (5)
    await page.getByRole("button", { name: "Sort by Frequency" }).click();
    await expect(taskRows.nth(0)).toContainText(TASK_DAILY);
    await expect(taskRows.nth(1)).toContainText(TASK_WEEKLY);
    await expect(taskRows.nth(2)).toContainText(TASK_MONTHLY);

    await expect(
      page.getByRole("columnheader", { name: /Frequency/ })
    ).toHaveAttribute("aria-sort", "ascending");

    // Descending
    await page.getByRole("button", { name: "Sort by Frequency" }).click();
    await expect(taskRows.nth(0)).toContainText(TASK_MONTHLY);
    await expect(taskRows.nth(1)).toContainText(TASK_WEEKLY);
    await expect(taskRows.nth(2)).toContainText(TASK_DAILY);

    await expect(
      page.getByRole("columnheader", { name: /Frequency/ })
    ).toHaveAttribute("aria-sort", "descending");
  });

  test("sorts by Last Done with nulls at the end", async ({ page }) => {
    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading tasks...")).not.toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder("Search tasks...").fill(PREFIX);

    const taskRows = page.locator("table tbody tr");
    await expect(taskRows).toHaveCount(3);

    // Ascending: daily (2025-01-01), weekly (2025-01-03), monthly (null → end)
    await page.getByRole("button", { name: "Sort by Last Done" }).click();
    await expect(taskRows.nth(0)).toContainText(TASK_DAILY);
    await expect(taskRows.nth(1)).toContainText(TASK_WEEKLY);
    await expect(taskRows.nth(2)).toContainText(TASK_MONTHLY);

    // Descending: still pushes null to the end
    await page.getByRole("button", { name: "Sort by Last Done" }).click();
    await expect(taskRows.nth(0)).toContainText(TASK_WEEKLY);
    await expect(taskRows.nth(1)).toContainText(TASK_DAILY);
    await expect(taskRows.nth(2)).toContainText(TASK_MONTHLY);
  });
});
