import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shoppingItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = await db
      .update(shoppingItems)
      .set(body)
      .where(eq(shoppingItems.id, parseInt(id)));

    if (result.changes === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating shopping item:", error);
    return NextResponse.json(
      { error: "Failed to update shopping item" },
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

    const result = await db
      .delete(shoppingItems)
      .where(eq(shoppingItems.id, parseInt(id)));

    if (result.changes === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shopping item:", error);
    return NextResponse.json(
      { error: "Failed to delete shopping item" },
      { status: 500 }
    );
  }
}
