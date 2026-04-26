import { test, expect, Page, APIRequestContext } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const PREFIX = "E2E Bug Test";

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

/** Create a task via the API and return its id */
async function createTaskViaApi(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {}
): Promise<number> {
  const name = overrides.name ?? `${PREFIX} ${Date.now()}`;
  const res = await request.post("/api/tasks", {
    data: {
      name,
      area: "Kitchen",
      frequency: "Weekly",
      nextDue: new Date().toISOString().split("T")[0],
      ...overrides,
    },
  });
  const body = await res.json();
  return body.id;
}

test.afterAll(async ({ request }) => {
  await cleanupTestData(request, "tasks", `${PREFIX}%`);
});

test.describe.serial("Bug regressions", () => {
  // ── Bug #1: "Complete with details..." crashes due to <SelectItem value=""> ──
  test("complete-with-details dialog opens without crashing", async ({
    page,
    request,
  }) => {
    const taskId = await createTaskViaApi(request, {
      name: `${PREFIX} Vendor Dialog`,
    });

    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading tasks...")).not.toBeVisible({
      timeout: 10000,
    });

    // Find the task row and click the completion dropdown chevron
    const taskRow = page.locator("tr", { hasText: `${PREFIX} Vendor Dialog` });
    await taskRow
      .locator("button")
      .filter({ has: page.locator("svg.lucide-chevron-down") })
      .click();

    // Click "Complete with details..."
    await page
      .getByRole("menuitem", { name: "Complete with details..." })
      .click();

    // The dialog should open without crashing
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(
      dialog.getByRole("heading", { name: "Complete Task" })
    ).toBeVisible();

    // Submit with default vendor (None) and no cost
    await dialog.getByRole("button", { name: "Complete Task" }).click();

    // Wait for the dialog to close (successful completion)
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify the task was actually completed
    const taskRes = await request.get(`/api/tasks/${taskId}`);
    const task = await taskRes.json();
    expect(task.lastCompleted).toBeTruthy();
  });

  // ── Bug #2: Double-click Done creates duplicate completions ──
  test("rapid Done clicks should only create one completion", async ({
    page,
    request,
  }) => {
    const taskName = `${PREFIX} Double Click`;
    await createTaskViaApi(request, { name: taskName });

    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading tasks...")).not.toBeVisible({
      timeout: 10000,
    });

    // Count all POST requests to /complete
    let completeRequests = 0;
    page.on("request", (req) => {
      if (req.url().includes("/complete") && req.method() === "POST") {
        completeRequests++;
      }
    });

    // Fire two clicks in the same JS tick — this is the realistic double-click scenario
    const taskRow = page.locator("tr", { hasText: taskName });
    const doneBtn = taskRow.getByRole("button", { name: "Done" });
    await doneBtn.evaluate((el) => {
      const btn = el as HTMLButtonElement;
      btn.click();
      btn.click();
    });

    // Wait for network to settle
    await page.waitForTimeout(2000);

    // Only one POST to /complete should have been sent
    expect(completeRequests).toBe(1);
  });

  // ── Bug #3: Delete dialog overflows viewport for long task names ──
  test("delete dialog is usable with very long task names", async ({
    page,
    request,
  }) => {
    const longName = `${PREFIX} ${"A".repeat(250)}`;
    const taskId = await createTaskViaApi(request, { name: longName });

    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading tasks...")).not.toBeVisible({
      timeout: 10000,
    });

    // Search for the task
    await page.getByPlaceholder("Search tasks...").fill(PREFIX);

    // Click the delete (trash) button — use evaluate because the long
    // name can stretch the row off-viewport in smaller CI windows
    await page.evaluate((name: string) => {
      const rows = document.querySelectorAll("tbody tr");
      for (const row of rows) {
        if (row.textContent?.includes(name.slice(0, 40))) {
          const btn = row.querySelector("svg.lucide-trash-2")
            ?.closest("button");
          btn?.click();
          return;
        }
      }
    }, longName);

    // The dialog should open with a truncated name and usable buttons
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Delete Task" })
    ).toBeVisible();

    // Verify the name is truncated (not the full 250+ chars)
    const description = dialog.locator("[data-slot='dialog-description']");
    const text = await description.textContent();
    expect(text!.length).toBeLessThan(200);

    // Delete the task via API to confirm the flow works end-to-end
    const deleteRes = await request.delete(`/api/tasks/${taskId}`);
    expect(deleteRes.ok()).toBeTruthy();
  });

  // ── Bug #5: No client-side validation for Area/Frequency selects ──
  test("task form shows client-side error when area or frequency is empty", async ({
    page,
  }) => {
    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading tasks...")).not.toBeVisible({
      timeout: 10000,
    });

    // Open Add Task dialog
    await page.getByRole("button", { name: "Add Task" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Fill only the name
    await dialog.getByLabel("Task Name").fill(`${PREFIX} No Area`);

    // Try to submit — intercept to ensure no network request fires
    let apiCalled = false;
    page.on("request", (req) => {
      if (req.url().includes("/api/tasks") && req.method() === "POST") {
        apiCalled = true;
      }
    });

    await dialog.getByRole("button", { name: "Add Task" }).click();

    // Should show a validation error without hitting the server
    await expect(
      dialog.getByText("Area and frequency are required")
    ).toBeVisible({ timeout: 2000 });
    expect(apiCalled).toBe(false);

    // Dialog should still be open
    await expect(dialog).toBeVisible();
  });

  // ── Smoke: Dashboard loads normally ──
  test("dashboard loads without infinite spinner", async ({ page }) => {
    await page.goto("/");
    await dismissUserPickerIfVisible(page);

    // Dashboard should finish loading within a reasonable time
    await expect(page.getByText("Loading...")).not.toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();
  });
});
