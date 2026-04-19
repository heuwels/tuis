import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { validateApiRequest } from "@/lib/auth/validate";

const VALID_CATEGORIES = ["location", "activity", "restaurant", "dish", "film"];
const VALID_STATUSES = ["wishlist", "planned", "completed"];
const VALID_PRIORITIES = ["low", "medium", "high"];
const VALID_COSTS = ["low", "medium", "high", "splurge"];
const VALID_DURATIONS = ["quick", "half-day", "full-day", "weekend", "week+"];
const VALID_SEASONS = ["any", "spring", "summer", "fall", "winter"];

interface ImportActivity {
  title: string;
  category: string;
  imageUrl?: string | null;
  notes?: string | null;
  status?: string;
  completedDate?: string | null;
  rating?: number | null;
  url?: string | null;
  location?: string | null;
  estimatedCost?: string | null;
  duration?: string | null;
  season?: string | null;
  priority?: string | null;
  tags?: string[] | string | null;
  review?: string | null;
}

interface ImportData {
  version?: string;
  activities: ImportActivity[];
}

function validateActivity(item: ImportActivity, index: number): string[] {
  const errors: string[] = [];

  if (!item.title || typeof item.title !== "string" || !item.title.trim()) {
    errors.push(`Item ${index + 1}: title is required`);
  }

  if (!item.category || !VALID_CATEGORIES.includes(item.category)) {
    errors.push(
      `Item ${index + 1}: category must be one of: ${VALID_CATEGORIES.join(", ")}`
    );
  }

  if (item.status && !VALID_STATUSES.includes(item.status)) {
    errors.push(
      `Item ${index + 1}: status must be one of: ${VALID_STATUSES.join(", ")}`
    );
  }

  if (item.priority && !VALID_PRIORITIES.includes(item.priority)) {
    errors.push(
      `Item ${index + 1}: priority must be one of: ${VALID_PRIORITIES.join(", ")}`
    );
  }

  if (item.estimatedCost && !VALID_COSTS.includes(item.estimatedCost)) {
    errors.push(
      `Item ${index + 1}: estimatedCost must be one of: ${VALID_COSTS.join(", ")}`
    );
  }

  if (item.duration && !VALID_DURATIONS.includes(item.duration)) {
    errors.push(
      `Item ${index + 1}: duration must be one of: ${VALID_DURATIONS.join(", ")}`
    );
  }

  if (item.season && !VALID_SEASONS.includes(item.season)) {
    errors.push(
      `Item ${index + 1}: season must be one of: ${VALID_SEASONS.join(", ")}`
    );
  }

  if (item.rating !== undefined && item.rating !== null) {
    const rating = Number(item.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      errors.push(`Item ${index + 1}: rating must be between 1 and 5`);
    }
  }

  return errors;
}

export async function POST(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const body = await request.json();

    // Validate structure
    let data: ImportData;
    if (Array.isArray(body)) {
      // Allow plain array of activities
      data = { activities: body };
    } else if (body.activities && Array.isArray(body.activities)) {
      data = body;
    } else {
      return NextResponse.json(
        {
          error:
            "Invalid format. Expected { activities: [...] } or an array of activities.",
        },
        { status: 400 }
      );
    }

    if (data.activities.length === 0) {
      return NextResponse.json(
        { error: "No activities to import" },
        { status: 400 }
      );
    }

    // Validate all items first
    const allErrors: string[] = [];
    for (let i = 0; i < data.activities.length; i++) {
      const errors = validateActivity(data.activities[i], i);
      allErrors.push(...errors);
    }

    if (allErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: allErrors },
        { status: 400 }
      );
    }

    // Import all activities
    let imported = 0;
    for (const item of data.activities) {
      await db.insert(activities).values({
        title: item.title.trim(),
        category: item.category,
        imageUrl: item.imageUrl || null,
        notes: item.notes || null,
        status: item.status || "wishlist",
        completedDate: item.completedDate || null,
        rating: item.rating ? Number(item.rating) : null,
        url: item.url || null,
        location: item.location || null,
        estimatedCost: item.estimatedCost || null,
        duration: item.duration || null,
        season: item.season || null,
        priority: item.priority || "medium",
        tags: item.tags
          ? JSON.stringify(Array.isArray(item.tags) ? item.tags : [item.tags])
          : null,
        review: item.review || null,
      });
      imported++;
    }

    return NextResponse.json(
      { success: true, imported },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error importing activities:", error);
    return NextResponse.json(
      { error: "Failed to import activities" },
      { status: 500 }
    );
  }
}
