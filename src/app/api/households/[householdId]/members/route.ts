import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userHouseholds, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: id } = await params;
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        color: users.color,
        role: userHouseholds.role,
      })
      .from(userHouseholds)
      .innerJoin(users, eq(users.id, userHouseholds.userId))
      .where(eq(userHouseholds.householdId, parseInt(id)));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching household members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: id } = await params;
    const body = await request.json();
    const { userId, role } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Check for duplicate membership
    const existing = await db
      .select()
      .from(userHouseholds)
      .where(
        and(
          eq(userHouseholds.userId, userId),
          eq(userHouseholds.householdId, parseInt(id))
        )
      );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "User is already a member of this household" },
        { status: 409 }
      );
    }

    await db.insert(userHouseholds).values({
      userId,
      householdId: parseInt(id),
      role: role || "member",
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error adding household member:", error);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId query param is required" },
        { status: 400 }
      );
    }

    // Don't allow removing the last member
    const memberCount = await db
      .select()
      .from(userHouseholds)
      .where(eq(userHouseholds.householdId, parseInt(id)));

    if (memberCount.length <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last member of a household" },
        { status: 400 }
      );
    }

    await db
      .delete(userHouseholds)
      .where(
        and(
          eq(userHouseholds.householdId, parseInt(id)),
          eq(userHouseholds.userId, parseInt(userId))
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing household member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
