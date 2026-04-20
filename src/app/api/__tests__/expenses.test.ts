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
    CREATE TABLE IF NOT EXISTS completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id),
      completed_at TEXT NOT NULL,
      completed_by INTEGER REFERENCES users(id),
      vendor_id INTEGER,
      cost TEXT
    );
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      make TEXT,
      model TEXT,
      year INTEGER,
      colour TEXT,
      rego_number TEXT,
      rego_state TEXT,
      vin TEXT,
      purchase_date TEXT,
      purchase_price REAL,
      current_odometer INTEGER,
      image_url TEXT,
      rego_expiry TEXT,
      insurance_provider TEXT,
      insurance_expiry TEXT,
      warranty_expiry_date TEXT,
      warranty_expiry_km INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS vehicle_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
      date TEXT NOT NULL,
      odometer INTEGER,
      vendor_id INTEGER,
      cost REAL,
      description TEXT NOT NULL,
      service_type TEXT,
      receipt_url TEXT,
      is_diy INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS fuel_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
      date TEXT NOT NULL,
      odometer INTEGER NOT NULL,
      litres REAL NOT NULL,
      cost_total REAL NOT NULL,
      cost_per_litre REAL,
      station TEXT,
      is_full_tank INTEGER DEFAULT 1,
      notes TEXT,
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

function makeRequest(url: string): Request {
  return new Request(`http://localhost${url}`);
}

function insertTask(name: string, area = "Home"): number {
  const result = sqlite
    .prepare("INSERT INTO tasks (name, area, frequency) VALUES (?, ?, ?)")
    .run(name, area, "weekly");
  return Number(result.lastInsertRowid);
}

function insertCompletion(
  taskId: number,
  completedAt: string,
  cost: string | null = null,
  vendorId: number | null = null
) {
  sqlite
    .prepare(
      "INSERT INTO completions (task_id, completed_at, cost, vendor_id) VALUES (?, ?, ?, ?)"
    )
    .run(taskId, completedAt, cost, vendorId);
}

function insertVehicle(name: string): number {
  const result = sqlite
    .prepare("INSERT INTO vehicles (name) VALUES (?)")
    .run(name);
  return Number(result.lastInsertRowid);
}

function insertVehicleService(
  vehicleId: number,
  date: string,
  cost: number,
  description = "Service",
  vendorId: number | null = null
) {
  sqlite
    .prepare(
      "INSERT INTO vehicle_services (vehicle_id, date, cost, description, vendor_id) VALUES (?, ?, ?, ?, ?)"
    )
    .run(vehicleId, date, cost, description, vendorId);
}

function insertFuelLog(
  vehicleId: number,
  date: string,
  odometer: number,
  litres: number,
  costTotal: number
) {
  const costPerLitre = costTotal / litres;
  sqlite
    .prepare(
      "INSERT INTO fuel_logs (vehicle_id, date, odometer, litres, cost_total, cost_per_litre) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(vehicleId, date, odometer, litres, costTotal, costPerLitre);
}

function insertVendor(name: string): number {
  const result = sqlite
    .prepare("INSERT INTO vendors (name) VALUES (?)")
    .run(name);
  return Number(result.lastInsertRowid);
}

function insertQuote(
  description: string,
  total: number,
  status: string,
  receivedDate: string,
  vendorId: number | null = null
) {
  sqlite
    .prepare(
      "INSERT INTO quotes (description, total, status, received_date, vendor_id) VALUES (?, ?, ?, ?, ?)"
    )
    .run(description, total, status, receivedDate, vendorId);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPENSE STATS API
// ═══════════════════════════════════════════════════════════════════════════

describe("Expense Stats API", () => {
  let expenseRoute: typeof import("@/app/api/stats/expenses/route");

  beforeEach(async () => {
    expenseRoute = await import("@/app/api/stats/expenses/route");
  });

  function callGet(params = "") {
    const req = makeRequest(`/api/stats/expenses${params ? `?${params}` : ""}`);
    return expenseRoute.GET(req);
  }

  it("returns empty data when no expenses exist", async () => {
    const res = await callGet("from=2026-01&to=2026-12");
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.grandTotal).toBe(0);
    expect(data.monthlyTotals).toEqual([]);
    expect(data.categoryBreakdown).toEqual([]);
    expect(data.topVendors).toEqual([]);
    expect(data.vehicleSummaries).toEqual([]);
  });

  it("aggregates task completion costs", async () => {
    const taskId = insertTask("Fix fence");
    insertCompletion(taskId, "2026-03-15", "$150.00");
    insertCompletion(taskId, "2026-03-20", "75");

    const res = await callGet("from=2026-03&to=2026-03");
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.grandTotal).toBe(225);
    expect(data.monthlyTotals).toHaveLength(1);
    expect(data.monthlyTotals[0].month).toBe("2026-03");
    expect(data.monthlyTotals[0].maintenance).toBe(225);
    expect(data.monthlyTotals[0].total).toBe(225);
  });

  it("handles unparseable text cost fields gracefully", async () => {
    const taskId = insertTask("Test task");
    insertCompletion(taskId, "2026-03-10", "$50");
    insertCompletion(taskId, "2026-03-11", "N/A");
    insertCompletion(taskId, "2026-03-12", "free");
    insertCompletion(taskId, "2026-03-13", "");

    const res = await callGet("from=2026-03&to=2026-03");
    expect(res.status).toBe(200);
    const data = await res.json();

    // Only the $50 should be counted
    expect(data.grandTotal).toBe(50);
  });

  it("aggregates vehicle service costs", async () => {
    const vehicleId = insertVehicle("My Car");
    insertVehicleService(vehicleId, "2026-04-01", 350, "Oil change");
    insertVehicleService(vehicleId, "2026-04-15", 1200, "Brakes");

    const res = await callGet("from=2026-04&to=2026-04");
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.grandTotal).toBe(1550);
    expect(data.monthlyTotals[0].maintenance).toBe(1550);
  });

  it("aggregates fuel costs", async () => {
    const vehicleId = insertVehicle("Family Car");
    insertFuelLog(vehicleId, "2026-05-01", 50000, 40, 80);
    insertFuelLog(vehicleId, "2026-05-15", 50500, 42, 88.2);

    const res = await callGet("from=2026-05&to=2026-05");
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.grandTotal).toBeCloseTo(168.2);
    expect(data.monthlyTotals[0].fuel).toBeCloseTo(168.2);
  });

  it("only counts accepted quotes", async () => {
    insertQuote("Roof repair", 5000, "accepted", "2026-06-01");
    insertQuote("Fence quote", 2000, "pending", "2026-06-15");
    insertQuote("Rejected job", 3000, "rejected", "2026-06-20");

    const res = await callGet("from=2026-06&to=2026-06");
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.grandTotal).toBe(5000);
    expect(data.monthlyTotals[0].quotes).toBe(5000);
  });

  it("groups expenses by month", async () => {
    const vehicleId = insertVehicle("Car");
    insertFuelLog(vehicleId, "2026-01-15", 10000, 40, 80);
    insertFuelLog(vehicleId, "2026-02-15", 10500, 42, 88);
    insertFuelLog(vehicleId, "2026-03-15", 11000, 38, 76);

    const res = await callGet("from=2026-01&to=2026-03");
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.monthlyTotals).toHaveLength(3);
    expect(data.monthlyTotals[0].month).toBe("2026-01");
    expect(data.monthlyTotals[1].month).toBe("2026-02");
    expect(data.monthlyTotals[2].month).toBe("2026-03");
  });

  it("groups expenses by year when period=year", async () => {
    const vehicleId = insertVehicle("Car");
    insertFuelLog(vehicleId, "2025-06-15", 10000, 40, 80);
    insertFuelLog(vehicleId, "2026-06-15", 11000, 42, 88);

    const res = await callGet("period=year&from=2025-01&to=2026-12");
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.monthlyTotals).toHaveLength(2);
    expect(data.monthlyTotals[0].month).toBe("2025");
    expect(data.monthlyTotals[1].month).toBe("2026");
  });

  it("provides category breakdown", async () => {
    const vehicleId = insertVehicle("Car");
    const taskId = insertTask("Paint");

    insertFuelLog(vehicleId, "2026-03-10", 10000, 40, 80);
    insertVehicleService(vehicleId, "2026-03-15", 200, "Service");
    insertCompletion(taskId, "2026-03-20", "100");
    insertQuote("Work", 500, "accepted", "2026-03-25");

    const res = await callGet("from=2026-03&to=2026-03");
    expect(res.status).toBe(200);
    const data = await res.json();

    const categories = data.categoryBreakdown as { category: string; total: number }[];
    const fuel = categories.find((c: { category: string }) => c.category === "Fuel");
    const maintenance = categories.find((c: { category: string }) => c.category === "Maintenance");
    const quotesCategory = categories.find((c: { category: string }) => c.category === "Quotes");

    expect(fuel?.total).toBe(80);
    expect(maintenance?.total).toBe(300); // 200 service + 100 completion
    expect(quotesCategory?.total).toBe(500);
  });

  it("provides top vendors by spend", async () => {
    const vendor1 = insertVendor("Mechanic Pro");
    const vendor2 = insertVendor("Budget Fix");
    const vehicleId = insertVehicle("Car");

    insertVehicleService(vehicleId, "2026-03-01", 500, "Major service", vendor1);
    insertVehicleService(vehicleId, "2026-03-15", 200, "Minor fix", vendor2);
    insertVehicleService(vehicleId, "2026-03-20", 300, "Another service", vendor1);

    const res = await callGet("from=2026-03&to=2026-03");
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.topVendors).toHaveLength(2);
    expect(data.topVendors[0].vendorName).toBe("Mechanic Pro");
    expect(data.topVendors[0].total).toBe(800);
    expect(data.topVendors[1].vendorName).toBe("Budget Fix");
    expect(data.topVendors[1].total).toBe(200);
  });

  it("provides per-vehicle cost summaries", async () => {
    const car1 = insertVehicle("Sedan");
    const car2 = insertVehicle("SUV");

    insertFuelLog(car1, "2026-03-10", 10000, 40, 80);
    insertFuelLog(car2, "2026-03-10", 20000, 50, 100);
    insertVehicleService(car1, "2026-03-15", 300, "Oil change");

    const res = await callGet("from=2026-03&to=2026-03");
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.vehicleSummaries).toHaveLength(2);

    const sedan = data.vehicleSummaries.find(
      (v: { vehicleName: string }) => v.vehicleName === "Sedan"
    );
    const suv = data.vehicleSummaries.find(
      (v: { vehicleName: string }) => v.vehicleName === "SUV"
    );

    expect(sedan.fuel).toBe(80);
    expect(sedan.services).toBe(300);
    expect(sedan.total).toBe(380);
    expect(suv.fuel).toBe(100);
    expect(suv.services).toBe(0);
    expect(suv.total).toBe(100);
  });

  it("filters by date range", async () => {
    const vehicleId = insertVehicle("Car");
    insertFuelLog(vehicleId, "2026-01-15", 10000, 40, 80);
    insertFuelLog(vehicleId, "2026-06-15", 15000, 42, 88);

    // Only query January
    const res = await callGet("from=2026-01&to=2026-01");
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.grandTotal).toBe(80);
    expect(data.monthlyTotals).toHaveLength(1);
  });

  it("handles cost text with currency symbols and commas", async () => {
    const taskId = insertTask("Expensive repair");
    insertCompletion(taskId, "2026-03-10", "$1,234.56");

    const res = await callGet("from=2026-03&to=2026-03");
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.grandTotal).toBeCloseTo(1234.56);
  });
});
