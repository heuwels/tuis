import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mealPlan, recipes, recipeIngredients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { date } = await params;

    const meals = await db
      .select()
      .from(mealPlan)
      .where(eq(mealPlan.date, date));

    if (meals.length === 0) {
      return NextResponse.json([]);
    }

    // Enrich each slot with recipe details if applicable
    const enriched = await Promise.all(
      meals.map(async (meal) => {
        if (!meal.recipeId) return meal;

        const recipe = await db
          .select()
          .from(recipes)
          .where(eq(recipes.id, meal.recipeId))
          .limit(1);

        const ingredients = await db
          .select()
          .from(recipeIngredients)
          .where(eq(recipeIngredients.recipeId, meal.recipeId!))
          .orderBy(recipeIngredients.sortOrder);

        return {
          ...meal,
          recipe: { ...recipe[0], ingredients },
        };
      })
    );

    return NextResponse.json(enriched);
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
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { date } = await params;
    const body = await request.json();
    const { recipeId, customMeal, notes, servingsMultiplier, slot = "main" } = body;

    // Check if entry exists for this date+slot
    const existing = await db
      .select()
      .from(mealPlan)
      .where(and(eq(mealPlan.date, date), eq(mealPlan.slot, slot)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(mealPlan)
        .set({
          recipeId: recipeId || null,
          servingsMultiplier: servingsMultiplier ?? 1,
          customMeal: customMeal || null,
          notes: notes || null,
        })
        .where(and(eq(mealPlan.date, date), eq(mealPlan.slot, slot)));
    } else {
      await db.insert(mealPlan).values({
        date,
        slot,
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
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { date } = await params;
    const { searchParams } = new URL(request.url);
    const slot = searchParams.get("slot");

    if (slot) {
      await db.delete(mealPlan).where(
        and(eq(mealPlan.date, date), eq(mealPlan.slot, slot))
      );
    } else {
      await db.delete(mealPlan).where(eq(mealPlan.date, date));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting meal:", error);
    return NextResponse.json(
      { error: "Failed to delete meal" },
      { status: 500 }
    );
  }
}
