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
    CREATE TABLE IF NOT EXISTS household_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      measurement_system TEXT NOT NULL DEFAULT 'metric',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOUSEHOLD SETTINGS API
// ═══════════════════════════════════════════════════════════════════════════

describe("Household Settings API", () => {
  let route: typeof import("@/app/api/household-settings/route");

  beforeEach(async () => {
    route = await import("@/app/api/household-settings/route");
  });

  // ── GET /api/household-settings ────────────────────────────────────

  describe("GET /api/household-settings", () => {
    it("returns metric as default when no settings exist", async () => {
      const res = await route.GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.measurementSystem).toBe("metric");
    });

    it("returns saved measurement system", async () => {
      sqlite
        .prepare("INSERT INTO household_settings (measurement_system) VALUES (?)")
        .run("imperial");

      const res = await route.GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.measurementSystem).toBe("imperial");
    });
  });

  // ── PATCH /api/household-settings ──────────────────────────────────

  describe("PATCH /api/household-settings", () => {
    it("creates settings row when none exists", async () => {
      const req = makeRequest(
        "/api/household-settings",
        jsonBody({ measurementSystem: "imperial" })
      );
      const res = await route.PATCH(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.measurementSystem).toBe("imperial");

      // Verify persisted
      const row = sqlite
        .prepare("SELECT measurement_system FROM household_settings")
        .get() as { measurement_system: string };
      expect(row.measurement_system).toBe("imperial");
    });

    it("updates existing settings row", async () => {
      sqlite
        .prepare("INSERT INTO household_settings (measurement_system) VALUES (?)")
        .run("metric");

      const req = makeRequest(
        "/api/household-settings",
        jsonBody({ measurementSystem: "imperial" })
      );
      const res = await route.PATCH(req);
      expect(res.status).toBe(200);

      const row = sqlite
        .prepare("SELECT measurement_system FROM household_settings")
        .get() as { measurement_system: string };
      expect(row.measurement_system).toBe("imperial");
    });

    it("rejects invalid measurement system", async () => {
      const req = makeRequest(
        "/api/household-settings",
        jsonBody({ measurementSystem: "cubits" })
      );
      const res = await route.PATCH(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Invalid measurement system");
    });

    it("rejects missing measurement system", async () => {
      const req = makeRequest(
        "/api/household-settings",
        jsonBody({})
      );
      const res = await route.PATCH(req);
      expect(res.status).toBe(400);
    });

    it("switches back from imperial to metric", async () => {
      sqlite
        .prepare("INSERT INTO household_settings (measurement_system) VALUES (?)")
        .run("imperial");

      const req = makeRequest(
        "/api/household-settings",
        jsonBody({ measurementSystem: "metric" })
      );
      const res = await route.PATCH(req);
      expect(res.status).toBe(200);

      const row = sqlite
        .prepare("SELECT measurement_system FROM household_settings")
        .get() as { measurement_system: string };
      expect(row.measurement_system).toBe("metric");
    });
  });
});
