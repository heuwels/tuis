import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { itemHistory } from "@/lib/db/schema";
import { like, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (query.length < 1) {
      return NextResponse.json([]);
    }

    const suggestions = await db
      .select({
        name: itemHistory.name,
        useCount: itemHistory.useCount,
      })
      .from(itemHistory)
      .where(like(itemHistory.name, `%${query.toLowerCase()}%`))
      .orderBy(desc(itemHistory.useCount), desc(itemHistory.lastUsed))
      .limit(10);

    return NextResponse.json(suggestions.map((s) => s.name));
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
