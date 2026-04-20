import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shoppingItems, itemHistory } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";
import { categorizeItem } from "@/lib/shopping-categories";

export async function POST(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const body = await request.json();
    const { listId, name, quantity, addedBy, category: explicitCategory } = body;

    if (!listId || !name) {
      return NextResponse.json(
        { error: "listId and name are required" },
        { status: 400 }
      );
    }

    // Resolve category: explicit > history > auto-detect
    const normalizedName = name.trim().toLowerCase();
    let resolvedCategory: string | null = explicitCategory || null;

    if (!resolvedCategory) {
      // Check item history for a previously stored category
      const historyRows = await db
        .select({ category: itemHistory.category })
        .from(itemHistory)
        .where(eq(itemHistory.name, normalizedName))
        .limit(1);
      if (historyRows.length > 0 && historyRows[0].category) {
        resolvedCategory = historyRows[0].category;
      }
    }

    if (!resolvedCategory) {
      resolvedCategory = categorizeItem(name.trim());
    }

    // Add item to list
    const result = await db.insert(shoppingItems).values({
      listId,
      name: name.trim(),
      quantity: quantity || null,
      category: resolvedCategory,
      addedBy: addedBy || null,
    });

    // Update item history for autocomplete (including category)
    try {
      await db.insert(itemHistory).values({
        name: normalizedName,
        category: resolvedCategory,
        useCount: 1,
        lastUsed: new Date().toISOString(),
      });
    } catch {
      // Item already exists, update count and category
      await db
        .update(itemHistory)
        .set({
          useCount: sql`${itemHistory.useCount} + 1`,
          lastUsed: new Date().toISOString(),
          ...(resolvedCategory ? { category: resolvedCategory } : {}),
        })
        .where(eq(itemHistory.name, normalizedName));
    }

    return NextResponse.json(
      { success: true, id: Number(result.lastInsertRowid) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating shopping item:", error);
    return NextResponse.json(
      { error: "Failed to create shopping item" },
      { status: 500 }
    );
  }
}
