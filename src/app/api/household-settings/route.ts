import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { householdSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select().from(householdSettings);
    if (rows.length === 0) {
      return NextResponse.json({ measurementSystem: "metric" });
    }
    return NextResponse.json({
      measurementSystem: rows[0].measurementSystem,
    });
  } catch (error) {
    console.error("Error fetching household settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch household settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { measurementSystem } = body;

    if (!measurementSystem || !["metric", "imperial"].includes(measurementSystem)) {
      return NextResponse.json(
        { error: "Invalid measurement system. Must be 'metric' or 'imperial'." },
        { status: 400 }
      );
    }

    const rows = await db.select().from(householdSettings);
    if (rows.length === 0) {
      await db.insert(householdSettings).values({ measurementSystem });
    } else {
      await db
        .update(householdSettings)
        .set({ measurementSystem, updatedAt: new Date().toISOString() })
        .where(eq(householdSettings.id, rows[0].id));
    }

    return NextResponse.json({ measurementSystem });
  } catch (error) {
    console.error("Error updating household settings:", error);
    return NextResponse.json(
      { error: "Failed to update household settings" },
      { status: 500 }
    );
  }
}
