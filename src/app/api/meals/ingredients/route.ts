import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mealPlan, recipeIngredients, shoppingItems } from "@/lib/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        { error: "start and end dates are required" },
        { status: 400 }
      );
    }

    // Get all meals with recipes in date range
    const meals = await db
      .select()
      .from(mealPlan)
      .where(
        and(
          gte(mealPlan.date, start),
          lte(mealPlan.date, end)
        )
      );

    // Get recipe IDs that have meals planned
    const recipeIds = meals
      .map((m) => m.recipeId)
      .filter((id): id is number => id !== null);

    if (recipeIds.length === 0) {
      return NextResponse.json({ ingredients: [], onList: [] });
    }

    // Get all ingredients for these recipes
    const ingredients = await db
      .select()
      .from(recipeIngredients)
      .where(inArray(recipeIngredients.recipeId, recipeIds))
      .orderBy(recipeIngredients.name);

    // Deduplicate ingredients by name (combine quantities)
    const ingredientMap = new Map<string, { name: string; quantities: string[] }>();
    for (const ing of ingredients) {
      const key = ing.name.toLowerCase();
      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key)!;
        if (ing.quantity) {
          existing.quantities.push(ing.quantity);
        }
      } else {
        ingredientMap.set(key, {
          name: ing.name,
          quantities: ing.quantity ? [ing.quantity] : [],
        });
      }
    }

    // Convert to array with combined quantities
    const uniqueIngredients = Array.from(ingredientMap.values()).map((ing) => ({
      name: ing.name,
      quantity: ing.quantities.length > 0 ? ing.quantities.join(" + ") : null,
    }));

    // Check which items are already on shopping lists (not checked)
    const allItems = await db
      .select()
      .from(shoppingItems)
      .where(eq(shoppingItems.checked, false));

    const onListNames = new Set(
      allItems.map((item) => item.name.toLowerCase())
    );

    const onList = uniqueIngredients
      .filter((ing) => onListNames.has(ing.name.toLowerCase()))
      .map((ing) => ing.name.toLowerCase());

    return NextResponse.json({
      ingredients: uniqueIngredients,
      onList,
    });
  } catch (error) {
    console.error("Error fetching meal ingredients:", error);
    return NextResponse.json(
      { error: "Failed to fetch ingredients" },
      { status: 500 }
    );
  }
}
