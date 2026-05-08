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
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER REFERENCES vendors(id),
      description TEXT NOT NULL,
      total REAL NOT NULL,
      labor REAL,
      materials REAL,
      other REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      received_date TEXT,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeRequest(url: string, init?: RequestInit): any {
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
import * as householdByIdRoute from "@/app/api/households/[householdId]/route";
import * as membersRoute from "@/app/api/households/[householdId]/members/route";
import * as nestedTasksRoute from "@/app/api/households/[householdId]/tasks/route";
import * as nestedVendorsRoute from "@/app/api/households/[householdId]/vendors/route";
import * as nestedAppliancesRoute from "@/app/api/households/[householdId]/appliances/route";
import * as nestedQuotesRoute from "@/app/api/households/[householdId]/quotes/route";

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
      const params = Promise.resolve({ householdId: "1" });

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

      const params = Promise.resolve({ householdId: "1" });

      await membersRoute.POST(
        makeRequest("/api/households/1/members", jsonBody({ userId: 1, role: "owner" })),
        { params }
      );
      await membersRoute.POST(
        makeRequest("/api/households/1/members", jsonBody({ userId: 2 })),
        { params: Promise.resolve({ householdId: "1" }) }
      );

      const res = await membersRoute.GET(
        makeRequest("/api/households/1/members"),
        { params: Promise.resolve({ householdId: "1" }) }
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
      sqlite.exec(`INSERT INTO users (name, color) VALUES ('Bob', '#ef4444')`);
      sqlite.exec(`INSERT INTO households (name) VALUES ('Home')`);
      sqlite.exec(`INSERT INTO user_households (user_id, household_id, role) VALUES (1, 1, 'owner')`);
      sqlite.exec(`INSERT INTO user_households (user_id, household_id, role) VALUES (2, 1, 'member')`);

      const res = await membersRoute.DELETE(
        makeRequest("/api/households/1/members?userId=2", { method: "DELETE" }),
        { params: Promise.resolve({ householdId: "1" }) }
      );
      expect(res.status).toBe(200);

      const rows = sqlite.prepare("SELECT * FROM user_households").all();
      expect(rows).toHaveLength(1);
    });

    it("prevents removing the last member", async () => {
      sqlite.exec(`INSERT INTO users (name, color) VALUES ('Alice', '#3b82f6')`);
      sqlite.exec(`INSERT INTO households (name) VALUES ('Home')`);
      sqlite.exec(`INSERT INTO user_households (user_id, household_id, role) VALUES (1, 1, 'owner')`);

      const res = await membersRoute.DELETE(
        makeRequest("/api/households/1/members?userId=1", { method: "DELETE" }),
        { params: Promise.resolve({ householdId: "1" }) }
      );
      expect(res.status).toBe(400);
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

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-HOUSEHOLD ISOLATION
// ═══════════════════════════════════════════════════════════════════════════

describe("Multi-Household Isolation", () => {
  // Helper: seed two households with a shared user and one unique user each
  function seedTwoHouseholds() {
    sqlite.exec(`INSERT INTO users (name, color) VALUES ('Alice', '#3b82f6')`); // id=1
    sqlite.exec(`INSERT INTO users (name, color) VALUES ('Bob', '#ef4444')`);   // id=2
    sqlite.exec(`INSERT INTO users (name, color) VALUES ('Carol', '#22c55e')`); // id=3
    sqlite.exec(`INSERT INTO households (name) VALUES ('Home')`);               // id=1
    sqlite.exec(`INSERT INTO households (name) VALUES ('Beach House')`);        // id=2
    // Alice belongs to both, Bob to Home only, Carol to Beach only
    sqlite.exec(`INSERT INTO user_households (user_id, household_id, role) VALUES (1, 1, 'owner')`);
    sqlite.exec(`INSERT INTO user_households (user_id, household_id, role) VALUES (2, 1, 'member')`);
    sqlite.exec(`INSERT INTO user_households (user_id, household_id, role) VALUES (1, 2, 'owner')`);
    sqlite.exec(`INSERT INTO user_households (user_id, household_id, role) VALUES (3, 2, 'member')`);
  }

  it("creating a second household via API and adding members", async () => {
    sqlite.exec(`INSERT INTO users (name, color) VALUES ('Alice', '#3b82f6')`);
    sqlite.exec(`INSERT INTO users (name, color) VALUES ('Bob', '#ef4444')`);

    // Create first household
    const res1 = await householdsRoute.POST(
      makeRequest("/api/households", jsonBody({ name: "Home", userId: 1 }))
    );
    expect(res1.status).toBe(201);
    const { id: h1 } = await res1.json();

    // Create second household
    const res2 = await householdsRoute.POST(
      makeRequest("/api/households", jsonBody({ name: "Beach House", userId: 1 }))
    );
    expect(res2.status).toBe(201);
    const { id: h2 } = await res2.json();

    // Add Bob to second household
    await membersRoute.POST(
      makeRequest(`/api/households/${h2}/members`, jsonBody({ userId: 2 })),
      { params: Promise.resolve({ householdId: String(h2) }) }
    );

    // Alice should see both households
    const aliceRes = await householdsRoute.GET(makeRequest("/api/households?userId=1"));
    const aliceHouseholds = await aliceRes.json();
    expect(aliceHouseholds).toHaveLength(2);
    expect(aliceHouseholds.map((h: { name: string }) => h.name).sort()).toEqual(["Beach House", "Home"]);

    // Bob should see only Beach House
    const bobRes = await householdsRoute.GET(makeRequest("/api/households?userId=2"));
    const bobHouseholds = await bobRes.json();
    expect(bobHouseholds).toHaveLength(1);
    expect(bobHouseholds[0].name).toBe("Beach House");
  });

  it("tasks created in one household are invisible to another", async () => {
    seedTwoHouseholds();

    // Create tasks in each household
    await nestedTasksRoute.POST(
      makeRequest("/api/households/1/tasks", jsonBody({ name: "Mow lawn", area: "Garden", frequency: "weekly" })),
      { params: Promise.resolve({ householdId: "1" }) }
    );
    await nestedTasksRoute.POST(
      makeRequest("/api/households/1/tasks", jsonBody({ name: "Wash dishes", area: "Kitchen", frequency: "daily" })),
      { params: Promise.resolve({ householdId: "1" }) }
    );
    await nestedTasksRoute.POST(
      makeRequest("/api/households/2/tasks", jsonBody({ name: "Sweep deck", area: "Outdoor", frequency: "weekly" })),
      { params: Promise.resolve({ householdId: "2" }) }
    );

    // Home should have 2 tasks
    const homeRes = await nestedTasksRoute.GET(
      makeRequest("/api/households/1/tasks"),
      { params: Promise.resolve({ householdId: "1" }) }
    );
    const homeTasks = await homeRes.json();
    expect(homeTasks).toHaveLength(2);
    expect(homeTasks.map((t: { name: string }) => t.name).sort()).toEqual(["Mow lawn", "Wash dishes"]);

    // Beach House should have 1 task
    const beachRes = await nestedTasksRoute.GET(
      makeRequest("/api/households/2/tasks"),
      { params: Promise.resolve({ householdId: "2" }) }
    );
    const beachTasks = await beachRes.json();
    expect(beachTasks).toHaveLength(1);
    expect(beachTasks[0].name).toBe("Sweep deck");
  });

  it("vendors are isolated between households", async () => {
    seedTwoHouseholds();

    await nestedVendorsRoute.POST(
      makeRequest("/api/households/1/vendors", jsonBody({ name: "Dave's Plumbing", category: "Plumber" })),
      { params: Promise.resolve({ householdId: "1" }) }
    );
    await nestedVendorsRoute.POST(
      makeRequest("/api/households/2/vendors", jsonBody({ name: "Coastal Cleaners", category: "Cleaning" })),
      { params: Promise.resolve({ householdId: "2" }) }
    );

    const homeRes = await nestedVendorsRoute.GET(
      makeRequest("/api/households/1/vendors"),
      { params: Promise.resolve({ householdId: "1" }) }
    );
    const homeVendors = await homeRes.json();
    expect(homeVendors).toHaveLength(1);
    expect(homeVendors[0].name).toBe("Dave's Plumbing");

    const beachRes = await nestedVendorsRoute.GET(
      makeRequest("/api/households/2/vendors"),
      { params: Promise.resolve({ householdId: "2" }) }
    );
    const beachVendors = await beachRes.json();
    expect(beachVendors).toHaveLength(1);
    expect(beachVendors[0].name).toBe("Coastal Cleaners");
  });

  it("appliances are isolated between households", async () => {
    seedTwoHouseholds();

    await nestedAppliancesRoute.POST(
      makeRequest("/api/households/1/appliances", jsonBody({ name: "Dishwasher", brand: "Bosch" })),
      { params: Promise.resolve({ householdId: "1" }) }
    );
    await nestedAppliancesRoute.POST(
      makeRequest("/api/households/1/appliances", jsonBody({ name: "Washing Machine", brand: "LG" })),
      { params: Promise.resolve({ householdId: "1" }) }
    );
    await nestedAppliancesRoute.POST(
      makeRequest("/api/households/2/appliances", jsonBody({ name: "BBQ", brand: "Weber" })),
      { params: Promise.resolve({ householdId: "2" }) }
    );

    const homeRes = await nestedAppliancesRoute.GET(
      makeRequest("/api/households/1/appliances"),
      { params: Promise.resolve({ householdId: "1" }) }
    );
    expect((await homeRes.json())).toHaveLength(2);

    const beachRes = await nestedAppliancesRoute.GET(
      makeRequest("/api/households/2/appliances"),
      { params: Promise.resolve({ householdId: "2" }) }
    );
    const beachAppliances = await beachRes.json();
    expect(beachAppliances).toHaveLength(1);
    expect(beachAppliances[0].name).toBe("BBQ");
  });

  it("quotes are isolated between households", async () => {
    seedTwoHouseholds();

    await nestedQuotesRoute.POST(
      makeRequest("/api/households/1/quotes", jsonBody({ description: "Fix roof leak", total: 2500 })),
      { params: Promise.resolve({ householdId: "1" }) }
    );
    await nestedQuotesRoute.POST(
      makeRequest("/api/households/2/quotes", jsonBody({ description: "Paint deck", total: 800 })),
      { params: Promise.resolve({ householdId: "2" }) }
    );
    await nestedQuotesRoute.POST(
      makeRequest("/api/households/2/quotes", jsonBody({ description: "New outdoor shower", total: 3000 })),
      { params: Promise.resolve({ householdId: "2" }) }
    );

    const homeRes = await nestedQuotesRoute.GET(
      makeRequest("/api/households/1/quotes"),
      { params: Promise.resolve({ householdId: "1" }) }
    );
    const homeQuotes = await homeRes.json();
    expect(homeQuotes).toHaveLength(1);
    expect(homeQuotes[0].description).toBe("Fix roof leak");

    const beachRes = await nestedQuotesRoute.GET(
      makeRequest("/api/households/2/quotes"),
      { params: Promise.resolve({ householdId: "2" }) }
    );
    expect((await beachRes.json())).toHaveLength(2);
  });

  it("a user belonging to multiple households sees the right data in each", async () => {
    seedTwoHouseholds();

    // Alice creates a task in each household
    await nestedTasksRoute.POST(
      makeRequest("/api/households/1/tasks", jsonBody({ name: "Home task", area: "Kitchen", frequency: "daily" })),
      { params: Promise.resolve({ householdId: "1" }) }
    );
    await nestedTasksRoute.POST(
      makeRequest("/api/households/2/tasks", jsonBody({ name: "Beach task", area: "Outdoor", frequency: "weekly" })),
      { params: Promise.resolve({ householdId: "2" }) }
    );

    // Alice queries households — sees both
    const aliceHouseholdsRes = await householdsRoute.GET(makeRequest("/api/households?userId=1"));
    const aliceHouseholds = await aliceHouseholdsRes.json();
    expect(aliceHouseholds).toHaveLength(2);

    // When viewing Home, only Home tasks visible
    const homeTasksRes = await nestedTasksRoute.GET(
      makeRequest("/api/households/1/tasks"),
      { params: Promise.resolve({ householdId: "1" }) }
    );
    const homeTasks = await homeTasksRes.json();
    expect(homeTasks).toHaveLength(1);
    expect(homeTasks[0].name).toBe("Home task");

    // When viewing Beach House, only Beach tasks visible
    const beachTasksRes = await nestedTasksRoute.GET(
      makeRequest("/api/households/2/tasks"),
      { params: Promise.resolve({ householdId: "2" }) }
    );
    const beachTasks = await beachTasksRes.json();
    expect(beachTasks).toHaveLength(1);
    expect(beachTasks[0].name).toBe("Beach task");
  });
});
