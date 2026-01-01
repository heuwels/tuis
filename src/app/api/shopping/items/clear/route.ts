import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shoppingItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { listId } = body;

    if (!listId) {
      return NextResponse.json(
        { error: "listId is required" },
        { status: 400 }
      );
    }

    const result = await db
      .delete(shoppingItems)
      .where(
        and(
          eq(shoppingItems.listId, listId),
          eq(shoppingItems.checked, true)
        )
      );

    return NextResponse.json({
      success: true,
      deleted: result.changes,
    });
  } catch (error) {
    console.error("Error clearing checked items:", error);
    return NextResponse.json(
      { error: "Failed to clear checked items" },
      { status: 500 }
    );
  }
}
