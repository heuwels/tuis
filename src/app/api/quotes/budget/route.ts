import { NextResponse } from "next/server";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

const ACTUAL_API_URL = process.env.ACTUAL_API_URL;

export async function GET(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    if (!ACTUAL_API_URL) {
      return NextResponse.json({
        found: false,
        budgeted: 0,
        spent: 0,
        remaining: 0,
        categoryName: null,
      });
    }

    const response = await fetch(`${ACTUAL_API_URL}/api/budget/summary`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch budget" },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Find the "Home Maintenance" category (exact match first)
    const category = data.categories?.find(
      (c: { name: string }) => c.name === "Home Maintenance"
    );

    if (!category) {
      return NextResponse.json({
        found: false,
        budgeted: 0,
        spent: 0,
        remaining: 0,
        categoryName: null,
      });
    }

    return NextResponse.json({
      found: true,
      budgeted: category.budgeted,
      spent: category.spent,
      remaining: category.balance,
      categoryName: category.name,
    });
  } catch (error) {
    console.error("Error fetching budget from Actual:", error);
    return NextResponse.json(
      { error: "Failed to connect to Actual Budget" },
      { status: 502 }
    );
  }
}
