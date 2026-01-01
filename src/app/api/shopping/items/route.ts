import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shoppingItems, itemHistory } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { listId, name, quantity, addedBy } = body;

    if (!listId || !name) {
      return NextResponse.json(
        { error: "listId and name are required" },
        { status: 400 }
      );
    }

    // Add item to list
    const result = await db.insert(shoppingItems).values({
      listId,
      name: name.trim(),
      quantity: quantity || null,
      addedBy: addedBy || null,
    });

    // Update item history for autocomplete
    const normalizedName = name.trim().toLowerCase();
    try {
      await db.insert(itemHistory).values({
        name: normalizedName,
        useCount: 1,
        lastUsed: new Date().toISOString(),
      });
    } catch {
      // Item already exists, update count
      await db
        .update(itemHistory)
        .set({
          useCount: sql`${itemHistory.useCount} + 1`,
          lastUsed: new Date().toISOString(),
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
