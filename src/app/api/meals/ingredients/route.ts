import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mealPlan, recipeIngredients, shoppingItems } from "@/lib/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { aggregateIngredients, IngredientUnit } from "@/lib/ingredients";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

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

    // Build a map of recipeId -> multipliers (a recipe can appear on multiple days)
    const recipeMultipliers = new Map<number, number[]>();
    for (const meal of meals) {
      if (meal.recipeId) {
        const multiplier = meal.servingsMultiplier ?? 1;
        if (!recipeMultipliers.has(meal.recipeId)) {
          recipeMultipliers.set(meal.recipeId, []);
        }
        recipeMultipliers.get(meal.recipeId)!.push(multiplier);
      }
    }

    const recipeIds = Array.from(recipeMultipliers.keys());

    if (recipeIds.length === 0) {
      return NextResponse.json({ ingredients: [], onList: [] });
    }

    // Get all ingredients for these recipes
    const ingredients = await db
      .select()
      .from(recipeIngredients)
      .where(inArray(recipeIngredients.recipeId, recipeIds))
      .orderBy(recipeIngredients.name);

    // Expand ingredients: for each meal occurrence, apply its multiplier
    const expandedIngredients: { name: string; amount: number | null; unit: IngredientUnit | null; quantity: string | null }[] = [];

    for (const ing of ingredients) {
      const multipliers = recipeMultipliers.get(ing.recipeId) || [1];
      for (const mult of multipliers) {
        expandedIngredients.push({
          name: ing.name,
          amount: ing.amount != null ? ing.amount * mult : ing.amount,
          unit: ing.unit as IngredientUnit | null,
          quantity: ing.quantity,
        });
      }
    }

    // Aggregate ingredients numerically where possible
    const uniqueIngredients = aggregateIngredients(expandedIngredients);

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
