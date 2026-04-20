import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select().from(settings);
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { error: "key is required and must be a string" },
        { status: 400 }
      );
    }

    if (value === undefined || value === null || typeof value !== "string") {
      return NextResponse.json(
        { error: "value is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate known settings
    if (key === "unitSystem" && !["metric", "imperial"].includes(value)) {
      return NextResponse.json(
        { error: "unitSystem must be 'metric' or 'imperial'" },
        { status: 400 }
      );
    }

    // Upsert the setting
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(settings)
        .set({ value, updatedAt: new Date().toISOString() })
        .where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({
        key,
        value,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ key, value });
  } catch (error) {
    console.error("Error updating setting:", error);
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    );
  }
}
