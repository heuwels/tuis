/**
 * Extract household ID from the X-Household-Id header.
 * Returns null if not present.
 */
export function getHouseholdId(request: Request): number | null {
  const header = request.headers.get("X-Household-Id");
  if (!header) return null;
  const parsed = parseInt(header);
  return isNaN(parsed) ? null : parsed;
}
