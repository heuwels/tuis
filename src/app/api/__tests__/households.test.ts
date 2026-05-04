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
    CREATE TABLE IF NOT EXISTS households (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS user_households (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      household_id INTEGER NOT NULL REFERENCES households(id),
      role TEXT NOT NULL DEFAULT 'member',
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
      household_id INTEGER REFERENCES households(id),
      last_completed TEXT,
      next_due TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      notes TEXT,
      rating INTEGER,
      household_id INTEGER REFERENCES households(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS appliances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      brand TEXT,
      model TEXT,
      purchase_date TEXT,
      warranty_expiry TEXT,
      manual_url TEXT,
      warranty_doc_url TEXT,
      household_id INTEGER REFERENCES households(id),
      notes TEXT,
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
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

// ─── Import routes ──────────────────────────────────────────────────────────

import * as householdsRoute from "@/app/api/households/route";
import * as householdByIdRoute from "@/app/api/households/[id]/route";
import * as membersRoute from "@/app/api/households/[id]/members/route";
import * as nestedTasksRoute from "@/app/api/households/[householdId]/tasks/route";
import * as nestedVendorsRoute from "@/app/api/households/[householdId]/vendors/route";

// ═══════════════════════════════════════════════════════════════════════════
// HOUSEHOLD CRUD
// ═══════════════════════════════════════════════════════════════════════════

describe("Households API", () => {
  describe("POST /api/households", () => {
    it("creates a household", async () => {
      const res = await householdsRoute.POST(
        makeRequest("/api/households", jsonBody({ name: "Beach House" }))
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.id).toBeDefined();
    });

    it("creates household with owner", async () => {
      // Create a user first
      sqlite.exec(`INSERT INTO users (name, color) VALUES ('Alice', '#3b82f6')`);

      const res = await householdsRoute.POST(
        makeRequest("/api/households", jsonBody({ name: "Home", userId: 1 }))
      );
      expect(res.status).toBe(201);

      // Verify membership
      const members = sqlite
        .prepare("SELECT * FROM user_households WHERE household_id = 1")
        .all() as Array<{ user_id: number; role: string }>;
      expect(members).toHaveLength(1);
      expect(members[0].user_id).toBe(1);
      expect(members[0].role).toBe("owner");
    });

    it("requires a name", async () => {
      const res = await householdsRoute.POST(
        makeRequest("/api/households", jsonBody({}))
      );
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/households", () => {
    it("returns all households", async () => {
      sqlite.exec(`INSERT INTO households (name) VALUES ('Home')`);
      sqlite.exec(`INSERT INTO households (name) VALUES ('Beach')`);

      const res = await householdsRoute.GET(makeRequest("/api/households"));
      const data = await res.json();
      expect(data).toHaveLength(2);
    });

    it("filters by userId", async () => {
      sqlite.exec(`INSERT INTO users (name, color) VALUES ('Alice', '#3b82f6')`);
      sqlite.exec(`INSERT INTO users (name, color) VALUES ('Bob', '#ef4444')`);
      sqlite.exec(`INSERT INTO households (name) VALUES ('Home')`);
      sqlite.exec(`INSERT INTO households (name) VALUES ('Office')`);
      sqlite.exec(`INSERT INTO user_households (user_id, household_id, role) VALUES (1, 1, 'owner')`);
      sqlite.exec(`INSERT INTO user_households (user_id, household_id, role) VALUES (2, 1, 'member')`);
      sqlite.exec(`INSERT INTO user_households (user_id, household_id, role) VALUES (2, 2, 'owner')`);

      const res = await householdsRoute.GET(
        makeRequest("/api/households?userId=1")
      );
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Home");

      const res2 = await householdsRoute.GET(
        makeRequest("/api/households?userId=2")
      );
      const data2 = await res2.json();
      expect(data2).toHaveLength(2);
    });
  });

  describe("PUT /api/households/[id]", () => {
    it("renames a household", async () => {
      sqlite.exec(`INSERT INTO households (name) VALUES ('Home')`);
      const params = Promise.resolve({ id: "1" });

      const res = await householdByIdRoute.PUT(
        makeRequest("/api/households/1", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Our Home" }),
        }),
        { params }
      );
      expect(res.status).toBe(200);

      const row = sqlite.prepare("SELECT name FROM households WHERE id = 1").get() as { name: string };
      expect(row.name).toBe("Our Home");
    });
  });

  describe("Members", () => {
    it("adds and lists members", async () => {
      sqlite.exec(`INSERT INTO users (name, color) VALUES ('Alice', '#3b82f6')`);
      sqlite.exec(`INSERT INTO users (name, color) VALUES ('Bob', '#ef4444')`);
      sqlite.exec(`INSERT INTO households (name) VALUES ('Home')`);

      const params = Promise.resolve({ id: "1" });

      await membersRoute.POST(
        makeRequest("/api/households/1/members", jsonBody({ userId: 1, role: "owner" })),
        { params }
      );
      await membersRoute.POST(
        makeRequest("/api/households/1/members", jsonBody({ userId: 2 })),
        { params: Promise.resolve({ id: "1" }) }
      );

      const res = await membersRoute.GET(
        makeRequest("/api/households/1/members"),
        { params: Promise.resolve({ id: "1" }) }
      );
      const data = await res.json();
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe("Alice");
      expect(data[0].role).toBe("owner");
      expect(data[1].name).toBe("Bob");
      expect(data[1].role).toBe("member");
    });

    it("removes a member", async () => {
      sqlite.exec(`INSERT INTO users (name, color) VALUES ('Alice', '#3b82f6')`);
      sqlite.exec(`INSERT INTO households (name) VALUES ('Home')`);
      sqlite.exec(`INSERT INTO user_households (user_id, household_id, role) VALUES (1, 1, 'owner')`);

      const res = await membersRoute.DELETE(
        makeRequest("/api/households/1/members?userId=1", { method: "DELETE" }),
        { params: Promise.resolve({ id: "1" }) }
      );
      expect(res.status).toBe(200);

      const rows = sqlite.prepare("SELECT * FROM user_households").all();
      expect(rows).toHaveLength(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HOUSEHOLD SCOPING
// ═══════════════════════════════════════════════════════════════════════════

describe("Household Scoping (nested routes)", () => {
  it("tasks are filtered by householdId path param", async () => {
    sqlite.exec(`INSERT INTO households (name) VALUES ('Home')`);
    sqlite.exec(`INSERT INTO households (name) VALUES ('Office')`);
    sqlite.exec(`INSERT INTO tasks (name, area, frequency, household_id) VALUES ('Mow lawn', 'Outdoor', 'weekly', 1)`);
    sqlite.exec(`INSERT INTO tasks (name, area, frequency, household_id) VALUES ('Clean desk', 'Office', 'daily', 2)`);

    // With household 1
    const res1 = await nestedTasksRoute.GET(
      makeRequest("/api/households/1/tasks"),
      { params: Promise.resolve({ householdId: "1" }) }
    );
    const data1 = await res1.json();
    expect(data1).toHaveLength(1);
    expect(data1[0].name).toBe("Mow lawn");

    // With household 2
    const res2 = await nestedTasksRoute.GET(
      makeRequest("/api/households/2/tasks"),
      { params: Promise.resolve({ householdId: "2" }) }
    );
    const data2 = await res2.json();
    expect(data2).toHaveLength(1);
    expect(data2[0].name).toBe("Clean desk");
  });

  it("new tasks are assigned to the household from the path", async () => {
    sqlite.exec(`INSERT INTO households (name) VALUES ('Home')`);

    const res = await nestedTasksRoute.POST(
      makeRequest("/api/households/1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Vacuum",
          area: "Living Room",
          frequency: "weekly",
        }),
      }),
      { params: Promise.resolve({ householdId: "1" }) }
    );
    expect(res.status).toBe(201);

    const row = sqlite.prepare("SELECT household_id FROM tasks WHERE id = 1").get() as { household_id: number };
    expect(row.household_id).toBe(1);
  });

  it("vendors are filtered by household path param", async () => {
    sqlite.exec(`INSERT INTO households (name) VALUES ('Home')`);
    sqlite.exec(`INSERT INTO households (name) VALUES ('Office')`);
    sqlite.exec(`INSERT INTO vendors (name, household_id) VALUES ('Plumber Joe', 1)`);
    sqlite.exec(`INSERT INTO vendors (name, household_id) VALUES ('IT Support', 2)`);

    const res = await nestedVendorsRoute.GET(
      makeRequest("/api/households/1/vendors"),
      { params: Promise.resolve({ householdId: "1" }) }
    );
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Plumber Joe");
  });
});
