import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { desc, eq, and, like } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const query = searchParams.get("q");

    let conditions = [];

    if (status) {
      conditions.push(eq(activities.status, status));
    }
    if (category) {
      conditions.push(eq(activities.category, category));
    }
    if (query) {
      conditions.push(like(activities.title, `%${query}%`));
    }

    let allActivities;
    if (conditions.length > 0) {
      allActivities = await db
        .select()
        .from(activities)
        .where(and(...conditions))
        .orderBy(desc(activities.updatedAt));
    } else {
      allActivities = await db
        .select()
        .from(activities)
        .orderBy(desc(activities.updatedAt));
    }

    return NextResponse.json(allActivities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      category,
      imageUrl,
      notes,
      status,
      url,
      location,
      estimatedCost,
      duration,
      season,
      priority,
      tags,
    } = body;

    if (!title || !category) {
      return NextResponse.json(
        { error: "Title and category are required" },
        { status: 400 }
      );
    }

    const result = await db.insert(activities).values({
      title,
      category,
      imageUrl: imageUrl || null,
      notes: notes || null,
      status: status || "wishlist",
      url: url || null,
      location: location || null,
      estimatedCost: estimatedCost || null,
      duration: duration || null,
      season: season || null,
      priority: priority || "medium",
      tags: tags ? JSON.stringify(tags) : null,
    });

    return NextResponse.json(
      { success: true, id: Number(result.lastInsertRowid) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating activity:", error);
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}
