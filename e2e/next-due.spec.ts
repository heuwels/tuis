import { test, expect, Page } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const TEST_TASK_NAME = `E2E Next Due Test ${Date.now()}`;

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

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

test.afterAll(async ({ request }) => {
  await cleanupTestData(request, "tasks", "E2E Next Due Test%");
});

test.describe.serial("Next Due Calculation", () => {
  test("create a weekly task that is overdue", async ({ request }) => {
    // Create a task with nextDue set to 7 days ago so it appears as overdue
    const pastDue = formatDate(addDays(new Date(), -7));

    const res = await request.post("/api/tasks", {
      data: {
        name: TEST_TASK_NAME,
        area: "Kitchen",
        frequency: "weekly",
        notes: "E2E test for next due calculation",
        nextDue: pastDue,
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("completing an overdue task sets next due to today + frequency", async ({ page, request }) => {
    await page.goto("/");
    await dismissUserPickerIfVisible(page);

    // Wait for dashboard to load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // The overdue task should appear on the dashboard
    const taskText = page.getByText(TEST_TASK_NAME);
    await expect(taskText).toBeVisible({ timeout: 10000 });

    // Click the "Done" button for this task
    const taskCard = page.locator("div").filter({ hasText: TEST_TASK_NAME }).first();
    const doneButton = taskCard.getByRole("button", { name: "Done" });

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/complete") &&
        resp.request().method() === "POST"
    );
    await doneButton.click();
    const response = await responsePromise;
    const body = await response.json();

    // Verify the API response: nextDue should be today + 7 days (weekly)
    const today = new Date();
    const expectedNextDue = formatDate(addDays(today, 7));
    expect(body.nextDue).toBe(expectedNextDue);

    // Also verify via direct API call
    const tasksRes = await request.get("/api/tasks");
    const tasks = await tasksRes.json();
    const task = tasks.find((t: { name: string }) => t.name === TEST_TASK_NAME);
    expect(task).toBeTruthy();
    expect(task.nextDue).toBe(expectedNextDue);
    expect(task.lastCompleted).toBe(formatDate(today));
  });

  test("completing via 'complete on date' with a past date still sets next due from today", async ({ page, request }) => {
    // First, set the task's nextDue back to the past so it's overdue again
    const tasksRes = await request.get("/api/tasks");
    const tasks = await tasksRes.json();
    const task = tasks.find((t: { name: string }) => t.name === TEST_TASK_NAME);
    expect(task).toBeTruthy();

    const pastDue = formatDate(addDays(new Date(), -3));
    await request.put(`/api/tasks/${task.id}`, {
      data: {
        ...task,
        nextDue: pastDue,
      },
    });

    // Navigate to dashboard
    await page.goto("/");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Find the task and click the chevron dropdown
    const taskText = page.getByText(TEST_TASK_NAME);
    await expect(taskText).toBeVisible({ timeout: 10000 });

    const taskCard = page.locator("div").filter({ hasText: TEST_TASK_NAME }).first();
    // The chevron is the small button next to "Done"
    const chevronBtn = taskCard.locator("button").filter({ has: page.locator("svg.lucide-chevron-down") });
    await chevronBtn.click();

    // Click "Complete on date..."
    await page.getByRole("menuitem", { name: "Complete on date..." }).click();

    // The calendar dialog should open
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Pick a date 5 days ago
    const pastDate = addDays(new Date(), -5);
    const pastDay = pastDate.getDate();

    // Click the past date in the calendar
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/complete") &&
        resp.request().method() === "POST"
    );
    // Find the day button — use gridcell role
    await dialog.getByRole("gridcell", { name: String(pastDay), exact: true }).getByRole("button").click();
    const response = await responsePromise;
    const body = await response.json();

    // Even though we completed on a past date, nextDue should be from TODAY + 7 days
    const today = new Date();
    const expectedNextDue = formatDate(addDays(today, 7));
    expect(body.nextDue).toBe(expectedNextDue);

    // lastCompleted should be the past date we selected
    expect(body.lastCompleted).toBe(formatDate(pastDate));
  });
});
