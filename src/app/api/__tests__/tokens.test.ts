import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/db/schema";

// ─── In-memory DB wiring ────────────────────────────────────────────────────

let testDb: ReturnType<typeof drizzle>;
let sqlite: Database.Database;

vi.mock("@/lib/db", () => ({
  get db() {
    return testDb;
  },
  schema,
}));

function createTables() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      area TEXT NOT NULL,
      frequency TEXT NOT NULL,
      assigned_day TEXT,
      season TEXT,
      notes TEXT,
      extended_notes TEXT,
      assigned_to INTEGER REFERENCES users(id),
      appliance_id INTEGER,
      last_completed TEXT,
      next_due TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS personal_access_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      scopes TEXT NOT NULL,
      last_used_at TEXT,
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

beforeEach(() => {
  sqlite = new Database(":memory:");
  testDb = drizzle(sqlite, { schema });
  createTables();
});

afterEach(() => {
  sqlite.close();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(url: string, init?: RequestInit): Request {
  return new Request(`http://localhost${url}`, init);
}

function jsonBody(data: Record<string, unknown>): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN CRUD API
// ═══════════════════════════════════════════════════════════════════════════

describe("Token API", () => {
  let tokenRoute: typeof import("@/app/api/tokens/route");
  let tokenIdRoute: typeof import("@/app/api/tokens/[id]/route");

  beforeEach(async () => {
    tokenRoute = await import("@/app/api/tokens/route");
    tokenIdRoute = await import("@/app/api/tokens/[id]/route");
  });

  describe("POST /api/tokens", () => {
    it("creates a token and returns it once", async () => {
      const req = makeRequest(
        "/api/tokens",
        jsonBody({ name: "CLI", scopes: ["tasks:read", "tasks:write"] })
      );
      const res = await tokenRoute.POST(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.name).toBe("CLI");
      expect(data.token).toMatch(/^tuis_[a-f0-9]{64}$/);
      expect(data.scopes).toEqual(["tasks:read", "tasks:write"]);
      expect(data.id).toBeDefined();
    });

    it("rejects missing name", async () => {
      const req = makeRequest(
        "/api/tokens",
        jsonBody({ scopes: ["tasks:read"] })
      );
      const res = await tokenRoute.POST(req);
      expect(res.status).toBe(400);
    });

    it("rejects empty scopes", async () => {
      const req = makeRequest(
        "/api/tokens",
        jsonBody({ name: "Test", scopes: [] })
      );
      const res = await tokenRoute.POST(req);
      expect(res.status).toBe(400);
    });

    it("rejects invalid scopes", async () => {
      const req = makeRequest(
        "/api/tokens",
        jsonBody({ name: "Test", scopes: ["invalid:scope"] })
      );
      const res = await tokenRoute.POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("invalid:scope");
    });
  });

  describe("GET /api/tokens", () => {
    it("returns empty array when no tokens", async () => {
      const res = await tokenRoute.GET();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([]);
    });

    it("lists tokens without exposing hashes", async () => {
      // Create a token first
      const createReq = makeRequest(
        "/api/tokens",
        jsonBody({ name: "CLI", scopes: ["tasks:read"] })
      );
      await tokenRoute.POST(createReq);

      const res = await tokenRoute.GET();
      expect(res.status).toBe(200);
      const tokens = await res.json();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].name).toBe("CLI");
      expect(tokens[0].tokenHash).toBeUndefined();
      expect(tokens[0].token).toBeUndefined();
    });
  });

  describe("DELETE /api/tokens/:id", () => {
    it("deletes an existing token", async () => {
      const createReq = makeRequest(
        "/api/tokens",
        jsonBody({ name: "CLI", scopes: ["tasks:read"] })
      );
      const createRes = await tokenRoute.POST(createReq);
      const { id } = await createRes.json();

      const deleteReq = makeRequest(`/api/tokens/${id}`, {
        method: "DELETE",
      });
      const res = await tokenIdRoute.DELETE(deleteReq, {
        params: Promise.resolve({ id: String(id) }),
      });
      expect(res.status).toBe(200);

      // Verify it's gone
      const listRes = await tokenRoute.GET();
      expect(await listRes.json()).toEqual([]);
    });

    it("returns 404 for non-existent token", async () => {
      const req = makeRequest("/api/tokens/999", { method: "DELETE" });
      const res = await tokenIdRoute.DELETE(req, {
        params: Promise.resolve({ id: "999" }),
      });
      expect(res.status).toBe(404);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

describe("Auth Validation", () => {
  let taskRoute: typeof import("@/app/api/tasks/route");
  let tokenRoute: typeof import("@/app/api/tokens/route");

  beforeEach(async () => {
    taskRoute = await import("@/app/api/tasks/route");
    tokenRoute = await import("@/app/api/tokens/route");
  });

  it("allows requests without Authorization header (web UI)", async () => {
    const req = makeRequest("/api/tasks");
    const res = await taskRoute.GET(req);
    expect(res.status).toBe(200);
  });

  it("allows requests with valid token and correct scope", async () => {
    // Create a token with tasks:read scope
    const createReq = makeRequest(
      "/api/tokens",
      jsonBody({ name: "Test", scopes: ["tasks:read"] })
    );
    const createRes = await tokenRoute.POST(createReq);
    const { token } = await createRes.json();

    const req = new Request("http://localhost/api/tasks", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await taskRoute.GET(req);
    expect(res.status).toBe(200);
  });

  it("rejects invalid token with 401", async () => {
    const req = new Request("http://localhost/api/tasks", {
      headers: { Authorization: "Bearer tuis_invalidtoken123" },
    });
    const res = await taskRoute.GET(req);
    expect(res.status).toBe(401);
  });

  it("rejects non-Bearer auth with 401", async () => {
    const req = new Request("http://localhost/api/tasks", {
      headers: { Authorization: "Basic abc123" },
    });
    const res = await taskRoute.GET(req);
    expect(res.status).toBe(401);
  });

  it("rejects token without required scope with 403", async () => {
    // Create a token with only shopping:read scope
    const createReq = makeRequest(
      "/api/tokens",
      jsonBody({ name: "Limited", scopes: ["shopping:read"] })
    );
    const createRes = await tokenRoute.POST(createReq);
    const { token } = await createRes.json();

    // Try to access tasks (needs tasks:read)
    const req = new Request("http://localhost/api/tasks", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await taskRoute.GET(req);
    expect(res.status).toBe(403);
  });

  it("rejects expired token with 401", async () => {
    // Create a token with past expiry
    const createReq = makeRequest(
      "/api/tokens",
      jsonBody({
        name: "Expired",
        scopes: ["tasks:read"],
        expiresAt: "2020-01-01T00:00:00Z",
      })
    );
    const createRes = await tokenRoute.POST(createReq);
    const { token } = await createRes.json();

    const req = new Request("http://localhost/api/tasks", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await taskRoute.GET(req);
    expect(res.status).toBe(401);
  });

  it("enforces write scope for POST requests", async () => {
    // Create a token with only tasks:read
    const createReq = makeRequest(
      "/api/tokens",
      jsonBody({ name: "ReadOnly", scopes: ["tasks:read"] })
    );
    const createRes = await tokenRoute.POST(createReq);
    const { token } = await createRes.json();

    const req = new Request("http://localhost/api/tasks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Test",
        area: "Kitchen",
        frequency: "Weekly",
      }),
    });
    const res = await taskRoute.POST(req);
    expect(res.status).toBe(403);
  });
});
