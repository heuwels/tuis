import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import { format, subDays, addDays, startOfWeek } from "date-fns";

// Use /app/data in Docker, otherwise current directory
const dataDir = fs.existsSync("/app/data") ? "/app/data" : process.cwd();
const dbPath = path.join(dataDir, "chore-calendar.db");

function today() {
  return format(new Date(), "yyyy-MM-dd");
}

function daysAgo(n: number) {
  return format(subDays(new Date(), n), "yyyy-MM-dd");
}

function daysFromNow(n: number) {
  return format(addDays(new Date(), n), "yyyy-MM-dd");
}

function mondayThisWeek() {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

function dayOfWeek(offset: number) {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  return format(addDays(monday, offset), "yyyy-MM-dd");
}

function initTables(sqlite: InstanceType<typeof Database>) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3b82f6', created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, area TEXT NOT NULL,
      frequency TEXT NOT NULL, assigned_day TEXT, season TEXT, notes TEXT, extended_notes TEXT,
      assigned_to INTEGER REFERENCES users(id), appliance_id INTEGER,
      last_completed TEXT, next_due TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL,
      completed_at TEXT NOT NULL, completed_by INTEGER REFERENCES users(id),
      vendor_id INTEGER, cost TEXT, FOREIGN KEY (task_id) REFERENCES tasks(id)
    );
    CREATE TABLE IF NOT EXISTS shopping_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      color TEXT DEFAULT '#3b82f6', sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS shopping_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, list_id INTEGER NOT NULL, name TEXT NOT NULL,
      quantity TEXT, checked INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0,
      added_by INTEGER REFERENCES users(id), created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS item_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
      use_count INTEGER DEFAULT 1, last_used TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT,
      instructions TEXT, prep_time INTEGER, cook_time INTEGER, servings INTEGER, image_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT, recipe_id INTEGER NOT NULL, name TEXT NOT NULL,
      quantity TEXT, amount REAL, unit TEXT, section TEXT, sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS meal_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL UNIQUE,
      recipe_id INTEGER REFERENCES recipes(id), servings_multiplier REAL DEFAULT 1,
      custom_meal TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT NOT NULL,
      image_url TEXT, notes TEXT, status TEXT NOT NULL DEFAULT 'wishlist',
      completed_date TEXT, rating INTEGER, url TEXT, location TEXT,
      estimated_cost TEXT, duration TEXT, season TEXT, priority TEXT DEFAULT 'medium',
      tags TEXT, review TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS appliances (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, location TEXT,
      brand TEXT, model TEXT, purchase_date TEXT, warranty_expiry TEXT,
      manual_url TEXT, warranty_doc_url TEXT, notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT,
      phone TEXT, email TEXT, website TEXT, notes TEXT, rating INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, vendor_id INTEGER REFERENCES vendors(id),
      description TEXT NOT NULL, total REAL NOT NULL, labor REAL, materials REAL, other REAL,
      status TEXT NOT NULL DEFAULT 'pending', received_date TEXT, notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS google_calendar_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL, token_expiry TEXT NOT NULL,
      calendar_id TEXT DEFAULT 'primary', connected_email TEXT NOT NULL,
      sync_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS task_calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL,
      google_event_id TEXT NOT NULL, event_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      make TEXT, model TEXT, year INTEGER, colour TEXT,
      rego_number TEXT, rego_state TEXT, vin TEXT,
      purchase_date TEXT, purchase_price REAL, current_odometer INTEGER,
      image_url TEXT, rego_expiry TEXT, insurance_provider TEXT,
      insurance_expiry TEXT, warranty_expiry_date TEXT, warranty_expiry_km INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS vehicle_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      date TEXT NOT NULL, odometer INTEGER,
      vendor_id INTEGER REFERENCES vendors(id),
      cost REAL, description TEXT NOT NULL, service_type TEXT,
      receipt_url TEXT, is_diy INTEGER DEFAULT 0, notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS fuel_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      date TEXT NOT NULL, odometer INTEGER NOT NULL,
      litres REAL NOT NULL, cost_total REAL NOT NULL,
      cost_per_litre REAL, station TEXT,
      is_full_tank INTEGER DEFAULT 1, notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function seedDemo() {
  console.log("Seeding demo data...");

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  initTables(sqlite);

  // ── Users ──
  const insertUser = sqlite.prepare(
    `INSERT OR IGNORE INTO users (name, color) VALUES (?, ?)`
  );
  insertUser.run("Alex", "#3b82f6");
  insertUser.run("Sam", "#ec4899");
  console.log("✓ Users");

  const users = sqlite.prepare("SELECT id, name FROM users").all() as {
    id: number;
    name: string;
  }[];
  const lukeId = users.find((u) => u.name === "Alex")?.id ?? 1;
  const juliaId = users.find((u) => u.name === "Sam")?.id ?? 2;

  // ── Tasks ──
  const existingTasks = (
    sqlite.prepare("SELECT COUNT(*) as count FROM tasks").get() as {
      count: number;
    }
  ).count;

  if (existingTasks === 0) {
    const insertTask = sqlite.prepare(`
      INSERT INTO tasks (name, area, frequency, assigned_to, notes, next_due, last_completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const tasks = [
      // Overdue
      ["Vacuum whole house", "Whole house", "weekly", lukeId, "All rooms including hallway", daysAgo(3), daysAgo(10)],
      ["Clean shower glass", "Bathroom", "weekly", juliaId, "Use vinegar spray", daysAgo(2), daysAgo(9)],
      ["Mop kitchen floor", "Kitchen", "weekly", lukeId, null, daysAgo(1), daysAgo(8)],
      // Due today
      ["Wipe kitchen benches", "Kitchen", "daily", null, "Use antibacterial spray", today(), daysAgo(1)],
      ["Take bins out", "Exterior", "weekly", lukeId, "Green bin this week", today(), daysAgo(7)],
      ["Water indoor plants", "Lounge", "weekly", juliaId, "Check soil moisture first", today(), daysAgo(7)],
      // Upcoming this week
      ["Clean oven", "Kitchen", "monthly", lukeId, "Use oven cleaner, leave 30min", daysFromNow(2), daysAgo(28)],
      ["Wash bed sheets", "Bedrooms", "bi-weekly", juliaId, "Hot wash, line dry", daysFromNow(3), daysAgo(11)],
      ["Mow front lawn", "Garden", "bi-weekly", lukeId, "Check fuel level first", daysFromNow(4), daysAgo(12)],
      ["Dust shelves", "Lounge", "bi-weekly", juliaId, "Use microfibre cloth", daysFromNow(5), daysAgo(13)],
      // Future
      ["Clean gutters", "Exterior", "quarterly", lukeId, "Use ladder safely, check downpipes", daysFromNow(14), daysAgo(76)],
      ["Deep clean fridge", "Kitchen", "monthly", juliaId, "Remove all shelves, wipe with bicarb", daysFromNow(21), daysAgo(25)],
      ["Service aircon filters", "Whole house", "quarterly", lukeId, "Wash and dry filters", daysFromNow(30), daysAgo(60)],
      ["Clean windows inside", "Whole house", "monthly", juliaId, "Newspaper and vinegar method", daysFromNow(10), daysAgo(20)],
      // Ad-hoc
      ["Replace smoke alarm batteries", "Whole house", "annual", lukeId, "9V batteries in garage", null, daysAgo(180)],
      ["Touch up paint in hallway", "Interior", "adhoc", null, "Dulux Natural White, half tin in garage", null, null],
      ["Fix squeaky door hinge", "Lounge", "adhoc", lukeId, "WD-40 or replace hinge pin", null, null],
      // Daily
      ["Make beds", "Bedrooms", "daily", null, null, today(), daysAgo(1)],
      ["Wash dishes", "Kitchen", "daily", null, "Run dishwasher if full", today(), daysAgo(1)],
      ["Wipe bathroom sink", "Bathroom", "daily", null, null, today(), daysAgo(1)],
    ];

    const tx = sqlite.transaction(() => {
      for (const t of tasks) {
        insertTask.run(...t);
      }
    });
    tx();
    console.log(`✓ ${tasks.length} tasks`);

    // Completions for recent history
    const allTasks = sqlite
      .prepare("SELECT id, name FROM tasks")
      .all() as { id: number; name: string }[];

    const insertCompletion = sqlite.prepare(
      `INSERT INTO completions (task_id, completed_at, completed_by) VALUES (?, ?, ?)`
    );

    const completionTx = sqlite.transaction(() => {
      // Scatter completions over past week
      for (const task of allTasks.slice(0, 12)) {
        const daysBack = Math.floor(Math.random() * 7);
        const who = Math.random() > 0.5 ? lukeId : juliaId;
        insertCompletion.run(task.id, daysAgo(daysBack), who);
      }
      // A few extra for today and yesterday
      for (const task of allTasks.slice(0, 4)) {
        insertCompletion.run(task.id, today(), lukeId);
      }
      for (const task of allTasks.slice(4, 7)) {
        insertCompletion.run(task.id, daysAgo(1), juliaId);
      }
    });
    completionTx();
    console.log("✓ Completions");
  } else {
    console.log(`  Skipping tasks (${existingTasks} already exist)`);
  }

  // ── Recipes ──
  const existingRecipes = (
    sqlite.prepare("SELECT COUNT(*) as count FROM recipes").get() as {
      count: number;
    }
  ).count;

  if (existingRecipes === 0) {
    const insertRecipe = sqlite.prepare(`
      INSERT INTO recipes (name, description, instructions, prep_time, cook_time, servings, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    const insertIngredient = sqlite.prepare(`
      INSERT INTO recipe_ingredients (recipe_id, name, amount, unit, section, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const recipeTx = sqlite.transaction(() => {
      // Recipe 1: Spaghetti Bolognese
      const r1 = insertRecipe.run(
        "Spaghetti Bolognese",
        "Classic family favourite with a rich meat sauce",
        "Heat olive oil in a large pan over medium heat.\nAdd onion, garlic, carrot and celery. Cook for 5 minutes until softened.\nAdd mince and cook until browned, breaking up lumps.\nAdd tinned tomatoes, tomato paste, oregano, salt and pepper.\nSimmer on low for 30 minutes, stirring occasionally.\nCook spaghetti according to packet directions.\nServe sauce over pasta with parmesan.",
        15, 40, 4
      );
      const r1id = Number(r1.lastInsertRowid);
      [
        [r1id, "Spaghetti", 400, "g", null, 0],
        [r1id, "Beef mince", 500, "g", "Sauce", 1],
        [r1id, "Onion", 1, "whole", "Sauce", 2],
        [r1id, "Garlic cloves", 3, "whole", "Sauce", 3],
        [r1id, "Carrot", 1, "whole", "Sauce", 4],
        [r1id, "Tinned tomatoes", 400, "g", "Sauce", 5],
        [r1id, "Tomato paste", 2, "tbsp", "Sauce", 6],
        [r1id, "Olive oil", 2, "tbsp", "Sauce", 7],
        [r1id, "Parmesan", 50, "g", "Topping", 8],
      ].forEach((i) => insertIngredient.run(...i));

      // Recipe 2: Chicken Stir-fry
      const r2 = insertRecipe.run(
        "Chicken Stir-fry",
        "Quick weeknight stir-fry with seasonal veg",
        "Slice chicken into strips and marinate in soy sauce and cornflour for 10 minutes.\nHeat sesame oil in a wok over high heat.\nStir-fry chicken for 3-4 minutes until cooked through. Remove and set aside.\nAdd capsicum, broccoli and snow peas. Stir-fry 2-3 minutes.\nReturn chicken, add oyster sauce and toss to combine.\nServe over steamed rice.",
        15, 10, 2
      );
      const r2id = Number(r2.lastInsertRowid);
      [
        [r2id, "Chicken breast", 400, "g", null, 0],
        [r2id, "Soy sauce", 2, "tbsp", null, 1],
        [r2id, "Cornflour", 1, "tbsp", null, 2],
        [r2id, "Sesame oil", 1, "tbsp", null, 3],
        [r2id, "Red capsicum", 1, "whole", null, 4],
        [r2id, "Broccoli", 200, "g", null, 5],
        [r2id, "Snow peas", 100, "g", null, 6],
        [r2id, "Oyster sauce", 2, "tbsp", null, 7],
        [r2id, "Steamed rice", 2, "cup", null, 8],
      ].forEach((i) => insertIngredient.run(...i));

      // Recipe 3: Lamb Chops with Roast Veg
      const r3 = insertRecipe.run(
        "Lamb Chops with Roast Veg",
        "Simple roast dinner, great for weekends",
        "Preheat oven to 200°C.\nToss potato, sweet potato and pumpkin with olive oil, salt and rosemary.\nRoast for 35 minutes, turning halfway.\nSeason lamb chops with salt, pepper and garlic.\nPan-fry lamb 3 minutes each side for medium.\nRest 5 minutes, serve with roast veg and mint sauce.",
        10, 40, 2
      );
      const r3id = Number(r3.lastInsertRowid);
      [
        [r3id, "Lamb chops", 4, "whole", null, 0],
        [r3id, "Potato", 2, "whole", "Roast Veg", 1],
        [r3id, "Sweet potato", 1, "whole", "Roast Veg", 2],
        [r3id, "Pumpkin", 300, "g", "Roast Veg", 3],
        [r3id, "Olive oil", 2, "tbsp", "Roast Veg", 4],
        [r3id, "Rosemary", 2, "tsp", "Roast Veg", 5],
        [r3id, "Garlic cloves", 2, "whole", null, 6],
      ].forEach((i) => insertIngredient.run(...i));

      // Recipe 4: Fish Tacos
      const r4 = insertRecipe.run(
        "Fish Tacos",
        "Battered fish with slaw and lime crema",
        "Mix flour, paprika, salt and beer to make batter.\nCut fish into strips and coat in batter.\nFry in oil at 180°C for 3-4 minutes until golden.\nShred cabbage and mix with lime juice and coriander for slaw.\nMix sour cream with lime zest for crema.\nWarm tortillas, assemble with fish, slaw and crema.",
        20, 15, 4
      );
      const r4id = Number(r4.lastInsertRowid);
      [
        [r4id, "White fish fillets", 500, "g", null, 0],
        [r4id, "Plain flour", 1, "cup", "Batter", 1],
        [r4id, "Paprika", 1, "tsp", "Batter", 2],
        [r4id, "Beer", 200, "mL", "Batter", 3],
        [r4id, "Small tortillas", 8, "whole", null, 4],
        [r4id, "Red cabbage", 0.25, "whole", "Slaw", 5],
        [r4id, "Lime", 2, "whole", null, 6],
        [r4id, "Sour cream", 100, "g", "Crema", 7],
        [r4id, "Coriander", 1, "bunch", null, 8],
      ].forEach((i) => insertIngredient.run(...i));

      // Recipe 5: Pumpkin Soup
      const r5 = insertRecipe.run(
        "Pumpkin Soup",
        "Creamy roasted pumpkin soup, perfect for winter",
        "Preheat oven to 200°C.\nCut pumpkin into chunks, toss with olive oil and roast 25 minutes.\nSauté onion and garlic in a large pot until soft.\nAdd roasted pumpkin and stock. Simmer 15 minutes.\nBlend until smooth with a stick blender.\nStir in cream, season with salt, pepper and nutmeg.\nServe with crusty bread.",
        10, 45, 4
      );
      const r5id = Number(r5.lastInsertRowid);
      [
        [r5id, "Butternut pumpkin", 1, "kg", null, 0],
        [r5id, "Onion", 1, "whole", null, 1],
        [r5id, "Garlic cloves", 2, "whole", null, 2],
        [r5id, "Chicken stock", 750, "mL", null, 3],
        [r5id, "Thickened cream", 100, "mL", null, 4],
        [r5id, "Olive oil", 2, "tbsp", null, 5],
        [r5id, "Nutmeg", 0.5, "tsp", null, 6],
      ].forEach((i) => insertIngredient.run(...i));
    });
    recipeTx();
    console.log("✓ 5 recipes with ingredients");
  } else {
    console.log(`  Skipping recipes (${existingRecipes} already exist)`);
  }

  // ── Meal Plan (this week) ──
  const existingMeals = (
    sqlite
      .prepare("SELECT COUNT(*) as count FROM meal_plan WHERE date >= ?")
      .get(mondayThisWeek()) as { count: number }
  ).count;

  if (existingMeals === 0) {
    const recipes = sqlite
      .prepare("SELECT id, name FROM recipes")
      .all() as { id: number; name: string }[];

    if (recipes.length >= 4) {
      const insertMeal = sqlite.prepare(`
        INSERT OR IGNORE INTO meal_plan (date, recipe_id, servings_multiplier, custom_meal, notes)
        VALUES (?, ?, ?, ?, ?)
      `);

      insertMeal.run(dayOfWeek(0), recipes[0].id, 1, null, null); // Monday
      insertMeal.run(dayOfWeek(1), recipes[1].id, 1, null, "Use the leftover veg from Sunday"); // Tuesday
      insertMeal.run(dayOfWeek(2), null, null, "Leftover bolognese", null); // Wednesday
      insertMeal.run(dayOfWeek(3), recipes[3].id, 1.5, null, "Having friends over"); // Thursday
      insertMeal.run(dayOfWeek(4), recipes[4].id, 1, null, "Soup night"); // Friday
      insertMeal.run(dayOfWeek(6), recipes[2].id, 1, null, "Sunday roast"); // Sunday
      console.log("✓ 6 meals this week");
    }
  } else {
    console.log(`  Skipping meals (${existingMeals} already exist this week)`);
  }

  // ── Shopping Lists ──
  const existingLists = (
    sqlite
      .prepare("SELECT COUNT(*) as count FROM shopping_lists")
      .get() as { count: number }
  ).count;

  if (existingLists === 0) {
    const insertList = sqlite.prepare(
      `INSERT INTO shopping_lists (name, color, sort_order) VALUES (?, ?, ?)`
    );
    const insertItem = sqlite.prepare(
      `INSERT INTO shopping_items (list_id, name, quantity, checked) VALUES (?, ?, ?, ?)`
    );

    const listTx = sqlite.transaction(() => {
      const l1 = insertList.run("Weekly Groceries", "#22c55e", 0);
      const l1id = Number(l1.lastInsertRowid);
      [
        [l1id, "Milk 2L", "1", 0],
        [l1id, "Sourdough bread", "1 loaf", 0],
        [l1id, "Free range eggs", "1 dozen", 0],
        [l1id, "Chicken breast", "500g", 0],
        [l1id, "Broccoli", "1 head", 0],
        [l1id, "Bananas", "1 bunch", 1],
        [l1id, "Greek yoghurt", "500g", 1],
        [l1id, "Cheddar cheese", "250g", 1],
      ].forEach((i) => insertItem.run(...i));

      const l2 = insertList.run("Bunnings", "#f59e0b", 1);
      const l2id = Number(l2.lastInsertRowid);
      [
        [l2id, "WD-40", "1", 0],
        [l2id, "Dulux Natural White 1L", "1", 0],
        [l2id, "Sandpaper 120 grit", "1 pack", 0],
        [l2id, "Cable ties", "1 pack", 1],
      ].forEach((i) => insertItem.run(...i));

      const l3 = insertList.run("Costco Run", "#8b5cf6", 2);
      const l3id = Number(l3.lastInsertRowid);
      [
        [l3id, "Toilet paper 48pk", "1", 0],
        [l3id, "Dishwasher tablets", "1 box", 0],
        [l3id, "Olive oil 2L", "1", 0],
      ].forEach((i) => insertItem.run(...i));
    });
    listTx();
    console.log("✓ 3 shopping lists with items");
  } else {
    console.log(`  Skipping shopping lists (${existingLists} already exist)`);
  }

  // ── Appliances ──
  const existingAppliances = (
    sqlite
      .prepare("SELECT COUNT(*) as count FROM appliances")
      .get() as { count: number }
  ).count;

  if (existingAppliances === 0) {
    const insertAppliance = sqlite.prepare(`
      INSERT INTO appliances (name, location, brand, model, purchase_date, warranty_expiry, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    [
      ["Samsung Fridge", "Kitchen", "Samsung", "SRF680CDLS", "2023-06-15", "2028-06-15", "French door, 680L. Filter replacement every 6 months."],
      ["Bosch Dishwasher", "Kitchen", "Bosch", "SMS66MW01A", "2024-01-20", "2027-01-20", "Series 6, check salt indicator monthly"],
      ["Dyson V15 Detect", "Laundry", "Dyson", "V15 Detect Absolute", "2024-08-10", "2026-08-10", "Empty bin after each use, wash filter monthly"],
      ["Daikin Split System", "Lounge", "Daikin", "FTXM25WVMA", "2022-11-05", "2027-11-05", "Clean filters every 2 weeks in summer"],
      ["Fisher & Paykel Washer", "Laundry", "Fisher & Paykel", "WH8060J3", "2023-03-12", "2025-03-12", "Warranty expired. Run tub clean cycle monthly."],
      ["Breville Espresso", "Kitchen", "Breville", "BES870", "2024-05-01", "2026-05-01", "Descale every 2-3 months, replace water filter annually"],
    ].forEach((a) => insertAppliance.run(...a));
    console.log("✓ 6 appliances");
  } else {
    console.log(`  Skipping appliances (${existingAppliances} already exist)`);
  }

  // ── Vendors ──
  const existingVendors = (
    sqlite
      .prepare("SELECT COUNT(*) as count FROM vendors")
      .get() as { count: number }
  ).count;

  if (existingVendors === 0) {
    const insertVendor = sqlite.prepare(`
      INSERT INTO vendors (name, category, phone, email, website, notes, rating)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const vendorData = [
      ["Dave's Plumbing", "Plumber", "0412 345 678", "dave@davesplumbing.com.au", "https://davesplumbing.com.au", "Reliable, does weekends. Fixed hot water in 2024.", 5],
      ["Sparkwise Electrical", "Electrician", "0423 456 789", "jobs@sparkwise.com.au", null, "Licensed. Did switchboard upgrade.", 4],
      ["CoolBreeze HVAC", "HVAC", "0434 567 890", null, "https://coolbreeze.com.au", "Yearly aircon service. Good rates.", 4],
      ["GreenEdge Mowing", "Landscaping", "0445 678 901", "info@greenedge.com.au", null, "Fortnightly mow and edge. $60/visit.", 3],
      ["CleanStar", "Cleaning", "0456 789 012", "bookings@cleanstar.com.au", "https://cleanstar.com.au", "Deep clean before Christmas. $280 for 3BR.", 4],
      ["AllFix Appliance Repair", "Appliance Repair", "0467 890 123", null, null, "Fixed dishwasher drain pump. Quick turnaround.", 5],
    ];

    vendorData.forEach((v) => insertVendor.run(...v));
    console.log("✓ 6 vendors");
  } else {
    console.log(`  Skipping vendors (${existingVendors} already exist)`);
  }

  // ── Quotes ──
  const existingQuotes = (
    sqlite
      .prepare("SELECT COUNT(*) as count FROM quotes")
      .get() as { count: number }
  ).count;

  if (existingQuotes === 0) {
    const vendors = sqlite
      .prepare("SELECT id, name FROM vendors")
      .all() as { id: number; name: string }[];

    const insertQuote = sqlite.prepare(`
      INSERT INTO quotes (vendor_id, description, total, labor, materials, other, status, received_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const plumberId = vendors.find((v) => v.name.includes("Plumbing"))?.id;
    const electricianId = vendors.find((v) => v.name.includes("Sparkwise"))?.id;
    const hvacId = vendors.find((v) => v.name.includes("CoolBreeze"))?.id;
    const repairId = vendors.find((v) => v.name.includes("AllFix"))?.id;

    [
      [plumberId, "Replace hot water system", 2800, 1200, 1400, 200, "pending", daysAgo(5), "Rinnai Infinity 26. Includes old unit removal."],
      [electricianId, "Install ceiling fans x3", 1650, 900, 600, 150, "pending", daysAgo(3), "Bedrooms and lounge. Hunter Pacific brand."],
      [hvacId, "Ducted aircon quote", 8500, 3000, 4500, 1000, "rejected", daysAgo(14), "Too expensive. Getting second quote."],
      [plumberId, "Fix leaking tap", 180, 150, 30, null, "accepted", daysAgo(21), "Bathroom basin mixer. Done last week."],
      [repairId, "Dishwasher repair", 320, 200, 120, null, "accepted", daysAgo(30), "Replaced drain pump and seal."],
      [null, "Fence repair (3 panels)", 1200, 600, 500, 100, "pending", daysAgo(7), "Storm damage. Waiting on neighbour to split cost."],
      [electricianId, "Switchboard upgrade", 2200, 1400, 700, 100, "archived", daysAgo(90), "Completed Feb 2026. RCD safety switches added."],
    ].forEach((q) => insertQuote.run(...q));
    console.log("✓ 7 quotes");
  } else {
    console.log(`  Skipping quotes (${existingQuotes} already exist)`);
  }

  // ── Activities (Together) ──
  const existingActivities = (
    sqlite
      .prepare("SELECT COUNT(*) as count FROM activities")
      .get() as { count: number }
  ).count;

  if (existingActivities === 0) {
    const insertActivity = sqlite.prepare(`
      INSERT INTO activities (title, category, notes, status, completed_date, rating, url, location, estimated_cost, duration, season, priority, tags, review, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const activityTx = sqlite.transaction(() => {
      // Wishlist items
      insertActivity.run("Great Ocean Road trip", "location", "Stop at the Twelve Apostles and Apollo Bay", "wishlist", null, null, null, "Victoria", "medium", "full-day", "summer", "high", '["road-trip","nature"]', null);
      insertActivity.run("Chin Chin Melbourne", "restaurant", "Thai-inspired street food, always busy", "wishlist", null, null, "https://chinchin.com.au", "Melbourne CBD", "medium", "quick", "any", "medium", '["thai","date-night"]', null);
      insertActivity.run("Pottery class", "activity", "Try wheel throwing at a local studio", "wishlist", null, null, null, "Melbourne", "medium", "half-day", "any", "low", '["creative","class"]', null);
      insertActivity.run("Wilsons Promontory", "location", "Overnight hike to Sealers Cove", "wishlist", null, null, null, "South Gippsland, VIC", "low", "weekend", "spring", "medium", '["hiking","camping"]', null);
      insertActivity.run("Homemade pasta night", "dish", "Make fresh fettuccine from scratch", "wishlist", null, null, null, null, "low", "quick", "any", "low", '["cooking","italian"]', null);

      // Planned items
      insertActivity.run("Wine tasting Yarra Valley", "activity", "Booked for next month - Domaine Chandon and TarraWarra", "planned", null, null, null, "Yarra Valley, VIC", "high", "full-day", "autumn", "high", '["wine","day-trip"]', null);
      insertActivity.run("Blue Mountains day trip", "location", "Take the train from Central, walk the Three Sisters track", "planned", null, null, null, "Blue Mountains, NSW", "low", "full-day", "any", "medium", '["hiking","nature"]', null);
      insertActivity.run("Aria Sydney", "restaurant", "Anniversary dinner - need to book 2 weeks ahead", "planned", null, null, "https://ariarestaurant.com.au", "Sydney CBD", "splurge", "quick", "any", "high", '["fine-dining","anniversary"]', null);
      insertActivity.run("Sourdough bread baking", "dish", "Got a starter from the neighbour, try the Tartine recipe", "planned", null, null, null, null, "low", "half-day", "winter", "medium", '["baking","bread"]', null);

      // Completed items
      insertActivity.run("Kayaking at Studley Park", "activity", "Rented double kayak, paddled up to Dights Falls", "completed", daysAgo(8), 4, null, "Studley Park, Melbourne", "low", "half-day", "summer", "medium", '["outdoors","water"]', "Great morning out. Water was calm, saw heaps of birds. The double kayak was a bit wobbly at first but we got the hang of it.");
      insertActivity.run("The local Thai place", "restaurant", "Pad see ew and green curry were amazing as always", "completed", daysAgo(14), 5, null, "Brunswick, Melbourne", "low", "quick", "any", "medium", '["thai","casual"]', "Our go-to. The pad see ew here is honestly the best in Melbourne. Sam had the massaman and loved it too.");
      insertActivity.run("Dune: Part Two", "film", "Finally saw it on the big screen", "completed", daysAgo(21), 5, null, "IMAX Melbourne", "low", "quick", "any", "high", '["sci-fi","imax"]', "Absolutely incredible on IMAX. The desert scenes were breathtaking. Both of us were blown away.");
    });
    activityTx();
    console.log("✓ 12 activities");
  } else {
    console.log(`  Skipping activities (${existingActivities} already exist)`);
  }

  // ── Vehicles ──
  const existingVehicles = (
    sqlite
      .prepare("SELECT COUNT(*) as count FROM vehicles")
      .get() as { count: number }
  ).count;

  if (existingVehicles === 0) {
    const insertVehicle = sqlite.prepare(`
      INSERT INTO vehicles (name, make, model, year, colour, rego_number, rego_state, vin, purchase_date, purchase_price, current_odometer, rego_expiry, insurance_provider, insurance_expiry, warranty_expiry_date, warranty_expiry_km, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const v1 = insertVehicle.run(
      "Family Car", "Toyota", "RAV4", 2022, "White", "ABC123", "VIC",
      "JTMW43FV50D123456", "2022-03-15", 42000, 56510,
      daysFromNow(45), "RACV", daysFromNow(120),
      "2027-03-15", 100000, "Hybrid AWD. Service every 15,000 km or 12 months."
    );
    const v1id = Number(v1.lastInsertRowid);

    const v2 = insertVehicle.run(
      "City Runabout", "Mazda", "2", 2018, "Soul Red", "XYZ789", "VIC",
      "JMZDE14L291234567", "2018-11-01", 18500, 86730,
      daysFromNow(190), "Bingle", daysFromNow(60),
      null, null, "Rego due soon-ish. Good on fuel. Needs new tyres before summer."
    );
    const v2id = Number(v2.lastInsertRowid);

    console.log("✓ 2 vehicles");

    // Vehicle Services
    const insertService = sqlite.prepare(`
      INSERT INTO vehicle_services (vehicle_id, date, odometer, vendor_id, cost, description, service_type, is_diy, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Find a mechanic vendor if one exists (use General or first vendor)
    const allVendors = sqlite
      .prepare("SELECT id, name, category FROM vendors")
      .all() as { id: number; name: string; category: string | null }[];
    const mechanicVendor = allVendors.find((v) => v.category === "General") || allVendors[0];
    const mechanicId = mechanicVendor?.id || null;

    // RAV4 services
    insertService.run(v1id, daysAgo(180), 45000, mechanicId, 450, "45,000 km scheduled service", "Scheduled Service", 0, "Oil, filters, brake check. All good.");
    insertService.run(v1id, daysAgo(90), 52000, null, 85, "Wiper blades replaced", "Other", 1, "Bought Bosch Aerotwin from Supercheap Auto");
    insertService.run(v1id, daysAgo(30), 55500, mechanicId, 680, "New front brake pads + rotor resurface", "Brakes", 0, "Rears still have plenty of life.");

    // Mazda 2 services
    insertService.run(v2id, daysAgo(120), 82000, mechanicId, 380, "80,000 km service", "Scheduled Service", 0, "Needed new spark plugs too.");
    insertService.run(v2id, daysAgo(14), 86100, null, 720, "4 x Michelin Energy Saver tyres", "Tyres", 0, "Fitted at Bob Jane. Alignment included.");

    console.log("✓ 5 vehicle services");

    // Fuel Logs
    const insertFuel = sqlite.prepare(`
      INSERT INTO fuel_logs (vehicle_id, date, odometer, litres, cost_total, cost_per_litre, station, is_full_tank)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // RAV4 fuel logs (hybrid, ~5.5 L/100km)
    insertFuel.run(v1id, daysAgo(42), 54500, 38.2, 72.58, 1.899, "Shell Heidelberg", 1);
    insertFuel.run(v1id, daysAgo(28), 55190, 37.8, 71.12, 1.881, "BP Ivanhoe", 1);
    insertFuel.run(v1id, daysAgo(14), 55870, 38.5, 72.74, 1.889, "Shell Heidelberg", 1);
    insertFuel.run(v1id, daysAgo(3), 56510, 34.9, 68.40, 1.960, "Costco Docklands", 1);

    // Mazda 2 fuel logs (~6.5 L/100km)
    insertFuel.run(v2id, daysAgo(35), 85700, 32.5, 61.75, 1.900, "7-Eleven Brunswick", 1);
    insertFuel.run(v2id, daysAgo(21), 86200, 32.5, 62.60, 1.926, "United Preston", 1);
    insertFuel.run(v2id, daysAgo(7), 86730, 34.4, 67.08, 1.950, "Shell Heidelberg", 1);

    console.log("✓ 7 fuel logs");
  } else {
    console.log(`  Skipping vehicles (${existingVehicles} already exist)`);
  }

  // ── Extra Completions (spread across last 30 days for stats) ──
  const existingCompletions = (
    sqlite.prepare("SELECT COUNT(*) as count FROM completions").get() as {
      count: number;
    }
  ).count;

  // Only add extra completions if we haven't already (the initial seed creates ~19)
  if (existingCompletions < 25) {
    const allTasks = sqlite
      .prepare("SELECT id FROM tasks")
      .all() as { id: number }[];

    const insertCompletion = sqlite.prepare(
      `INSERT INTO completions (task_id, completed_at, completed_by) VALUES (?, ?, ?)`
    );

    const extraCompletionTx = sqlite.transaction(() => {
      // Days 8-14: moderate activity
      for (let day = 8; day <= 14; day++) {
        const count = 2 + Math.floor(Math.random() * 3); // 2-4 per day
        for (let i = 0; i < count; i++) {
          const task = allTasks[Math.floor(Math.random() * allTasks.length)];
          const who = Math.random() > 0.5 ? lukeId : juliaId;
          insertCompletion.run(task.id, daysAgo(day), who);
        }
      }
      // Days 15-21: lighter activity
      for (let day = 15; day <= 21; day++) {
        const count = 1 + Math.floor(Math.random() * 2); // 1-2 per day
        for (let i = 0; i < count; i++) {
          const task = allTasks[Math.floor(Math.random() * allTasks.length)];
          const who = Math.random() > 0.5 ? lukeId : juliaId;
          insertCompletion.run(task.id, daysAgo(day), who);
        }
      }
      // Days 22-30: building back up
      for (let day = 22; day <= 30; day++) {
        const count = 1 + Math.floor(Math.random() * 3); // 1-3 per day
        for (let i = 0; i < count; i++) {
          const task = allTasks[Math.floor(Math.random() * allTasks.length)];
          const who = Math.random() > 0.5 ? lukeId : juliaId;
          insertCompletion.run(task.id, daysAgo(day), who);
        }
      }
    });
    extraCompletionTx();
    console.log("✓ Extra completions (30-day spread)");
  } else {
    console.log(`  Skipping extra completions (${existingCompletions} already exist)`);
  }

  sqlite.close();
  console.log("\nDone! Demo data ready.");
}

seedDemo().catch(console.error);
