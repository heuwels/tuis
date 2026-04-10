import { APIRequestContext } from "@playwright/test";

export async function cleanupTestData(
  request: APIRequestContext,
  type: string,
  namePattern: string
) {
  try {
    await request.post("/api/e2e-cleanup", {
      data: { type, namePattern },
    });
  } catch {
    // Cleanup is best-effort; don't fail tests if cleanup itself fails
    console.warn(`Cleanup failed for type=${type} pattern=${namePattern}`);
  }
}
