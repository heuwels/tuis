import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/db/schema";
import { format, startOfWeek } from "date-fns";

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
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      notes TEXT,
      rating INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
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
    CREATE TABLE IF NOT EXISTS completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      completed_at TEXT NOT NULL,
      completed_by INTEGER REFERENCES users(id),
      vendor_id INTEGER,
      cost TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
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

function putBody(data: Record<string, unknown>): RequestInit {
  return {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

function deleteRequest(): RequestInit {
  return { method: "DELETE" };
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

// ─── Insert helpers (raw SQL for setting up test state) ─────────────────────

function insertVendor(
  name: string,
  extra: Record<string, unknown> = {}
) {
  const cols = ["name", ...Object.keys(extra)];
  const vals = [name, ...Object.values(extra)];
  const placeholders = cols.map(() => "?").join(", ");
  return sqlite
    .prepare(
      `INSERT INTO vendors (${cols.join(", ")}) VALUES (${placeholders})`
    )
    .run(...vals);
}

function insertQuote(
  description: string,
  total: number,
  extra: Record<string, unknown> = {}
) {
  const cols = ["description", "total", ...Object.keys(extra)];
  const vals = [description, total, ...Object.values(extra)];
  const placeholders = cols.map(() => "?").join(", ");
  return sqlite
    .prepare(
      `INSERT INTO quotes (${cols.join(", ")}) VALUES (${placeholders})`
    )
    .run(...vals);
}

function insertUser(name: string, color = "#3b82f6") {
  return sqlite
    .prepare("INSERT INTO users (name, color) VALUES (?, ?)")
    .run(name, color);
}

function insertTask(
  name: string,
  area: string,
  frequency: string,
  extra: Record<string, unknown> = {}
) {
  const cols = ["name", "area", "frequency", ...Object.keys(extra)];
  const vals = [name, area, frequency, ...Object.values(extra)];
  const placeholders = cols.map(() => "?").join(", ");
  return sqlite
    .prepare(
      `INSERT INTO tasks (${cols.join(", ")}) VALUES (${placeholders})`
    )
    .run(...vals);
}

function insertCompletion(
  taskId: number,
  completedAt: string,
  extra: Record<string, unknown> = {}
) {
  const cols = ["task_id", "completed_at", ...Object.keys(extra)];
  const vals = [taskId, completedAt, ...Object.values(extra)];
  const placeholders = cols.map(() => "?").join(", ");
  return sqlite
    .prepare(
      `INSERT INTO completions (${cols.join(", ")}) VALUES (${placeholders})`
    )
    .run(...vals);
}

// ═══════════════════════════════════════════════════════════════════════════
// QUOTES
// ═══════════════════════════════════════════════════════════════════════════

describe("Quotes API", () => {
  let quotesRoute: typeof import("@/app/api/quotes/route");
  let quotesIdRoute: typeof import("@/app/api/quotes/[id]/route");

  beforeEach(async () => {
    quotesRoute = await import("@/app/api/quotes/route");
    quotesIdRoute = await import("@/app/api/quotes/[id]/route");
  });

  // ── GET /api/quotes ───────────────────────────────────────────────────

  describe("GET /api/quotes", () => {
    it("returns empty array when no quotes exist", async () => {
      const req = makeRequest("/api/quotes");
      const res = await quotesRoute.GET(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([]);
    });

    it("returns all quotes ordered by updated_at desc", async () => {
      insertQuote("First quote", 100, { updated_at: "2025-01-01T00:00:00" });
      insertQuote("Second quote", 200, { updated_at: "2025-06-01T00:00:00" });
      insertQuote("Third quote", 300, { updated_at: "2025-03-01T00:00:00" });

      const req = makeRequest("/api/quotes");
      const res = await quotesRoute.GET(req);
      const data = await res.json();

      expect(data).toHaveLength(3);
      expect(data[0].description).toBe("Second quote");
      expect(data[1].description).toBe("Third quote");
      expect(data[2].description).toBe("First quote");
    });

    it("includes expected fields in response", async () => {
      insertQuote("Test quote", 500, {
        labor: 200,
        materials: 250,
        other: 50,
        status: "pending",
        received_date: "2025-04-01",
        notes: "Some notes",
      });

      const req = makeRequest("/api/quotes");
      const res = await quotesRoute.GET(req);
      const data = await res.json();

      expect(data[0]).toMatchObject({
        id: expect.any(Number),
        description: "Test quote",
        total: 500,
        labour: 200,
        materials: 250,
        other: 50,
        status: "pending",
        receivedDate: "2025-04-01",
        notes: "Some notes",
      });
      expect(data[0]).toHaveProperty("createdAt");
      expect(data[0]).toHaveProperty("updatedAt");
      // Vendor fields present even when null
      expect(data[0]).toHaveProperty("vendorName");
      expect(data[0]).toHaveProperty("vendorCategory");
    });

    it("filters quotes by status", async () => {
      insertQuote("Pending quote", 100, { status: "pending" });
      insertQuote("Accepted quote", 200, { status: "accepted" });
      insertQuote("Rejected quote", 300, { status: "rejected" });

      const req = makeRequest("/api/quotes?status=accepted");
      const res = await quotesRoute.GET(req);
      const data = await res.json();

      expect(data).toHaveLength(1);
      expect(data[0].description).toBe("Accepted quote");
      expect(data[0].status).toBe("accepted");
    });

    it("returns all quotes when no status filter is applied", async () => {
      insertQuote("Q1", 100, { status: "pending" });
      insertQuote("Q2", 200, { status: "accepted" });

      const req = makeRequest("/api/quotes");
      const res = await quotesRoute.GET(req);
      const data = await res.json();

      expect(data).toHaveLength(2);
    });

    it("includes vendor name and category via left join", async () => {
      const vendorResult = insertVendor("Test Plumber", { category: "Plumber" });
      const vendorId = Number(vendorResult.lastInsertRowid);
      insertQuote("Pipe repair", 450, { vendor_id: vendorId });

      const req = makeRequest("/api/quotes");
      const res = await quotesRoute.GET(req);
      const data = await res.json();

      expect(data[0].vendorName).toBe("Test Plumber");
      expect(data[0].vendorCategory).toBe("Plumber");
    });

    it("returns null vendor fields when quote has no vendor", async () => {
      insertQuote("No vendor quote", 100);

      const req = makeRequest("/api/quotes");
      const res = await quotesRoute.GET(req);
      const data = await res.json();

      expect(data[0].vendorId).toBeNull();
      expect(data[0].vendorName).toBeNull();
      expect(data[0].vendorCategory).toBeNull();
    });
  });

  // ── POST /api/quotes ──────────────────────────────────────────────────

  describe("POST /api/quotes", () => {
    it("creates a quote with required fields only", async () => {
      const req = makeRequest(
        "/api/quotes",
        jsonBody({ description: "New fence", total: 2500 })
      );
      const res = await quotesRoute.POST(req);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Number(data.id)).toBeGreaterThan(0);

      // Verify in DB
      const row = sqlite
        .prepare("SELECT * FROM quotes WHERE id = ?")
        .get(Number(data.id)) as Record<string, unknown>;
      expect(row.description).toBe("New fence");
      expect(row.total).toBe(2500);
      expect(row.status).toBe("pending");
    });

    it("creates a quote with all fields", async () => {
      const vendorResult = insertVendor("Fencing Co");
      const vendorId = Number(vendorResult.lastInsertRowid);

      const req = makeRequest(
        "/api/quotes",
        jsonBody({
          description: "Full renovation",
          total: 15000,
          vendorId,
          labour: 8000,
          materials: 5000,
          other: 2000,
          status: "accepted",
          receivedDate: "2025-03-15",
          notes: "Includes warranty",
        })
      );
      const res = await quotesRoute.POST(req);

      expect(res.status).toBe(201);
      const data = await res.json();

      const row = sqlite
        .prepare("SELECT * FROM quotes WHERE id = ?")
        .get(Number(data.id)) as Record<string, unknown>;
      expect(row.description).toBe("Full renovation");
      expect(row.total).toBe(15000);
      expect(row.vendor_id).toBe(vendorId);
      expect(row.labor).toBe(8000);
      expect(row.materials).toBe(5000);
      expect(row.other).toBe(2000);
      expect(row.status).toBe("accepted");
      expect(row.received_date).toBe("2025-03-15");
      expect(row.notes).toBe("Includes warranty");
    });

    it("returns 400 when description is missing", async () => {
      const req = makeRequest(
        "/api/quotes",
        jsonBody({ total: 100 })
      );
      const res = await quotesRoute.POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Description and total are required");
    });

    it("returns 400 when total is missing", async () => {
      const req = makeRequest(
        "/api/quotes",
        jsonBody({ description: "Something" })
      );
      const res = await quotesRoute.POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Description and total are required");
    });

    it("defaults status to pending when not provided", async () => {
      const req = makeRequest(
        "/api/quotes",
        jsonBody({ description: "Default status", total: 100 })
      );
      const res = await quotesRoute.POST(req);
      const data = await res.json();

      const row = sqlite
        .prepare("SELECT status FROM quotes WHERE id = ?")
        .get(Number(data.id)) as Record<string, unknown>;
      expect(row.status).toBe("pending");
    });
  });

  // ── GET /api/quotes/[id] ──────────────────────────────────────────────

  describe("GET /api/quotes/[id]", () => {
    it("returns a single quote by id with vendor info", async () => {
      const vendorResult = insertVendor("Sparky", { category: "Electrician" });
      const vendorId = Number(vendorResult.lastInsertRowid);
      const quoteResult = insertQuote("Rewire house", 3000, {
        vendor_id: vendorId,
        labor: 2000,
        materials: 1000,
      });
      const id = String(quoteResult.lastInsertRowid);

      const req = makeRequest(`/api/quotes/${id}`);
      const res = await quotesIdRoute.GET(req, makeParams(id));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.description).toBe("Rewire house");
      expect(data.total).toBe(3000);
      expect(data.labour).toBe(2000);
      expect(data.materials).toBe(1000);
      expect(data.vendorName).toBe("Sparky");
      expect(data.vendorCategory).toBe("Electrician");
    });

    it("returns 404 for non-existent quote", async () => {
      const req = makeRequest("/api/quotes/999");
      const res = await quotesIdRoute.GET(req, makeParams("999"));

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Quote not found");
    });
  });

  // ── PUT /api/quotes/[id] ──────────────────────────────────────────────

  describe("PUT /api/quotes/[id]", () => {
    it("updates quote status", async () => {
      const result = insertQuote("Some work", 500);
      const id = String(result.lastInsertRowid);

      const req = makeRequest(
        `/api/quotes/${id}`,
        putBody({ status: "accepted" })
      );
      const res = await quotesIdRoute.PUT(req, makeParams(id));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });

      const row = sqlite
        .prepare("SELECT status FROM quotes WHERE id = ?")
        .get(id) as Record<string, unknown>;
      expect(row.status).toBe("accepted");
    });

    it("updates quote description and total", async () => {
      const result = insertQuote("Old desc", 100);
      const id = String(result.lastInsertRowid);

      const req = makeRequest(
        `/api/quotes/${id}`,
        putBody({ description: "New desc", total: 999 })
      );
      const res = await quotesIdRoute.PUT(req, makeParams(id));

      expect(res.status).toBe(200);

      const row = sqlite
        .prepare("SELECT description, total FROM quotes WHERE id = ?")
        .get(id) as Record<string, unknown>;
      expect(row.description).toBe("New desc");
      expect(row.total).toBe(999);
    });

    it("updates the updatedAt timestamp", async () => {
      const result = insertQuote("Timestamp test", 100, {
        updated_at: "2020-01-01T00:00:00",
      });
      const id = String(result.lastInsertRowid);

      const req = makeRequest(
        `/api/quotes/${id}`,
        putBody({ notes: "Updated notes" })
      );
      await quotesIdRoute.PUT(req, makeParams(id));

      const row = sqlite
        .prepare("SELECT updated_at FROM quotes WHERE id = ?")
        .get(id) as Record<string, unknown>;
      expect(row.updated_at).not.toBe("2020-01-01T00:00:00");
    });

    it("returns 404 for non-existent quote", async () => {
      const req = makeRequest(
        "/api/quotes/999",
        putBody({ status: "accepted" })
      );
      const res = await quotesIdRoute.PUT(req, makeParams("999"));

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe("Quote not found");
    });
  });

  // ── DELETE /api/quotes/[id] ───────────────────────────────────────────

  describe("DELETE /api/quotes/[id]", () => {
    it("deletes an existing quote", async () => {
      const result = insertQuote("To delete", 100);
      const id = String(result.lastInsertRowid);

      const req = makeRequest(`/api/quotes/${id}`, deleteRequest());
      const res = await quotesIdRoute.DELETE(req, makeParams(id));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });

      const row = sqlite
        .prepare("SELECT * FROM quotes WHERE id = ?")
        .get(id);
      expect(row).toBeUndefined();
    });

    it("succeeds even for non-existent quote (idempotent)", async () => {
      const req = makeRequest("/api/quotes/999", deleteRequest());
      const res = await quotesIdRoute.DELETE(req, makeParams("999"));

      // The route doesn't check existence before deleting
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RECENT COMPLETIONS
// ═══════════════════════════════════════════════════════════════════════════

describe("Recent Completions API", () => {
  let recentRoute: typeof import("@/app/api/stats/recent-completions/route");

  beforeEach(async () => {
    recentRoute = await import("@/app/api/stats/recent-completions/route");
  });

  describe("GET /api/stats/recent-completions", () => {
    it("returns empty array when no completions exist", async () => {
      const res = await recentRoute.GET();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([]);
    });

    it("returns completions from the current week", async () => {
      const weekStart = format(
        startOfWeek(new Date(), { weekStartsOn: 1 }),
        "yyyy-MM-dd"
      );
      const today = format(new Date(), "yyyy-MM-dd");

      const userResult = insertUser("Alice");
      const userId = Number(userResult.lastInsertRowid);
      const taskResult = insertTask("Mop floors", "Kitchen", "Weekly");
      const taskId = Number(taskResult.lastInsertRowid);

      insertCompletion(taskId, today, { completed_by: userId });

      const res = await recentRoute.GET();
      const data = await res.json();

      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        id: expect.any(Number),
        taskId: taskId,
        taskName: "Mop floors",
        area: "Kitchen",
        completedAt: today,
        completedBy: userId,
        completedByName: "Alice",
      });
    });

    it("excludes completions from before the current week", async () => {
      const taskResult = insertTask("Old task", "Kitchen", "Weekly");
      const taskId = Number(taskResult.lastInsertRowid);

      // Insert completion well before this week
      insertCompletion(taskId, "2020-01-01");

      const res = await recentRoute.GET();
      const data = await res.json();

      expect(data).toEqual([]);
    });

    it("orders completions by completedAt descending", async () => {
      const weekStart = format(
        startOfWeek(new Date(), { weekStartsOn: 1 }),
        "yyyy-MM-dd"
      );
      const today = format(new Date(), "yyyy-MM-dd");

      const task1 = insertTask("Task A", "Kitchen", "Daily");
      const task2 = insertTask("Task B", "Bathroom", "Daily");

      // Insert in ascending order
      insertCompletion(Number(task1.lastInsertRowid), weekStart);
      insertCompletion(Number(task2.lastInsertRowid), today);

      const res = await recentRoute.GET();
      const data = await res.json();

      expect(data).toHaveLength(2);
      // Most recent first
      expect(data[0].taskName).toBe("Task B");
      expect(data[1].taskName).toBe("Task A");
    });

    it("returns null for completedByName when no user is linked", async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const taskResult = insertTask("Solo task", "Garden", "Weekly");
      const taskId = Number(taskResult.lastInsertRowid);

      insertCompletion(taskId, today);

      const res = await recentRoute.GET();
      const data = await res.json();

      expect(data).toHaveLength(1);
      expect(data[0].completedByName).toBeNull();
      expect(data[0].completedBy).toBeNull();
    });

    it("limits results to 30", async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const taskResult = insertTask("Repeat task", "Kitchen", "Daily");
      const taskId = Number(taskResult.lastInsertRowid);

      for (let i = 0; i < 35; i++) {
        insertCompletion(taskId, today);
      }

      const res = await recentRoute.GET();
      const data = await res.json();

      expect(data).toHaveLength(30);
    });
  });
});
