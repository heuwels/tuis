import { NextResponse } from "next/server";
import { get } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const key = path.join("/");

    // Block path traversal
    if (key.includes("..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const file = get(key);
    if (!file) {
      return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse(file.data, {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
