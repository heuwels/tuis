const STORAGE_KEY = "tuis-household-id";

/**
 * Wraps fetch to include X-Household-Id header from localStorage.
 * Use this for API calls to household-bound endpoints (tasks, appliances, vendors, quotes).
 */
export function householdFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const householdId = localStorage.getItem(STORAGE_KEY);
  const headers = new Headers(init?.headers);
  if (householdId) {
    headers.set("X-Household-Id", householdId);
  }
  return fetch(input, { ...init, headers });
}
