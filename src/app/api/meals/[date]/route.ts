import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mealPlan, recipes, recipeIngredients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;

    const meal = await db
      .select()
      .from(mealPlan)
      .where(eq(mealPlan.date, date))
      .limit(1);

    if (meal.length === 0) {
      return NextResponse.json(null);
    }

    // If there's a recipe, fetch it with ingredients
    if (meal[0].recipeId) {
      const recipe = await db
        .select()
        .from(recipes)
        .where(eq(recipes.id, meal[0].recipeId))
        .limit(1);

      const ingredients = await db
        .select()
        .from(recipeIngredients)
        .where(eq(recipeIngredients.recipeId, meal[0].recipeId))
        .orderBy(recipeIngredients.sortOrder);

      return NextResponse.json({
        ...meal[0],
        recipe: { ...recipe[0], ingredients },
      });
    }

    return NextResponse.json(meal[0]);
  } catch (error) {
    console.error("Error fetching meal:", error);
    return NextResponse.json(
      { error: "Failed to fetch meal" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const body = await request.json();
    const { recipeId, customMeal, notes, servingsMultiplier } = body;

    // Check if entry exists for this date
    const existing = await db
      .select()
      .from(mealPlan)
      .where(eq(mealPlan.date, date))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(mealPlan)
        .set({
          recipeId: recipeId || null,
          servingsMultiplier: servingsMultiplier ?? 1,
          customMeal: customMeal || null,
          notes: notes || null,
        })
        .where(eq(mealPlan.date, date));
    } else {
      // Insert new
      await db.insert(mealPlan).values({
        date,
        recipeId: recipeId || null,
        servingsMultiplier: servingsMultiplier ?? 1,
        customMeal: customMeal || null,
        notes: notes || null,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating meal:", error);
    return NextResponse.json(
      { error: "Failed to update meal" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;

    await db.delete(mealPlan).where(eq(mealPlan.date, date));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting meal:", error);
    return NextResponse.json(
      { error: "Failed to delete meal" },
      { status: 500 }
    );
  }
}
