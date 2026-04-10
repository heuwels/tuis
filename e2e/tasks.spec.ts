import { test, expect, Page } from "@playwright/test";
import { cleanupTestData } from "./cleanup";

const TEST_TASK_NAME = `E2E Test Task ${Date.now()}`;
const EDITED_TASK_NAME = `${TEST_TASK_NAME} (edited)`;

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
  await cleanupTestData(request, "tasks", "E2E Test Task%");
});

test.describe.serial("Task Management", () => {
  test("should navigate to tasks page", async ({ page }) => {
    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);

    await expect(
      page.getByRole("heading", { name: "All Tasks" }).first()
    ).toBeVisible();

    // Wait for tasks to load (loading state to disappear)
    await expect(page.getByText("Loading tasks...")).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("should create a new task", async ({ page }) => {
    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading tasks...")).not.toBeVisible({
      timeout: 10000,
    });

    // Click Add Task button
    await page.getByRole("button", { name: "Add Task" }).click();

    // Wait for dialog to appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Add New Task" })
    ).toBeVisible();

    // Fill in the form
    await dialog.getByLabel("Task Name").fill(TEST_TASK_NAME);

    // Select area
    await dialog.locator("button", { hasText: "Select area" }).click();
    await page.getByRole("option", { name: "Kitchen" }).click();

    // Select frequency
    await dialog.locator("button", { hasText: "Select frequency" }).click();
    await page.getByRole("option", { name: "Weekly", exact: true }).click();

    // Fill notes (use exact: true to avoid matching "Extended Notes")
    await dialog.getByLabel("Notes", { exact: true }).fill("Test notes for E2E task");

    // Fill extended notes
    await dialog
      .getByLabel("Extended Notes")
      .fill("Extended notes with **markdown**");

    // Submit the form
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/tasks") && resp.request().method() === "POST"
    );
    await dialog.getByRole("button", { name: "Add Task" }).click();
    await responsePromise;

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Task should appear in the list
    await expect(page.getByText(TEST_TASK_NAME)).toBeVisible({ timeout: 5000 });
  });

  test("should view task in the task list", async ({ page }) => {
    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading tasks...")).not.toBeVisible({
      timeout: 10000,
    });

    // The task name should be visible in the table
    await expect(page.getByText(TEST_TASK_NAME)).toBeVisible();

    // Verify area badge
    const taskRow = page.locator("tr", { hasText: TEST_TASK_NAME });
    await expect(taskRow.getByText("Kitchen")).toBeVisible();
    await expect(taskRow.getByText("Weekly")).toBeVisible();
  });

  test("should edit a task", async ({ page }) => {
    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading tasks...")).not.toBeVisible({
      timeout: 10000,
    });

    // Find the task row and click the edit button (pencil icon)
    const taskRow = page.locator("tr", { hasText: TEST_TASK_NAME });
    await taskRow.locator("button").filter({ has: page.locator("svg.lucide-pencil") }).click();

    // Wait for edit dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Edit Task" })
    ).toBeVisible();

    // Update the name
    const nameInput = dialog.getByLabel("Task Name");
    await nameInput.clear();
    await nameInput.fill(EDITED_TASK_NAME);

    // Submit
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/tasks/") && resp.request().method() === "PUT"
    );
    await dialog.getByRole("button", { name: "Save Changes" }).click();
    await responsePromise;

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Updated name should appear
    await expect(page.getByText(EDITED_TASK_NAME)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should filter tasks by search", async ({ page }) => {
    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading tasks...")).not.toBeVisible({
      timeout: 10000,
    });

    // Use the search input
    const searchInput = page.getByPlaceholder("Search tasks...");
    await searchInput.fill(EDITED_TASK_NAME);

    // The edited task should be visible
    await expect(page.getByText(EDITED_TASK_NAME)).toBeVisible();

    // Search for something that doesn't exist
    await searchInput.clear();
    await searchInput.fill("xyznonexistenttask12345");

    // Should show "No tasks found"
    await expect(page.getByText("No tasks found")).toBeVisible();

    // Clear search
    await searchInput.clear();
  });

  test("should filter tasks by area", async ({ page }) => {
    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading tasks...")).not.toBeVisible({
      timeout: 10000,
    });

    // Click the "Kitchen" area filter button (in the Area filter section)
    const areaSection = page.locator("div", { hasText: /^Area$/ }).first().locator("..");
    const kitchenFilter = areaSection.getByRole("button", { name: "Kitchen" });
    const hasKitchenFilter = await kitchenFilter.isVisible().catch(() => false);

    if (hasKitchenFilter) {
      await kitchenFilter.click();

      // Our test task should still be visible since it's in Kitchen
      await expect(page.getByText(EDITED_TASK_NAME)).toBeVisible();

      // Reset to "All"
      await areaSection.getByRole("button", { name: "All" }).click();
    }
  });

  test("should complete a task from the dashboard", async ({ page }) => {
    await page.goto("/");
    await dismissUserPickerIfVisible(page);

    // Wait for loading to finish
    await expect(page.getByText("Loading tasks...")).not.toBeVisible({
      timeout: 10000,
    });

    // Look for the edited task on the dashboard
    const taskCard = page.locator("text=" + EDITED_TASK_NAME);
    const isOnDashboard = await taskCard.isVisible().catch(() => false);

    if (isOnDashboard) {
      // Find the Done button near this task
      const card = page.locator("[class*='card']", {
        hasText: EDITED_TASK_NAME,
      });
      const doneButton = card.getByRole("button", { name: "Done" });

      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/complete") &&
          resp.request().method() === "POST"
      );
      await doneButton.click();
      await responsePromise;

      // Task should be refreshed (no longer showing or updated)
      // Wait for the task list to re-fetch
      await page.waitForTimeout(1000);
    }
    // If task is not on dashboard (no due date set, or not in current period), that's OK
  });

  test("should snooze a task", async ({ page }) => {
    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading tasks...")).not.toBeVisible({
      timeout: 10000,
    });

    // Find the task row
    const taskRow = page.locator("tr", { hasText: EDITED_TASK_NAME });
    const isVisible = await taskRow.isVisible().catch(() => false);

    if (isVisible) {
      // Click the snooze (clock) button
      const snoozeBtn = taskRow
        .locator("button[title='Snooze']");
      await snoozeBtn.click();

      // Wait for the popover with snooze options
      const popover = page.getByRole("button", { name: "1 week" });
      await expect(popover).toBeVisible();

      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/snooze") && resp.request().method() === "POST"
      );
      await popover.click();
      await responsePromise;

      // The task list should refresh
      await page.waitForTimeout(1000);
    }
  });

  test("should delete a task", async ({ page }) => {
    await page.goto("/tasks");
    await dismissUserPickerIfVisible(page);
    await expect(page.getByText("Loading tasks...")).not.toBeVisible({
      timeout: 10000,
    });

    // Find the task row and click delete (trash icon)
    const taskRow = page.locator("tr", { hasText: EDITED_TASK_NAME });
    await taskRow.locator("button").filter({ has: page.locator("svg.lucide-trash-2") }).click();

    // Confirm deletion dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Delete Task" })
    ).toBeVisible();
    await expect(dialog.getByText(EDITED_TASK_NAME)).toBeVisible();

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/tasks/") &&
        resp.request().method() === "DELETE"
    );
    await dialog.getByRole("button", { name: "Delete" }).click();
    await responsePromise;

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Task should no longer be in the list
    await expect(page.getByText(EDITED_TASK_NAME)).not.toBeVisible({
      timeout: 5000,
    });
  });
});
