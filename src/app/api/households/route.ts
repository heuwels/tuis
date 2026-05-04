import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { households, userHouseholds } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (userId) {
      // Get households for a specific user
      const result = await db
        .select({
          id: households.id,
          name: households.name,
          createdAt: households.createdAt,
        })
        .from(households)
        .innerJoin(userHouseholds, eq(userHouseholds.householdId, households.id))
        .where(eq(userHouseholds.userId, parseInt(userId)));

      return NextResponse.json(result);
    }

    const result = await db.select().from(households);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching households:", error);
    return NextResponse.json(
      { error: "Failed to fetch households" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const body = await request.json();
    const { name, userId } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const result = await db.insert(households).values({ name });
    const householdId = Number(result.lastInsertRowid);

    // If a userId is provided, add them as the owner
    if (userId) {
      await db.insert(userHouseholds).values({
        userId,
        householdId,
        role: "owner",
      });
    }

    return NextResponse.json(
      { success: true, id: householdId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating household:", error);
    return NextResponse.json(
      { error: "Failed to create household" },
      { status: 500 }
    );
  }
}
