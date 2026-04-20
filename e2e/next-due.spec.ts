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
  let taskId: number;

  test("create a weekly task that is overdue", async ({ request }) => {
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
    const body = await res.json();
    taskId = body.id;
  });

  test("completing an overdue task from dashboard sets next due to today + frequency", async ({ page, request }) => {
    await page.goto("/");
    await dismissUserPickerIfVisible(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // The overdue task should appear on the dashboard
    const taskText = page.getByText(TEST_TASK_NAME).first();
    await expect(taskText).toBeVisible({ timeout: 10000 });

    // Click the "Done" button for this task — find the closest card-level container
    const taskCard = page.locator("[data-slot='card']").filter({ hasText: TEST_TASK_NAME });
    const doneButton = taskCard.getByRole("button", { name: "Done" }).first();

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/complete") &&
        resp.request().method() === "POST"
    );
    await doneButton.click();
    const response = await responsePromise;
    const body = await response.json();

    // nextDue should be today + 7 days (weekly)
    const today = new Date();
    const expectedNextDue = formatDate(addDays(today, 7));
    expect(body.nextDue).toBe(expectedNextDue);

    // Verify persisted state via API
    const tasksRes = await request.get("/api/tasks");
    const tasks = await tasksRes.json();
    const task = tasks.find((t: { name: string }) => t.name === TEST_TASK_NAME);
    expect(task).toBeTruthy();
    expect(task.nextDue).toBe(expectedNextDue);
    expect(task.lastCompleted).toBe(formatDate(today));
  });

  test("backdated completion via API still sets next due from today", async ({ request }) => {
    // Reset nextDue to the past so the task is overdue again
    const pastDue = formatDate(addDays(new Date(), -3));
    await request.put(`/api/tasks/${taskId}`, {
      data: {
        name: TEST_TASK_NAME,
        area: "Kitchen",
        frequency: "weekly",
        nextDue: pastDue,
      },
    });

    // Complete with a backdated date (5 days ago)
    const pastDate = formatDate(addDays(new Date(), -5));
    const res = await request.post(`/api/tasks/${taskId}/complete`, {
      data: { completedDate: pastDate },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    // Even though completion date is in the past, nextDue should be from TODAY
    const today = new Date();
    const expectedNextDue = formatDate(addDays(today, 7));
    expect(body.nextDue).toBe(expectedNextDue);

    // lastCompleted should be the backdated date
    expect(body.lastCompleted).toBe(pastDate);
  });
});
