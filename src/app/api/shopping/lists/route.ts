import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shoppingLists, shoppingItems } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    // Get all lists with item counts
    const lists = await db
      .select({
        id: shoppingLists.id,
        name: shoppingLists.name,
        color: shoppingLists.color,
        sortOrder: shoppingLists.sortOrder,
        createdAt: shoppingLists.createdAt,
        updatedAt: shoppingLists.updatedAt,
        itemCount: sql<number>`count(${shoppingItems.id})`,
        checkedCount: sql<number>`sum(case when ${shoppingItems.checked} = 1 then 1 else 0 end)`,
      })
      .from(shoppingLists)
      .leftJoin(shoppingItems, eq(shoppingLists.id, shoppingItems.listId))
      .groupBy(shoppingLists.id)
      .orderBy(shoppingLists.sortOrder, shoppingLists.createdAt);

    return NextResponse.json(lists);
  } catch (error) {
    console.error("Error fetching shopping lists:", error);
    return NextResponse.json(
      { error: "Failed to fetch shopping lists" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const result = await db.insert(shoppingLists).values({
      name,
      color: color || "#3b82f6",
    });

    return NextResponse.json(
      { success: true, id: Number(result.lastInsertRowid) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating shopping list:", error);
    return NextResponse.json(
      { error: "Failed to create shopping list" },
      { status: 500 }
    );
  }
}
