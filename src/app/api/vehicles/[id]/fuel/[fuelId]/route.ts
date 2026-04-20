import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fuelLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; fuelId: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { id, fuelId } = await params;
    const vehicleId = parseInt(id);
    const fuelLogId = parseInt(fuelId);

    const result = await db
      .delete(fuelLogs)
      .where(
        and(eq(fuelLogs.id, fuelLogId), eq(fuelLogs.vehicleId, vehicleId))
      );

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Fuel log not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting fuel log:", error);
    return NextResponse.json(
      { error: "Failed to delete fuel log" },
      { status: 500 }
    );
  }
}
