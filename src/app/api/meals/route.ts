import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mealPlan, recipes } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

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

    const meals = await db
      .select({
        id: mealPlan.id,
        date: mealPlan.date,
        recipeId: mealPlan.recipeId,
        customMeal: mealPlan.customMeal,
        notes: mealPlan.notes,
        createdAt: mealPlan.createdAt,
        recipeName: recipes.name,
        recipePrepTime: recipes.prepTime,
        recipeCookTime: recipes.cookTime,
        recipeImageUrl: recipes.imageUrl,
      })
      .from(mealPlan)
      .leftJoin(recipes, eq(mealPlan.recipeId, recipes.id))
      .where(and(gte(mealPlan.date, start), lte(mealPlan.date, end)))
      .orderBy(mealPlan.date);

    return NextResponse.json(meals);
  } catch (error) {
    console.error("Error fetching meals:", error);
    return NextResponse.json(
      { error: "Failed to fetch meals" },
      { status: 500 }
    );
  }
}
