import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Returns true if the property exists AND belongs to the given household.
 * Used by every nested finance route to enforce household scope.
 */
export async function propertyBelongsToHousehold(
  propertyId: number,
  householdId: number
): Promise<boolean> {
  const result = await db
    .select({ id: properties.id })
    .from(properties)
    .where(
      and(
        eq(properties.id, propertyId),
        eq(properties.householdId, householdId)
      )
    )
    .limit(1);
  return result.length > 0;
}
