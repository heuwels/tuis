import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activityId = parseInt(id);

    const activity = await db
      .select()
      .from(activities)
      .where(eq(activities.id, activityId))
      .limit(1);

    if (activity.length === 0) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    return NextResponse.json(activity[0]);
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
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
    const activityId = parseInt(id);
    const body = await request.json();
    const {
      title,
      category,
      imageUrl,
      notes,
      status,
      completedDate,
      rating,
      url,
      location,
      estimatedCost,
      duration,
      season,
      priority,
      tags,
      review,
    } = body;

    const result = await db
      .update(activities)
      .set({
        title,
        category,
        imageUrl: imageUrl || null,
        notes: notes || null,
        status: status || "wishlist",
        completedDate: completedDate || null,
        rating: rating || null,
        url: url || null,
        location: location || null,
        estimatedCost: estimatedCost || null,
        duration: duration || null,
        season: season || null,
        priority: priority || "medium",
        tags: tags ? JSON.stringify(tags) : null,
        review: review || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(activities.id, activityId));

    if (result.changes === 0) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating activity:", error);
    return NextResponse.json(
      { error: "Failed to update activity" },
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
    const activityId = parseInt(id);

    const result = await db.delete(activities).where(eq(activities.id, activityId));

    if (result.changes === 0) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting activity:", error);
    return NextResponse.json(
      { error: "Failed to delete activity" },
      { status: 500 }
    );
  }
}
