import { NextResponse } from "next/server";
import { validateApiRequest } from "@/lib/auth/validate";
import { scrapeRecipe } from "@/lib/recipe-scraper";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Basic URL validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    if (!parsedUrl.protocol.startsWith("http")) {
      return NextResponse.json(
        { error: "URL must use HTTP or HTTPS" },
        { status: 400 }
      );
    }

    const recipe = await scrapeRecipe(url);

    return NextResponse.json(recipe);
  } catch (error) {
    console.error("Error importing recipe:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to import recipe";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
