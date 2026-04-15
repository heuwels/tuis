import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipes, recipeIngredients } from "@/lib/db/schema";
import { desc, like } from "drizzle-orm";
import { formatIngredient, IngredientUnit } from "@/lib/ingredients";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    let allRecipes;
    if (query) {
      allRecipes = await db
        .select()
        .from(recipes)
        .where(like(recipes.name, `%${query}%`))
        .orderBy(desc(recipes.updatedAt));
    } else {
      allRecipes = await db
        .select()
        .from(recipes)
        .orderBy(desc(recipes.updatedAt));
    }

    return NextResponse.json(allRecipes);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, instructions, prepTime, cookTime, servings, imageUrl, category, ingredients } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Create the recipe
    const result = await db.insert(recipes).values({
      name,
      description: description || null,
      instructions: instructions || null,
      prepTime: prepTime || null,
      cookTime: cookTime || null,
      servings: servings || null,
      category: category || "main",
      imageUrl: imageUrl || null,
    });

    const recipeId = Number(result.lastInsertRowid);

    // Add ingredients if provided
    if (ingredients && ingredients.length > 0) {
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        if (ing.name) {
          const amount = ing.amount != null ? Number(ing.amount) : null;
          const unit = ing.unit || null;
          const quantity =
            amount != null && unit
              ? formatIngredient(amount, unit as IngredientUnit)
              : ing.quantity || null;

          await db.insert(recipeIngredients).values({
            recipeId,
            name: ing.name,
            quantity,
            amount: amount != null && !isNaN(amount) ? amount : null,
            unit,
            section: ing.section || null,
            sortOrder: i,
          });
        }
      }
    }

    return NextResponse.json(
      { success: true, id: recipeId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating recipe:", error);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}
