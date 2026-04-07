import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shoppingLists, shoppingItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listId = parseInt(id);

    const list = await db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.id, listId))
      .limit(1);

    if (list.length === 0) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(shoppingItems)
      .where(eq(shoppingItems.listId, listId))
      .orderBy(shoppingItems.sortOrder, shoppingItems.createdAt);

    return NextResponse.json({ ...list[0], items });
  } catch (error) {
    console.error("Error fetching shopping list:", error);
    return NextResponse.json(
      { error: "Failed to fetch shopping list" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = await db
      .update(shoppingLists)
      .set({
        ...body,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(shoppingLists.id, parseInt(id)));

    if (result.changes === 0) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating shopping list:", error);
    return NextResponse.json(
      { error: "Failed to update shopping list" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listId = parseInt(id);

    // Items are deleted automatically via ON DELETE CASCADE
    const result = await db
      .delete(shoppingLists)
      .where(eq(shoppingLists.id, listId));

    if (result.changes === 0) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shopping list:", error);
    return NextResponse.json(
      { error: "Failed to delete shopping list" },
      { status: 500 }
    );
  }
}
