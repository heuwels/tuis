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
    CREATE TABLE IF NOT EXISTS shopping_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#3b82f6',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS shopping_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL REFERENCES shopping_lists(id),
      name TEXT NOT NULL,
      quantity TEXT,
      checked INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      added_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      instructions TEXT,
      prep_time INTEGER,
      cook_time INTEGER,
      servings INTEGER,
      image_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL REFERENCES recipes(id),
      name TEXT NOT NULL,
      quantity TEXT,
      amount REAL,
      unit TEXT,
      section TEXT,
      sort_order INTEGER DEFAULT 0
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

function insertUser(name: string, color = "#3b82f6") {
  return sqlite
    .prepare("INSERT INTO users (name, color) VALUES (?, ?)")
    .run(name, color);
}

function countRows(table: string): number {
  return (sqlite.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number }).count;
}

// ═══════════════════════════════════════════════════════════════════════════
// SETUP API
// ═══════════════════════════════════════════════════════════════════════════

describe("Setup API", () => {
  let setupRoute: typeof import("@/app/api/setup/route");

  beforeEach(async () => {
    setupRoute = await import("@/app/api/setup/route");
  });

  // ── GET /api/setup ──────────────────────────────────────────────────

  describe("GET /api/setup", () => {
    it("returns needsSetup: true when no users exist", async () => {
      const req = makeRequest("/api/setup");
      const res = await setupRoute.GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.needsSetup).toBe(true);
    });

    it("returns needsSetup: false when users exist", async () => {
      insertUser("Test User");
      const res = await setupRoute.GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.needsSetup).toBe(false);
    });
  });

  // ── POST /api/setup ─────────────────────────────────────────────────

  describe("POST /api/setup", () => {
    it("seeds chores when seedChores is true", async () => {
      const req = makeRequest(
        "/api/setup",
        jsonBody({ seedChores: true, seedShopping: false, seedRecipes: false })
      );
      const res = await setupRoute.POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.results).toContain("Added 21 household chores");
      expect(countRows("tasks")).toBe(21);
    });

    it("seeds shopping list when seedShopping is true", async () => {
      const req = makeRequest(
        "/api/setup",
        jsonBody({ seedChores: false, seedShopping: true, seedRecipes: false })
      );
      const res = await setupRoute.POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(countRows("shopping_lists")).toBe(1);
      expect(countRows("shopping_items")).toBe(15);

      const list = sqlite
        .prepare("SELECT name, color FROM shopping_lists")
        .get() as { name: string; color: string };
      expect(list.name).toBe("Groceries");
      expect(list.color).toBe("#22c55e");
    });

    it("seeds recipes when seedRecipes is true", async () => {
      const req = makeRequest(
        "/api/setup",
        jsonBody({ seedChores: false, seedShopping: false, seedRecipes: true })
      );
      const res = await setupRoute.POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(countRows("recipes")).toBe(3);

      // Verify ingredients were created
      const ingredientCount = countRows("recipe_ingredients");
      expect(ingredientCount).toBeGreaterThan(0);

      // Verify specific recipe
      const bolognese = sqlite
        .prepare("SELECT * FROM recipes WHERE name = ?")
        .get("Pasta Bolognese") as { id: number; servings: number };
      expect(bolognese).toBeTruthy();
      expect(bolognese.servings).toBe(4);

      // Verify its ingredients
      const ingredients = sqlite
        .prepare("SELECT * FROM recipe_ingredients WHERE recipe_id = ?")
        .all(bolognese.id);
      expect(ingredients).toHaveLength(8);
    });

    it("seeds nothing when all flags are false", async () => {
      const req = makeRequest(
        "/api/setup",
        jsonBody({ seedChores: false, seedShopping: false, seedRecipes: false })
      );
      const res = await setupRoute.POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.results).toHaveLength(0);
      expect(countRows("tasks")).toBe(0);
      expect(countRows("shopping_lists")).toBe(0);
      expect(countRows("recipes")).toBe(0);
    });

    it("seeds all data when all flags are true", async () => {
      const req = makeRequest(
        "/api/setup",
        jsonBody({ seedChores: true, seedShopping: true, seedRecipes: true })
      );
      const res = await setupRoute.POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.results).toHaveLength(3);
      expect(countRows("tasks")).toBe(21);
      expect(countRows("shopping_lists")).toBe(1);
      expect(countRows("shopping_items")).toBe(15);
      expect(countRows("recipes")).toBe(3);
    });

    it("returns 409 if users already exist (idempotency guard)", async () => {
      insertUser("Existing User");

      const req = makeRequest(
        "/api/setup",
        jsonBody({ seedChores: true, seedShopping: true, seedRecipes: true })
      );
      const res = await setupRoute.POST(req);
      expect(res.status).toBe(409);

      const data = await res.json();
      expect(data.error).toContain("already been completed");

      // Verify nothing was seeded
      expect(countRows("tasks")).toBe(0);
      expect(countRows("shopping_lists")).toBe(0);
      expect(countRows("recipes")).toBe(0);
    });

    it("creates chores with correct areas and frequencies", async () => {
      const req = makeRequest(
        "/api/setup",
        jsonBody({ seedChores: true, seedShopping: false, seedRecipes: false })
      );
      await setupRoute.POST(req);

      const kitchenTasks = sqlite
        .prepare("SELECT * FROM tasks WHERE area = 'Kitchen'")
        .all();
      expect(kitchenTasks.length).toBe(6);

      const dailyTasks = sqlite
        .prepare("SELECT * FROM tasks WHERE frequency = 'daily'")
        .all();
      expect(dailyTasks.length).toBe(2);
    });
  });
});
