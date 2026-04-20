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
      list_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity TEXT,
      checked INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      category TEXT,
      added_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS item_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT,
      use_count INTEGER DEFAULT 1,
      last_used TEXT DEFAULT CURRENT_TIMESTAMP
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

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function insertList(name: string, color = "#3b82f6") {
  return sqlite
    .prepare("INSERT INTO shopping_lists (name, color) VALUES (?, ?)")
    .run(name, color);
}

function insertItem(
  listId: number,
  name: string,
  extra: Record<string, unknown> = {}
) {
  const cols = ["list_id", "name", ...Object.keys(extra)];
  const vals = [listId, name, ...Object.values(extra)];
  const placeholders = cols.map(() => "?").join(", ");
  return sqlite
    .prepare(
      `INSERT INTO shopping_items (${cols.join(", ")}) VALUES (${placeholders})`
    )
    .run(...vals);
}

function insertItemHistory(
  name: string,
  extra: Record<string, unknown> = {}
) {
  const cols = ["name", ...Object.keys(extra)];
  const vals = [name, ...Object.values(extra)];
  const placeholders = cols.map(() => "?").join(", ");
  return sqlite
    .prepare(
      `INSERT INTO item_history (${cols.join(", ")}) VALUES (${placeholders})`
    )
    .run(...vals);
}

// ═══════════════════════════════════════════════════════════════════════════
// PURE CATEGORIZATION LOGIC
// ═══════════════════════════════════════════════════════════════════════════

describe("categorizeItem()", () => {
  let categorizeItem: typeof import("@/lib/shopping-categories").categorizeItem;
  let getCategorySortOrder: typeof import("@/lib/shopping-categories").getCategorySortOrder;
  let getCategoryByName: typeof import("@/lib/shopping-categories").getCategoryByName;
  let SHOPPING_CATEGORIES: typeof import("@/lib/shopping-categories").SHOPPING_CATEGORIES;

  beforeEach(async () => {
    const mod = await import("@/lib/shopping-categories");
    categorizeItem = mod.categorizeItem;
    getCategorySortOrder = mod.getCategorySortOrder;
    getCategoryByName = mod.getCategoryByName;
    SHOPPING_CATEGORIES = mod.SHOPPING_CATEGORIES;
  });

  it("categorizes dairy items", () => {
    expect(categorizeItem("Milk")).toBe("Dairy");
    expect(categorizeItem("cheddar cheese")).toBe("Dairy");
    expect(categorizeItem("BUTTER")).toBe("Dairy");
    expect(categorizeItem("eggs")).toBe("Dairy");
  });

  it("categorizes produce items", () => {
    expect(categorizeItem("banana")).toBe("Produce");
    expect(categorizeItem("Red Onion")).toBe("Produce");
    expect(categorizeItem("baby spinach")).toBe("Produce");
  });

  it("categorizes bakery items", () => {
    expect(categorizeItem("bread")).toBe("Bakery");
    expect(categorizeItem("Sourdough Bread")).toBe("Bakery");
    expect(categorizeItem("bagels")).toBe("Bakery");
  });

  it("categorizes meat & seafood items", () => {
    expect(categorizeItem("chicken breast")).toBe("Meat & Seafood");
    expect(categorizeItem("salmon fillets")).toBe("Meat & Seafood");
    expect(categorizeItem("beef mince")).toBe("Meat & Seafood");
  });

  it("categorizes pantry items", () => {
    expect(categorizeItem("rice")).toBe("Pantry");
    expect(categorizeItem("olive oil")).toBe("Pantry");
    expect(categorizeItem("pasta")).toBe("Pantry");
  });

  it("categorizes drinks", () => {
    expect(categorizeItem("orange juice")).toBe("Drinks");
    expect(categorizeItem("coffee")).toBe("Drinks");
    expect(categorizeItem("sparkling water")).toBe("Drinks");
  });

  it("categorizes household items", () => {
    expect(categorizeItem("toilet paper")).toBe("Household");
    expect(categorizeItem("dish detergent")).toBe("Household");
    expect(categorizeItem("sponge")).toBe("Household");
  });

  it("categorizes frozen items", () => {
    expect(categorizeItem("ice cream")).toBe("Frozen");
    expect(categorizeItem("frozen peas")).toBe("Frozen");
    expect(categorizeItem("fish fingers")).toBe("Frozen");
  });

  it("returns null for unknown items", () => {
    expect(categorizeItem("unicorn dust")).toBeNull();
    expect(categorizeItem("something random")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(categorizeItem("MILK")).toBe("Dairy");
    expect(categorizeItem("Milk")).toBe("Dairy");
    expect(categorizeItem("milk")).toBe("Dairy");
  });

  it("matches multi-word keywords before single words", () => {
    // "sweet potato" should match Produce, not just "potato"
    expect(categorizeItem("sweet potato")).toBe("Produce");
    // "soy sauce" should match Pantry
    expect(categorizeItem("soy sauce")).toBe("Pantry");
    // "ice cream" should match Frozen
    expect(categorizeItem("ice cream")).toBe("Frozen");
  });

  it("getCategorySortOrder returns correct orders", () => {
    expect(getCategorySortOrder("Produce")).toBe(0);
    expect(getCategorySortOrder("Dairy")).toBe(1);
    expect(getCategorySortOrder("Other")).toBe(8);
    expect(getCategorySortOrder(null)).toBe(999);
    expect(getCategorySortOrder("Unknown")).toBe(999);
  });

  it("getCategoryByName finds categories", () => {
    const dairy = getCategoryByName("Dairy");
    expect(dairy).toBeDefined();
    expect(dairy?.color).toBe("#3b82f6");
    expect(getCategoryByName("nonexistent")).toBeUndefined();
  });

  it("SHOPPING_CATEGORIES has correct count", () => {
    expect(SHOPPING_CATEGORIES).toHaveLength(9);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// API: POST /api/shopping/items
// ═══════════════════════════════════════════════════════════════════════════

describe("Shopping Items API - Category", () => {
  let itemsRoute: typeof import("@/app/api/shopping/items/route");

  beforeEach(async () => {
    itemsRoute = await import("@/app/api/shopping/items/route");
  });

  it("auto-categorizes known items on POST", async () => {
    const listResult = insertList("Groceries");
    const listId = Number(listResult.lastInsertRowid);

    const req = makeRequest(
      "/api/shopping/items",
      jsonBody({ listId, name: "Milk" })
    );
    const res = await itemsRoute.POST(req);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify in DB
    const row = sqlite
      .prepare("SELECT category FROM shopping_items WHERE id = ?")
      .get(Number(data.id)) as Record<string, unknown>;
    expect(row.category).toBe("Dairy");
  });

  it("stores category as null for unknown items", async () => {
    const listResult = insertList("Groceries");
    const listId = Number(listResult.lastInsertRowid);

    const req = makeRequest(
      "/api/shopping/items",
      jsonBody({ listId, name: "unicorn dust" })
    );
    const res = await itemsRoute.POST(req);

    expect(res.status).toBe(201);
    const data = await res.json();

    const row = sqlite
      .prepare("SELECT category FROM shopping_items WHERE id = ?")
      .get(Number(data.id)) as Record<string, unknown>;
    expect(row.category).toBeNull();
  });

  it("accepts explicit category override", async () => {
    const listResult = insertList("Groceries");
    const listId = Number(listResult.lastInsertRowid);

    const req = makeRequest(
      "/api/shopping/items",
      jsonBody({ listId, name: "Milk", category: "Pantry" })
    );
    const res = await itemsRoute.POST(req);

    expect(res.status).toBe(201);
    const data = await res.json();

    const row = sqlite
      .prepare("SELECT category FROM shopping_items WHERE id = ?")
      .get(Number(data.id)) as Record<string, unknown>;
    expect(row.category).toBe("Pantry");
  });

  it("uses category from item history when available", async () => {
    const listResult = insertList("Groceries");
    const listId = Number(listResult.lastInsertRowid);

    // Pre-populate item history with a custom category
    insertItemHistory("special item", { category: "Frozen" });

    const req = makeRequest(
      "/api/shopping/items",
      jsonBody({ listId, name: "Special Item" })
    );
    const res = await itemsRoute.POST(req);

    expect(res.status).toBe(201);
    const data = await res.json();

    const row = sqlite
      .prepare("SELECT category FROM shopping_items WHERE id = ?")
      .get(Number(data.id)) as Record<string, unknown>;
    expect(row.category).toBe("Frozen");
  });

  it("saves category to item history on POST", async () => {
    const listResult = insertList("Groceries");
    const listId = Number(listResult.lastInsertRowid);

    const req = makeRequest(
      "/api/shopping/items",
      jsonBody({ listId, name: "Bread" })
    );
    await itemsRoute.POST(req);

    // Check item_history
    const historyRow = sqlite
      .prepare("SELECT category FROM item_history WHERE name = ?")
      .get("bread") as Record<string, unknown>;
    expect(historyRow.category).toBe("Bakery");
  });

  it("updates item history category on repeated adds", async () => {
    const listResult = insertList("Groceries");
    const listId = Number(listResult.lastInsertRowid);

    // First add - auto-categorized
    await itemsRoute.POST(
      makeRequest(
        "/api/shopping/items",
        jsonBody({ listId, name: "Bread" })
      )
    );

    // Second add - explicit override
    await itemsRoute.POST(
      makeRequest(
        "/api/shopping/items",
        jsonBody({ listId, name: "Bread", category: "Other" })
      )
    );

    const historyRow = sqlite
      .prepare("SELECT category, use_count FROM item_history WHERE name = ?")
      .get("bread") as Record<string, unknown>;
    expect(historyRow.category).toBe("Other");
    expect(historyRow.use_count).toBe(2);
  });

  it("returns 400 when listId is missing", async () => {
    const req = makeRequest(
      "/api/shopping/items",
      jsonBody({ name: "Milk" })
    );
    const res = await itemsRoute.POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is missing", async () => {
    const req = makeRequest(
      "/api/shopping/items",
      jsonBody({ listId: 1 })
    );
    const res = await itemsRoute.POST(req);
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// API: PUT /api/shopping/items/[id] - category update
// ═══════════════════════════════════════════════════════════════════════════

describe("Shopping Items API - Category Update", () => {
  let itemsIdRoute: typeof import("@/app/api/shopping/items/[id]/route");

  beforeEach(async () => {
    itemsIdRoute = await import("@/app/api/shopping/items/[id]/route");
  });

  it("updates item category via PUT", async () => {
    const listResult = insertList("Groceries");
    const listId = Number(listResult.lastInsertRowid);
    const itemResult = insertItem(listId, "Mystery Item", { category: null });
    const itemId = String(itemResult.lastInsertRowid);

    const req = makeRequest(
      `/api/shopping/items/${itemId}`,
      putBody({ category: "Dairy" })
    );
    const res = await itemsIdRoute.PUT(req, makeParams(itemId));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    const row = sqlite
      .prepare("SELECT category FROM shopping_items WHERE id = ?")
      .get(itemId) as Record<string, unknown>;
    expect(row.category).toBe("Dairy");
  });

  it("returns 404 for non-existent item", async () => {
    const req = makeRequest(
      "/api/shopping/items/999",
      putBody({ category: "Dairy" })
    );
    const res = await itemsIdRoute.PUT(req, makeParams("999"));
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// API: GET /api/shopping/lists/[id] - items include category
// ═══════════════════════════════════════════════════════════════════════════

describe("Shopping List GET - Category in items", () => {
  let listsIdRoute: typeof import("@/app/api/shopping/lists/[id]/route");

  beforeEach(async () => {
    listsIdRoute = await import("@/app/api/shopping/lists/[id]/route");
  });

  it("returns items with category field", async () => {
    const listResult = insertList("Groceries");
    const listId = Number(listResult.lastInsertRowid);
    insertItem(listId, "Milk", { category: "Dairy" });
    insertItem(listId, "Bread", { category: "Bakery" });
    insertItem(listId, "Unknown Thing");

    const req = makeRequest(`/api/shopping/lists/${listId}`);
    const res = await listsIdRoute.GET(req, makeParams(String(listId)));

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.items).toHaveLength(3);
    expect(data.items[0].category).toBe("Dairy");
    expect(data.items[1].category).toBe("Bakery");
    expect(data.items[2].category).toBeNull();
  });
});
