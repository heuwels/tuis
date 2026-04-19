import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { personalAccessTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ROUTE_SCOPE_MAP } from "./scopes";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export { hashToken };

/**
 * Validate a request against PAT auth.
 *
 * Security model: Tuis is a self-hosted household app with no user auth.
 * PATs are a **restriction mechanism** for programmatic/CLI clients, not an
 * access-control boundary. Requests without an Authorization header get full
 * access (same as the web UI). Only requests that present a Bearer token are
 * validated against scopes and expiry.
 *
 * - No Authorization header → allow (web UI, backward compat)
 * - Bearer token present → validate hash, expiry, scope
 * Returns null if allowed, or a NextResponse error.
 */
export async function validateRequest(
  request: Request,
  requiredScope: string
): Promise<NextResponse | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null; // No auth header = web UI, allow

  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Invalid authorization header" },
      { status: 401 }
    );
  }

  const rawToken = authHeader.slice(7);
  if (!rawToken.startsWith("tuis_")) {
    return NextResponse.json(
      { error: "Invalid token format" },
      { status: 401 }
    );
  }

  const hash = hashToken(rawToken);
  const results = await db
    .select()
    .from(personalAccessTokens)
    .where(eq(personalAccessTokens.tokenHash, hash))
    .limit(1);

  if (results.length === 0) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const pat = results[0];

  // Check expiry — reject if expiresAt is set and is a valid past date
  if (pat.expiresAt) {
    const expiry = new Date(pat.expiresAt);
    if (isNaN(expiry.getTime()) || expiry < new Date()) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
  }

  // Check scope
  let scopes: string[];
  try {
    scopes = JSON.parse(pat.scopes);
  } catch {
    return NextResponse.json(
      { error: "Token has invalid scope data" },
      { status: 401 }
    );
  }
  if (!scopes.includes(requiredScope)) {
    return NextResponse.json(
      { error: "Insufficient scope" },
      { status: 403 }
    );
  }

  // Update last used (fire-and-forget)
  db.update(personalAccessTokens)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(personalAccessTokens.id, pat.id))
    .then(() => {})
    .catch(() => {});

  return null;
}

/**
 * Derive the required scope from a request's URL and method.
 * Returns the scope string or null if the route is not protected.
 */
export function scopeForRoute(pathname: string, method: string): string | null {
  for (const [prefix, scopes] of Object.entries(ROUTE_SCOPE_MAP)) {
    if (pathname.startsWith(prefix)) {
      return method === "GET" ? scopes.read : scopes.write;
    }
  }
  return null;
}

/**
 * Convenience: validate a request using automatic scope detection.
 */
export async function validateApiRequest(
  request: Request
): Promise<NextResponse | null> {
  const url = new URL(request.url);
  const scope = scopeForRoute(url.pathname, request.method);
  if (!scope) return null; // Route not in scope map, allow
  return validateRequest(request, scope);
}
