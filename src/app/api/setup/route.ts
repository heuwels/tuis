import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  users,
  tasks,
  shoppingLists,
  shoppingItems,
  recipes,
  recipeIngredients,
} from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allUsers = await db.select().from(users);
    return NextResponse.json({ needsSetup: allUsers.length === 0 });
  } catch (error) {
    console.error("Error checking setup status:", error);
    return NextResponse.json(
      { error: "Failed to check setup status" },
      { status: 500 }
    );
  }
}

const STARTER_CHORES = [
  // Kitchen
  { name: "Wash dishes", area: "Kitchen", frequency: "daily" },
  { name: "Wipe kitchen counters", area: "Kitchen", frequency: "daily" },
  { name: "Clean stovetop", area: "Kitchen", frequency: "weekly" },
  { name: "Clean oven", area: "Kitchen", frequency: "monthly" },
  { name: "Clean fridge", area: "Kitchen", frequency: "monthly" },
  { name: "Empty bins", area: "Kitchen", frequency: "twice-weekly" },
  // Bathroom
  { name: "Clean toilet", area: "Bathroom", frequency: "weekly" },
  { name: "Clean shower/bath", area: "Bathroom", frequency: "weekly" },
  { name: "Clean bathroom sink", area: "Bathroom", frequency: "weekly" },
  { name: "Wash towels", area: "Bathroom", frequency: "weekly" },
  // Bedroom
  { name: "Change bed sheets", area: "Bedroom", frequency: "weekly" },
  { name: "Vacuum bedroom", area: "Bedroom", frequency: "weekly" },
  { name: "Dust surfaces", area: "Bedroom", frequency: "fortnightly" },
  // Living areas
  { name: "Vacuum living room", area: "Living Room", frequency: "weekly" },
  { name: "Mop floors", area: "Living Room", frequency: "weekly" },
  { name: "Dust shelves", area: "Living Room", frequency: "fortnightly" },
  // Outdoor
  { name: "Mow lawn", area: "Outdoor", frequency: "fortnightly" },
  { name: "Water garden", area: "Outdoor", frequency: "twice-weekly" },
  { name: "Sweep porch/patio", area: "Outdoor", frequency: "weekly" },
  // Laundry
  { name: "Do laundry", area: "Laundry", frequency: "twice-weekly" },
  { name: "Iron clothes", area: "Laundry", frequency: "weekly" },
];

const STARTER_SHOPPING_ITEMS = [
  "Milk",
  "Bread",
  "Eggs",
  "Butter",
  "Rice",
  "Pasta",
  "Onions",
  "Garlic",
  "Tomatoes",
  "Chicken",
  "Olive oil",
  "Salt",
  "Pepper",
  "Cheese",
  "Bananas",
];

const STARTER_RECIPES = [
  {
    name: "Pasta Bolognese",
    description: "A classic hearty pasta with rich meat sauce",
    prepTime: 15,
    cookTime: 45,
    servings: 4,
    instructions:
      "1. Brown mince in a large pan\n2. Add diced onion, garlic, and carrot, cook until soft\n3. Add tinned tomatoes, tomato paste, and herbs\n4. Simmer for 30 minutes\n5. Cook pasta according to packet directions\n6. Serve sauce over pasta with parmesan",
    ingredients: [
      { name: "Pasta", amount: 400, unit: "g" },
      { name: "Beef mince", amount: 500, unit: "g" },
      { name: "Onion", amount: 1, unit: "whole" },
      { name: "Garlic cloves", amount: 3, unit: "whole" },
      { name: "Tinned tomatoes", amount: 400, unit: "g" },
      { name: "Tomato paste", amount: 2, unit: "tbsp" },
      { name: "Carrot", amount: 1, unit: "whole" },
      { name: "Parmesan", amount: 50, unit: "g" },
    ],
  },
  {
    name: "Chicken Stir-Fry",
    description: "Quick and healthy weeknight stir-fry",
    prepTime: 15,
    cookTime: 10,
    servings: 4,
    instructions:
      "1. Slice chicken into strips\n2. Cut vegetables into bite-sized pieces\n3. Heat oil in a wok over high heat\n4. Cook chicken until golden, set aside\n5. Stir-fry vegetables for 3-4 minutes\n6. Return chicken, add soy sauce and sesame oil\n7. Serve over rice",
    ingredients: [
      { name: "Chicken breast", amount: 500, unit: "g" },
      { name: "Broccoli", amount: 1, unit: "whole" },
      { name: "Capsicum", amount: 1, unit: "whole" },
      { name: "Soy sauce", amount: 3, unit: "tbsp" },
      { name: "Sesame oil", amount: 1, unit: "tsp" },
      { name: "Rice", amount: 2, unit: "cup" },
      { name: "Vegetable oil", amount: 2, unit: "tbsp" },
    ],
  },
  {
    name: "Scrambled Eggs on Toast",
    description: "Simple and satisfying breakfast",
    prepTime: 5,
    cookTime: 5,
    servings: 2,
    instructions:
      "1. Crack eggs into a bowl, add a splash of milk, season\n2. Whisk until combined\n3. Melt butter in a pan over medium-low heat\n4. Add eggs, stir gently with a spatula\n5. Remove from heat while still slightly wet\n6. Serve on buttered toast",
    ingredients: [
      { name: "Eggs", amount: 4, unit: "whole" },
      { name: "Milk", amount: 2, unit: "tbsp" },
      { name: "Butter", amount: 1, unit: "tbsp" },
      { name: "Bread", amount: 4, unit: "slice" },
    ],
  },
];

export async function POST(request: Request) {
  try {
    // Guard: prevent setup if users already exist
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "Setup already completed" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      members,
      seedChores,
      seedShopping,
      seedRecipes,
    }: {
      members: { name: string; color: string }[];
      seedChores: boolean;
      seedShopping: boolean;
      seedRecipes: boolean;
    } = body;

    // Validate members
    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { error: "At least one household member is required" },
        { status: 400 }
      );
    }

    const trimmedMembers = members
      .map((m) => ({ name: m.name?.trim() ?? "", color: m.color }))
      .filter((m) => m.name.length > 0);

    if (trimmedMembers.length === 0) {
      return NextResponse.json(
        { error: "At least one member must have a non-empty name" },
        { status: 400 }
      );
    }

    for (const m of trimmedMembers) {
      if (m.name.length > 50) {
        return NextResponse.json(
          {
            error: `Member name "${m.name.slice(0, 20)}..." exceeds 50 characters`,
          },
          { status: 400 }
        );
      }
    }

    const results: string[] = [];

    // Run everything in a single transaction
    db.transaction((tx) => {
      // Create users
      for (const member of trimmedMembers) {
        tx.insert(users)
          .values({ name: member.name, color: member.color })
          .run();
      }
      results.push(`Created ${trimmedMembers.length} household members`);

      // Seed chores
      if (seedChores) {
        for (const chore of STARTER_CHORES) {
          tx.insert(tasks)
            .values({
              name: chore.name,
              area: chore.area,
              frequency: chore.frequency,
              assignedDay: null,
              season: null,
              notes: null,
              lastCompleted: null,
              nextDue: null,
              applianceId: null,
            })
            .run();
        }
        results.push(`Added ${STARTER_CHORES.length} household chores`);
      }

      // Seed shopping list
      if (seedShopping) {
        const listResult = tx
          .insert(shoppingLists)
          .values({ name: "Groceries", color: "#22c55e" })
          .run();
        const listId = Number(listResult.lastInsertRowid);

        for (let i = 0; i < STARTER_SHOPPING_ITEMS.length; i++) {
          tx.insert(shoppingItems)
            .values({
              listId,
              name: STARTER_SHOPPING_ITEMS[i],
              sortOrder: i,
            })
            .run();
        }
        results.push(
          `Created shopping list with ${STARTER_SHOPPING_ITEMS.length} items`
        );
      }

      // Seed recipes
      if (seedRecipes) {
        for (const recipe of STARTER_RECIPES) {
          const recipeResult = tx
            .insert(recipes)
            .values({
              name: recipe.name,
              description: recipe.description,
              instructions: recipe.instructions,
              prepTime: recipe.prepTime,
              cookTime: recipe.cookTime,
              servings: recipe.servings,
            })
            .run();
          const recipeId = Number(recipeResult.lastInsertRowid);

          for (let i = 0; i < recipe.ingredients.length; i++) {
            const ing = recipe.ingredients[i];
            tx.insert(recipeIngredients)
              .values({
                recipeId,
                name: ing.name,
                amount: ing.amount,
                unit: ing.unit,
                quantity: `${ing.amount} ${ing.unit}`,
                sortOrder: i,
              })
              .run();
          }
        }
        results.push(`Added ${STARTER_RECIPES.length} sample recipes`);
      }
    });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Error during setup:", error);
    return NextResponse.json(
      { error: "Failed to complete setup" },
      { status: 500 }
    );
  }
}
