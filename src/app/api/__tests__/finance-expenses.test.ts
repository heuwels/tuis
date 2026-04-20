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
    CREATE TABLE IF NOT EXISTS household_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      vendor_id INTEGER REFERENCES vendors(id),
      receipt_url TEXT,
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

function makeRequest(url: string, init?: RequestInit) {
  return new Request(`http://localhost${url}`, init) as unknown as import("next/server").NextRequest;
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

function insertExpense(
  date: string,
  category: string,
  description: string,
  amount: number,
  extra: Record<string, unknown> = {}
) {
  const cols = ["date", "category", "description", "amount", ...Object.keys(extra)];
  const vals = [date, category, description, amount, ...Object.values(extra)];
  const placeholders = cols.map(() => "?").join(", ");
  return sqlite
    .prepare(
      `INSERT INTO household_expenses (${cols.join(", ")}) VALUES (${placeholders})`
    )
    .run(...vals);
}

// ═══════════════════════════════════════════════════════════════════════════
// HOUSEHOLD EXPENSES
// ═══════════════════════════════════════════════════════════════════════════

describe("Household Expenses API", () => {
  let expensesRoute: typeof import("@/app/api/finance/expenses/route");
  let expensesIdRoute: typeof import("@/app/api/finance/expenses/[id]/route");

  beforeEach(async () => {
    expensesRoute = await import("@/app/api/finance/expenses/route");
    expensesIdRoute = await import("@/app/api/finance/expenses/[id]/route");
  });

  // ── GET /api/finance/expenses ──────────────────────────────────────────

  describe("GET /api/finance/expenses", () => {
    it("returns empty array when no expenses exist", async () => {
      const req = makeRequest("/api/finance/expenses");
      const res = await expensesRoute.GET(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([]);
    });

    it("returns expenses after creation", async () => {
      insertExpense("2025-04-01", "Groceries", "Weekly shop", 150.5);
      insertExpense("2025-04-02", "Utilities", "Electricity bill", 220);

      const req = makeRequest("/api/finance/expenses");
      const res = await expensesRoute.GET(req);
      const data = await res.json();

      expect(data).toHaveLength(2);
      // Ordered by date desc
      expect(data[0].description).toBe("Electricity bill");
      expect(data[1].description).toBe("Weekly shop");
    });

    it("supports category filter", async () => {
      insertExpense("2025-04-01", "Groceries", "Fruit and veg", 80);
      insertExpense("2025-04-02", "Utilities", "Water bill", 95);
      insertExpense("2025-04-03", "Groceries", "Meat and dairy", 120);

      const req = makeRequest("/api/finance/expenses?category=Groceries");
      const res = await expensesRoute.GET(req);
      const data = await res.json();

      expect(data).toHaveLength(2);
      expect(data.every((e: { category: string }) => e.category === "Groceries")).toBe(true);
    });

    it("supports date range filter", async () => {
      insertExpense("2025-01-15", "Groceries", "January shop", 100);
      insertExpense("2025-03-10", "Utilities", "March electric", 200);
      insertExpense("2025-05-20", "Groceries", "May shop", 150);

      const req = makeRequest("/api/finance/expenses?from=2025-02-01&to=2025-04-30");
      const res = await expensesRoute.GET(req);
      const data = await res.json();

      expect(data).toHaveLength(1);
      expect(data[0].description).toBe("March electric");
    });

    it("includes vendor name via left join", async () => {
      const vendorResult = insertVendor("Woolworths", { category: "Supermarket" });
      const vendorId = Number(vendorResult.lastInsertRowid);
      insertExpense("2025-04-01", "Groceries", "Weekly shop", 200, { vendor_id: vendorId });

      const req = makeRequest("/api/finance/expenses");
      const res = await expensesRoute.GET(req);
      const data = await res.json();

      expect(data[0].vendorName).toBe("Woolworths");
    });

    it("returns null vendor name when no vendor linked", async () => {
      insertExpense("2025-04-01", "Groceries", "Cash purchase", 50);

      const req = makeRequest("/api/finance/expenses");
      const res = await expensesRoute.GET(req);
      const data = await res.json();

      expect(data[0].vendorId).toBeNull();
      expect(data[0].vendorName).toBeNull();
    });
  });

  // ── POST /api/finance/expenses ─────────────────────────────────────────

  describe("POST /api/finance/expenses", () => {
    it("creates expense with all fields", async () => {
      const vendorResult = insertVendor("Pick n Pay");
      const vendorId = Number(vendorResult.lastInsertRowid);

      const req = makeRequest(
        "/api/finance/expenses",
        jsonBody({
          date: "2025-04-10",
          category: "Groceries",
          description: "Big shop",
          amount: 350.75,
          vendorId,
          receiptUrl: "https://receipts.example.com/123",
          notes: "Bought extra for braai",
        })
      );
      const res = await expensesRoute.POST(req);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Number(data.id)).toBeGreaterThan(0);

      // Verify in DB
      const row = sqlite
        .prepare("SELECT * FROM household_expenses WHERE id = ?")
        .get(Number(data.id)) as Record<string, unknown>;
      expect(row.date).toBe("2025-04-10");
      expect(row.category).toBe("Groceries");
      expect(row.description).toBe("Big shop");
      expect(row.amount).toBe(350.75);
      expect(row.vendor_id).toBe(vendorId);
      expect(row.receipt_url).toBe("https://receipts.example.com/123");
      expect(row.notes).toBe("Bought extra for braai");
    });

    it("creates expense with required fields only", async () => {
      const req = makeRequest(
        "/api/finance/expenses",
        jsonBody({
          date: "2025-04-10",
          category: "Transport",
          description: "Fuel",
          amount: 95,
        })
      );
      const res = await expensesRoute.POST(req);

      expect(res.status).toBe(201);
      const data = await res.json();

      const row = sqlite
        .prepare("SELECT * FROM household_expenses WHERE id = ?")
        .get(Number(data.id)) as Record<string, unknown>;
      expect(row.vendor_id).toBeNull();
      expect(row.receipt_url).toBeNull();
      expect(row.notes).toBeNull();
    });

    it("returns 400 for missing required fields", async () => {
      // Missing date
      const res1 = await expensesRoute.POST(
        makeRequest("/api/finance/expenses", jsonBody({ category: "Groceries", description: "Shop", amount: 100 }))
      );
      expect(res1.status).toBe(400);
      expect((await res1.json()).error).toBe("Date, category, description, and amount are required");

      // Missing category
      const res2 = await expensesRoute.POST(
        makeRequest("/api/finance/expenses", jsonBody({ date: "2025-04-10", description: "Shop", amount: 100 }))
      );
      expect(res2.status).toBe(400);

      // Missing description
      const res3 = await expensesRoute.POST(
        makeRequest("/api/finance/expenses", jsonBody({ date: "2025-04-10", category: "Groceries", amount: 100 }))
      );
      expect(res3.status).toBe(400);

      // Missing amount
      const res4 = await expensesRoute.POST(
        makeRequest("/api/finance/expenses", jsonBody({ date: "2025-04-10", category: "Groceries", description: "Shop" }))
      );
      expect(res4.status).toBe(400);
    });

    it("returns 400 for non-positive amount", async () => {
      const res1 = await expensesRoute.POST(
        makeRequest(
          "/api/finance/expenses",
          jsonBody({ date: "2025-04-10", category: "Groceries", description: "Shop", amount: 0 })
        )
      );
      expect(res1.status).toBe(400);
      expect((await res1.json()).error).toBe("Amount must be a positive number");

      const res2 = await expensesRoute.POST(
        makeRequest(
          "/api/finance/expenses",
          jsonBody({ date: "2025-04-10", category: "Groceries", description: "Shop", amount: -50 })
        )
      );
      expect(res2.status).toBe(400);
      expect((await res2.json()).error).toBe("Amount must be a positive number");
    });

    it("creates expense with vendor reference", async () => {
      const vendorResult = insertVendor("Checkers");
      const vendorId = Number(vendorResult.lastInsertRowid);

      const req = makeRequest(
        "/api/finance/expenses",
        jsonBody({
          date: "2025-04-10",
          category: "Groceries",
          description: "Quick shop",
          amount: 80,
          vendorId,
        })
      );
      const res = await expensesRoute.POST(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      const row = sqlite
        .prepare("SELECT vendor_id FROM household_expenses WHERE id = ?")
        .get(Number(data.id)) as Record<string, unknown>;
      expect(row.vendor_id).toBe(vendorId);
    });
  });

  // ── GET /api/finance/expenses/:id ──────────────────────────────────────

  describe("GET /api/finance/expenses/:id", () => {
    it("returns single expense with vendor name", async () => {
      const vendorResult = insertVendor("Builders Warehouse", { category: "Hardware" });
      const vendorId = Number(vendorResult.lastInsertRowid);
      const expenseResult = insertExpense("2025-04-05", "Maintenance", "Paint supplies", 450, {
        vendor_id: vendorId,
        receipt_url: "https://receipts.example.com/456",
        notes: "For lounge repaint",
      });
      const id = String(expenseResult.lastInsertRowid);

      const req = makeRequest(`/api/finance/expenses/${id}`);
      const res = await expensesIdRoute.GET(req, makeParams(id));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.description).toBe("Paint supplies");
      expect(data.amount).toBe(450);
      expect(data.category).toBe("Maintenance");
      expect(data.vendorName).toBe("Builders Warehouse");
      expect(data.receiptUrl).toBe("https://receipts.example.com/456");
      expect(data.notes).toBe("For lounge repaint");
    });

    it("returns 404 for non-existent expense", async () => {
      const req = makeRequest("/api/finance/expenses/999");
      const res = await expensesIdRoute.GET(req, makeParams("999"));

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Expense not found");
    });
  });

  // ── PUT /api/finance/expenses/:id ──────────────────────────────────────

  describe("PUT /api/finance/expenses/:id", () => {
    it("updates expense fields", async () => {
      const result = insertExpense("2025-04-01", "Groceries", "Old description", 100);
      const id = String(result.lastInsertRowid);

      const req = makeRequest(
        `/api/finance/expenses/${id}`,
        putBody({ description: "Updated description", amount: 250 })
      );
      const res = await expensesIdRoute.PUT(req, makeParams(id));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });

      const row = sqlite
        .prepare("SELECT description, amount FROM household_expenses WHERE id = ?")
        .get(id) as Record<string, unknown>;
      expect(row.description).toBe("Updated description");
      expect(row.amount).toBe(250);
    });

    it("updates the updatedAt timestamp", async () => {
      const result = insertExpense("2025-04-01", "Groceries", "Timestamp test", 100, {
        updated_at: "2020-01-01T00:00:00",
      });
      const id = String(result.lastInsertRowid);

      const req = makeRequest(
        `/api/finance/expenses/${id}`,
        putBody({ notes: "Updated notes" })
      );
      await expensesIdRoute.PUT(req, makeParams(id));

      const row = sqlite
        .prepare("SELECT updated_at FROM household_expenses WHERE id = ?")
        .get(id) as Record<string, unknown>;
      expect(row.updated_at).not.toBe("2020-01-01T00:00:00");
    });

    it("returns 404 for non-existent expense", async () => {
      const req = makeRequest(
        "/api/finance/expenses/999",
        putBody({ description: "Nope" })
      );
      const res = await expensesIdRoute.PUT(req, makeParams("999"));

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe("Expense not found");
    });
  });

  // ── DELETE /api/finance/expenses/:id ───────────────────────────────────

  describe("DELETE /api/finance/expenses/:id", () => {
    it("deletes an existing expense", async () => {
      const result = insertExpense("2025-04-01", "Groceries", "To delete", 100);
      const id = String(result.lastInsertRowid);

      const req = makeRequest(`/api/finance/expenses/${id}`, deleteRequest());
      const res = await expensesIdRoute.DELETE(req, makeParams(id));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });

      const row = sqlite
        .prepare("SELECT * FROM household_expenses WHERE id = ?")
        .get(id);
      expect(row).toBeUndefined();
    });

    it("succeeds even for non-existent expense (idempotent)", async () => {
      const req = makeRequest("/api/finance/expenses/999", deleteRequest());
      const res = await expensesIdRoute.DELETE(req, makeParams("999"));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });
  });
});
