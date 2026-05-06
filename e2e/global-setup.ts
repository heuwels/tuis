import { request } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

/**
 * Ensures at least one user exists before e2e tests run.
 * In CI the database starts empty, so without this the app redirects to /setup.
 */
async function globalSetup() {
  const ctx = await request.newContext({ baseURL: BASE_URL });

  // Check if setup is needed
  const res = await ctx.get("/api/setup");
  const { needsSetup } = await res.json();

  if (needsSetup) {
    // Create a default test user and household so the app works normally
    const userRes = await ctx.post("/api/users", {
      data: { name: "E2E Test User", color: "#3b82f6" },
    });
    const { id: userId } = await userRes.json();
    await ctx.post("/api/households", {
      data: { name: "Home", userId },
    });
  }

  // Warm up the dev server by fetching the setup page so it's compiled
  // before tests run (avoids first-visit compilation timeouts in CI)
  await ctx.get("/setup");

  await ctx.dispose();
}

export default globalSetup;
