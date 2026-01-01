import { NextResponse } from "next/server";
import { syncAllTasks } from "@/lib/calendar";

export async function POST() {
  try {
    const result = await syncAllTasks();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error syncing calendar:", error);
    return NextResponse.json(
      { error: "Failed to sync calendar" },
      { status: 500 }
    );
  }
}
