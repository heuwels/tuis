import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  tasks,
  completions,
  shoppingLists,
  shoppingItems,
  vendors,
  appliances,
  activities,
  quotes,
  recipes,
  recipeIngredients,
  mealPlan,
  users,
  personalAccessTokens,
  vehicles,
  fuelLogs,
  vehicleServices,
} from "@/lib/db/schema";
import { like, eq, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const VALID_TYPES = [
  "tasks",
  "shopping",
  "appliances",
  "vendors",
  "together",
  "quotes",
  "recipes",
  "meals",
  "users",
  "tokens",
  "vehicles",
] as const;

type CleanupType = (typeof VALID_TYPES)[number];

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { type, namePattern } = body as {
    type: CleanupType;
    namePattern: string;
  };

  if (!type || !namePattern) {
    return NextResponse.json(
      { error: "type and namePattern are required" },
      { status: 400 }
    );
  }

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    let deleted = 0;

    switch (type) {
      case "tasks": {
        // Find matching tasks
        const matchingTasks = await db
          .select({ id: tasks.id })
          .from(tasks)
          .where(like(tasks.name, namePattern));
        if (matchingTasks.length > 0) {
          const taskIds = matchingTasks.map((t) => t.id);
          // Delete completions first (foreign key)
          await db
            .delete(completions)
            .where(inArray(completions.taskId, taskIds));
          // Delete tasks
          const result = await db
            .delete(tasks)
            .where(inArray(tasks.id, taskIds));
          deleted = matchingTasks.length;
        }
        break;
      }

      case "shopping": {
        // Find matching shopping lists
        const matchingLists = await db
          .select({ id: shoppingLists.id })
          .from(shoppingLists)
          .where(like(shoppingLists.name, namePattern));
        if (matchingLists.length > 0) {
          const listIds = matchingLists.map((l) => l.id);
          // Delete items first (foreign key)
          await db
            .delete(shoppingItems)
            .where(inArray(shoppingItems.listId, listIds));
          // Delete lists
          await db
            .delete(shoppingLists)
            .where(inArray(shoppingLists.id, listIds));
          deleted = matchingLists.length;
        }
        break;
      }

      case "appliances": {
        const result = await db
          .delete(appliances)
          .where(like(appliances.name, namePattern));
        deleted = result.changes ?? 0;
        break;
      }

      case "vendors": {
        // Find matching vendors
        const matchingVendors = await db
          .select({ id: vendors.id })
          .from(vendors)
          .where(like(vendors.name, namePattern));
        if (matchingVendors.length > 0) {
          const vendorIds = matchingVendors.map((v) => v.id);
          // Delete quotes first (foreign key)
          await db
            .delete(quotes)
            .where(inArray(quotes.vendorId, vendorIds));
          // Delete vendors
          await db
            .delete(vendors)
            .where(inArray(vendors.id, vendorIds));
          deleted = matchingVendors.length;
        }
        break;
      }

      case "together": {
        const result = await db
          .delete(activities)
          .where(like(activities.title, namePattern));
        deleted = result.changes ?? 0;
        break;
      }

      case "quotes": {
        const result = await db
          .delete(quotes)
          .where(like(quotes.description, namePattern));
        deleted = result.changes ?? 0;
        break;
      }

      case "recipes": {
        // Find matching recipes
        const matchingRecipes = await db
          .select({ id: recipes.id })
          .from(recipes)
          .where(like(recipes.name, namePattern));
        if (matchingRecipes.length > 0) {
          const recipeIds = matchingRecipes.map((r) => r.id);
          // Delete recipe ingredients first (foreign key)
          await db
            .delete(recipeIngredients)
            .where(inArray(recipeIngredients.recipeId, recipeIds));
          // Delete meal plan entries referencing these recipes
          await db
            .delete(mealPlan)
            .where(inArray(mealPlan.recipeId, recipeIds));
          // Delete recipes
          await db
            .delete(recipes)
            .where(inArray(recipes.id, recipeIds));
          deleted = matchingRecipes.length;
        }
        break;
      }

      case "meals": {
        // Delete meal plan entries where customMeal matches the pattern
        const result = await db
          .delete(mealPlan)
          .where(like(mealPlan.customMeal, namePattern));
        deleted = result.changes ?? 0;
        break;
      }

      case "tokens": {
        const result = await db
          .delete(personalAccessTokens)
          .where(like(personalAccessTokens.name, namePattern));
        deleted = result.changes ?? 0;
        break;
      }

      case "vehicles": {
        const matchingVehicles = await db
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(like(vehicles.name, namePattern));
        if (matchingVehicles.length > 0) {
          const vehicleIds = matchingVehicles.map((v) => v.id);
          await db
            .delete(fuelLogs)
            .where(inArray(fuelLogs.vehicleId, vehicleIds));
          await db
            .delete(vehicleServices)
            .where(inArray(vehicleServices.vehicleId, vehicleIds));
          await db
            .delete(vehicles)
            .where(inArray(vehicles.id, vehicleIds));
          deleted = matchingVehicles.length;
        }
        break;
      }

      case "users": {
        // Find matching users
        const matchingUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(like(users.name, namePattern));
        if (matchingUsers.length > 0) {
          const userIds = matchingUsers.map((u) => u.id);
          // Nullify FK references in other tables
          for (const uid of userIds) {
            await db.run(
              sql`UPDATE completions SET completed_by = NULL WHERE completed_by = ${uid}`
            );
            await db.run(
              sql`UPDATE tasks SET assigned_to = NULL WHERE assigned_to = ${uid}`
            );
            await db.run(
              sql`UPDATE shopping_items SET added_by = NULL WHERE added_by = ${uid}`
            );
          }
          // Delete users
          await db
            .delete(users)
            .where(inArray(users.id, userIds));
          deleted = matchingUsers.length;
        }
        break;
      }
    }

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("E2E cleanup error:", error);
    return NextResponse.json(
      { error: "Cleanup failed", details: String(error) },
      { status: 500 }
    );
  }
}
