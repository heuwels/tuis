import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { personalAccessTokens } from "@/lib/db/schema";
import { hashToken } from "@/lib/auth/validate";
import { ALL_SCOPES } from "@/lib/auth/scopes";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tokens = await db.select().from(personalAccessTokens);
    // Never return the hash
    return NextResponse.json(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      tokens.map(({ tokenHash: _hash, ...rest }) => rest)
    );
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return NextResponse.json(
      { error: "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, scopes, expiresAt } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json(
        { error: "At least one scope is required" },
        { status: 400 }
      );
    }

    // Validate scopes
    const invalidScopes = scopes.filter((s: string) => !ALL_SCOPES.includes(s));
    if (invalidScopes.length > 0) {
      return NextResponse.json(
        { error: `Invalid scopes: ${invalidScopes.join(", ")}` },
        { status: 400 }
      );
    }

    const rawToken = `tuis_${randomBytes(32).toString("hex")}`;
    const tokenHash = hashToken(rawToken);

    const result = await db.insert(personalAccessTokens).values({
      name,
      tokenHash,
      scopes: JSON.stringify(scopes),
      expiresAt: expiresAt || null,
    });

    return NextResponse.json(
      {
        id: Number(result.lastInsertRowid),
        name,
        token: rawToken, // Only returned once
        scopes,
        expiresAt: expiresAt || null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating token:", error);
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }
}
