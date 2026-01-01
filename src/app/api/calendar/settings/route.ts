import { NextResponse } from "next/server";
import {
  getConnectionStatus,
  disconnectCalendar,
  toggleSync,
  getAvailableCalendars,
  setCalendarId,
} from "@/lib/calendar";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeCalendars = searchParams.get("calendars") === "true";

    const status = await getConnectionStatus();

    if (includeCalendars && status.connected) {
      const calendars = await getAvailableCalendars();
      return NextResponse.json({ ...status, calendars });
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error getting calendar status:", error);
    return NextResponse.json(
      { error: "Failed to get calendar status" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await disconnectCalendar();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting calendar:", error);
    return NextResponse.json(
      { error: "Failed to disconnect calendar" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (typeof body.syncEnabled === "boolean") {
      await toggleSync(body.syncEnabled);
    }

    if (typeof body.calendarId === "string") {
      await setCalendarId(body.calendarId);
    }

    const status = await getConnectionStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error updating calendar settings:", error);
    return NextResponse.json(
      { error: "Failed to update calendar settings" },
      { status: 500 }
    );
  }
}
