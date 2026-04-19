import { test, expect } from "@playwright/test";

test.describe.serial("Docker Compose Wizard", () => {
  test("loads the wizard page with core settings step", async ({ page }) => {
    await page.goto("/setup/docker-wizard");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Docker Compose Wizard" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Core Settings" })
    ).toBeVisible();

    // Default values should be present
    await expect(page.locator("#port")).toHaveValue("6969");
    await expect(page.locator("#volume")).toHaveValue("tuis-data");
    await expect(page.locator("#image-tag")).toHaveValue("latest");
  });

  test("navigates through all wizard steps", async ({ page }) => {
    await page.goto("/setup/docker-wizard");
    await page.waitForLoadState("networkidle");

    // Step 0: Core Settings
    await expect(
      page.getByRole("heading", { name: "Core Settings" })
    ).toBeVisible();

    // Change port
    await page.locator("#port").fill("8080");

    // Go to step 1
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 1: Sidecars
    await expect(
      page.getByRole("heading", { name: "Sidecars" })
    ).toBeVisible();
    await expect(page.getByText("MCP Server")).toBeVisible();
    await expect(page.getByText("More coming soon")).toBeVisible();

    // Enable MCP sidecar
    await page
      .locator("label")
      .filter({ hasText: "MCP Server" })
      .click();

    // Go to step 2
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: Environment Variables
    await expect(
      page.getByRole("heading", { name: "Environment Variables" })
    ).toBeVisible();
    await expect(page.getByLabel("NextAuth Secret")).toBeVisible();
    await expect(page.getByLabel("Google Client ID")).toBeVisible();

    // Go to step 3
    await page.getByRole("button", { name: "Preview" }).click();

    // Step 3: Preview
    await expect(
      page.getByRole("heading", { name: "Your docker-compose.yml" })
    ).toBeVisible();
  });

  test("generated YAML reflects user configuration", async ({ page }) => {
    await page.goto("/setup/docker-wizard");
    await page.waitForLoadState("networkidle");

    // Set custom port
    await page.locator("#port").fill("9090");

    // Continue to sidecars
    await page.getByRole("button", { name: "Continue" }).click();

    // Enable MCP
    await page
      .locator("label")
      .filter({ hasText: "MCP Server" })
      .click();

    // Continue to env vars
    await page.getByRole("button", { name: "Continue" }).click();

    // Continue to preview
    await page.getByRole("button", { name: "Preview" }).click();

    // Verify the YAML content
    const yamlPreview = page.getByTestId("yaml-preview");
    const yamlText = await yamlPreview.textContent();

    expect(yamlText).toContain("9090");
    expect(yamlText).toContain("mcp-server:");
    expect(yamlText).toContain("tuis-mcp");
    expect(yamlText).toContain("ghcr.io/heuwels/tuis");
    expect(yamlText).toContain("tuis-data:/app/data");
  });

  test("back navigation works through all steps", async ({ page }) => {
    await page.goto("/setup/docker-wizard");
    await page.waitForLoadState("networkidle");

    // Navigate forward to preview
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Preview" }).click();

    await expect(
      page.getByRole("heading", { name: "Your docker-compose.yml" })
    ).toBeVisible();

    // Navigate back step by step
    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByRole("heading", { name: "Environment Variables" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByRole("heading", { name: "Sidecars" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByRole("heading", { name: "Core Settings" })
    ).toBeVisible();
  });

  test("copy and download buttons are present on preview", async ({
    page,
  }) => {
    await page.goto("/setup/docker-wizard");
    await page.waitForLoadState("networkidle");

    // Navigate to preview
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Preview" }).click();

    await expect(
      page.getByRole("button", { name: "Copy to Clipboard" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download File" })
    ).toBeVisible();
  });

  test("default YAML without sidecars does not contain mcp-server", async ({
    page,
  }) => {
    await page.goto("/setup/docker-wizard");
    await page.waitForLoadState("networkidle");

    // Navigate straight to preview without enabling anything
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Preview" }).click();

    const yamlPreview = page.getByTestId("yaml-preview");
    const yamlText = await yamlPreview.textContent();

    expect(yamlText).toContain("tuis:");
    expect(yamlText).not.toContain("mcp-server:");
    expect(yamlText).toContain("NODE_ENV=production");
  });
});
