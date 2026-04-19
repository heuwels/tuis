import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipes, recipeIngredients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { formatIngredient, IngredientUnit } from "@/lib/ingredients";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { id } = await params;
    const recipeId = parseInt(id);

    const recipe = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    if (recipe.length === 0) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const ingredients = await db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, recipeId))
      .orderBy(recipeIngredients.sortOrder);

    return NextResponse.json({ ...recipe[0], ingredients });
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { id } = await params;
    const recipeId = parseInt(id);
    const body = await request.json();
    const { name, description, instructions, prepTime, cookTime, servings, imageUrl, category, ingredients } = body;

    // Update recipe
    const result = await db
      .update(recipes)
      .set({
        name,
        description: description || null,
        instructions: instructions || null,
        prepTime: prepTime || null,
        cookTime: cookTime || null,
        servings: servings || null,
        category: category || "main",
        imageUrl: imageUrl || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(recipes.id, recipeId));

    if (result.changes === 0) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Replace ingredients
    if (ingredients !== undefined) {
      await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeId));

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
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating recipe:", error);
    return NextResponse.json(
      { error: "Failed to update recipe" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { id } = await params;
    const recipeId = parseInt(id);

    // Ingredients are deleted via ON DELETE CASCADE
    const result = await db.delete(recipes).where(eq(recipes.id, recipeId));

    if (result.changes === 0) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 }
    );
  }
}
