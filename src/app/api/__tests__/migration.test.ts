import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";

// ─── In-memory DB wiring ────────────────────────────────────────────────────

let sqlite: Database.Database;

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

// ─── Migration logic (copied from src/lib/db/index.ts migrateToHouseholds) ──

function migrateToHouseholds(db: Database.Database) {
  const unassigned = db
    .prepare(`SELECT COUNT(*) as count FROM tasks WHERE household_id IS NULL`)
    .get() as { count: number };

  const householdCount = db
    .prepare(`SELECT COUNT(*) as count FROM households`)
    .get() as { count: number };

  // Nothing to migrate if no unassigned rows and households already exist
  if (unassigned.count === 0 && householdCount.count > 0) return;

  // If no households exist but there are users, create a default one
  if (householdCount.count === 0) {
    const userCount = db
      .prepare(`SELECT COUNT(*) as count FROM users`)
      .get() as { count: number };

    // No users yet (fresh install) - skip migration, setup wizard will handle it
    if (userCount.count === 0) return;

    const tx = db.transaction(() => {
      // Create default household
      db.exec(`INSERT INTO households (name) VALUES ('Home')`);
      const household = db
        .prepare(`SELECT id FROM households ORDER BY id DESC LIMIT 1`)
        .get() as { id: number };

      // Assign all existing users to the default household
      const users = db.prepare(`SELECT id FROM users`).all() as { id: number }[];
      const insertMembership = db.prepare(
        `INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, 'owner')`
      );
      for (const user of users) {
        insertMembership.run(user.id, household.id);
      }

      // Backfill household_id on all existing rows
      db.prepare(`UPDATE tasks SET household_id = ? WHERE household_id IS NULL`).run(household.id);
      db.prepare(`UPDATE appliances SET household_id = ? WHERE household_id IS NULL`).run(household.id);
      db.prepare(`UPDATE vendors SET household_id = ? WHERE household_id IS NULL`).run(household.id);
      db.prepare(`UPDATE quotes SET household_id = ? WHERE household_id IS NULL`).run(household.id);
    });

    tx();
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function countRows(table: string): number {
  return (
    sqlite.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as {
      count: number;
    }
  ).count;
}

function getAllRows<T = Record<string, unknown>>(table: string): T[] {
  return sqlite.prepare(`SELECT * FROM ${table}`).all() as T[];
}

// ─── Test lifecycle ─────────────────────────────────────────────────────────

beforeEach(() => {
  sqlite = new Database(":memory:");
  createTables();
});

afterEach(() => {
  sqlite.close();
});

// ═══════════════════════════════════════════════════════════════════════════
// MIGRATION: migrateToHouseholds
// ═══════════════════════════════════════════════════════════════════════════

describe("migrateToHouseholds", () => {
  describe("existing single-household database", () => {
    beforeEach(() => {
      // Seed an existing database: 2 users, 3 tasks, 2 appliances, 1 vendor, 1 quote
      // All with household_id NULL (pre-migration state)
      sqlite.exec(`INSERT INTO users (name, color) VALUES ('Alice', '#3b82f6')`);
      sqlite.exec(`INSERT INTO users (name, color) VALUES ('Bob', '#ef4444')`);

      sqlite.exec(`INSERT INTO tasks (name, area, frequency) VALUES ('Mow lawn', 'Outdoor', 'weekly')`);
      sqlite.exec(`INSERT INTO tasks (name, area, frequency) VALUES ('Vacuum', 'Living Room', 'weekly')`);
      sqlite.exec(`INSERT INTO tasks (name, area, frequency) VALUES ('Dishes', 'Kitchen', 'daily')`);

      sqlite.exec(`INSERT INTO appliances (name, location, brand) VALUES ('Dishwasher', 'Kitchen', 'Bosch')`);
      sqlite.exec(`INSERT INTO appliances (name, location, brand) VALUES ('Washing Machine', 'Laundry', 'LG')`);

      sqlite.exec(`INSERT INTO vendors (name, category) VALUES ('Plumber Joe', 'Plumbing')`);

      sqlite.exec(`INSERT INTO quotes (vendor_id, description, total) VALUES (1, 'Fix tap', 150.00)`);
    });

    it("creates a default Home household", () => {
      migrateToHouseholds(sqlite);

      const households = getAllRows<{ id: number; name: string }>("households");
      expect(households).toHaveLength(1);
      expect(households[0].name).toBe("Home");
    });

    it("assigns all existing users to the household as owners", () => {
      migrateToHouseholds(sqlite);

      const memberships = getAllRows<{
        user_id: number;
        household_id: number;
        role: string;
      }>("user_households");
      expect(memberships).toHaveLength(2);

      for (const m of memberships) {
        expect(m.household_id).toBe(1);
        expect(m.role).toBe("owner");
      }

      const userIds = memberships.map((m) => m.user_id).sort();
      expect(userIds).toEqual([1, 2]);
    });

    it("backfills household_id on all tasks", () => {
      migrateToHouseholds(sqlite);

      const tasks = getAllRows<{ id: number; household_id: number }>("tasks");
      expect(tasks).toHaveLength(3);
      for (const t of tasks) {
        expect(t.household_id).toBe(1);
      }
    });

    it("backfills household_id on all appliances", () => {
      migrateToHouseholds(sqlite);

      const appliances = getAllRows<{ id: number; household_id: number }>("appliances");
      expect(appliances).toHaveLength(2);
      for (const a of appliances) {
        expect(a.household_id).toBe(1);
      }
    });

    it("backfills household_id on all vendors", () => {
      migrateToHouseholds(sqlite);

      const vendors = getAllRows<{ id: number; household_id: number }>("vendors");
      expect(vendors).toHaveLength(1);
      expect(vendors[0].household_id).toBe(1);
    });

    it("backfills household_id on all quotes", () => {
      migrateToHouseholds(sqlite);

      const quotes = getAllRows<{ id: number; household_id: number }>("quotes");
      expect(quotes).toHaveLength(1);
      expect(quotes[0].household_id).toBe(1);
    });
  });

  describe("idempotency", () => {
    it("running the migration twice does not create duplicate households", () => {
      sqlite.exec(`INSERT INTO users (name, color) VALUES ('Alice', '#3b82f6')`);
      sqlite.exec(`INSERT INTO tasks (name, area, frequency) VALUES ('Vacuum', 'Living Room', 'weekly')`);

      migrateToHouseholds(sqlite);
      migrateToHouseholds(sqlite);

      expect(countRows("households")).toBe(1);
      expect(countRows("user_households")).toBe(1);

      const task = sqlite
        .prepare("SELECT household_id FROM tasks WHERE id = 1")
        .get() as { household_id: number };
      expect(task.household_id).toBe(1);
    });
  });

  describe("fresh install (no users)", () => {
    it("does not create a household when no users exist", () => {
      migrateToHouseholds(sqlite);

      expect(countRows("households")).toBe(0);
      expect(countRows("user_households")).toBe(0);
    });
  });
});
