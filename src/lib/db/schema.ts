import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3b82f6"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  area: text("area").notNull(),
  frequency: text("frequency").notNull(),
  assignedDay: text("assigned_day"),
  season: text("season"),
  notes: text("notes"),
  extendedNotes: text("extended_notes"),
  assignedTo: integer("assigned_to").references(() => users.id),
  applianceId: integer("appliance_id"),
  lastCompleted: text("last_completed"),
  nextDue: text("next_due"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const completions = sqliteTable("completions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id),
  completedAt: text("completed_at").notNull(),
  completedBy: integer("completed_by").references(() => users.id),
  vendorId: integer("vendor_id"),
  cost: text("cost"),
});

export const googleCalendarSettings = sqliteTable("google_calendar_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiry: text("token_expiry").notNull(),
  calendarId: text("calendar_id").default("primary"),
  connectedEmail: text("connected_email").notNull(),
  syncEnabled: integer("sync_enabled", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const taskCalendarEvents = sqliteTable("task_calendar_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id),
  googleEventId: text("google_event_id").notNull(),
  eventDate: text("event_date").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const shoppingLists = sqliteTable("shopping_lists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color").default("#3b82f6"),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const shoppingItems = sqliteTable("shopping_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  listId: integer("list_id")
    .notNull()
    .references(() => shoppingLists.id),
  name: text("name").notNull(),
  quantity: text("quantity"),
  checked: integer("checked", { mode: "boolean" }).default(false),
  sortOrder: integer("sort_order").default(0),
  addedBy: integer("added_by").references(() => users.id),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const itemHistory = sqliteTable("item_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  useCount: integer("use_count").default(1),
  lastUsed: text("last_used").default("CURRENT_TIMESTAMP"),
});

export const recipes = sqliteTable("recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  prepTime: integer("prep_time"),
  cookTime: integer("cook_time"),
  servings: integer("servings"),
  imageUrl: text("image_url"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const recipeIngredients = sqliteTable("recipe_ingredients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id),
  name: text("name").notNull(),
  quantity: text("quantity"),
  amount: real("amount"),
  unit: text("unit"),
  section: text("section"),
  sortOrder: integer("sort_order").default(0),
});

export const mealPlan = sqliteTable("meal_plan", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(),
  recipeId: integer("recipe_id").references(() => recipes.id),
  servingsMultiplier: real("servings_multiplier").default(1),
  customMeal: text("custom_meal"),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  category: text("category").notNull(), // location, activity, restaurant, dish, film
  imageUrl: text("image_url"),
  notes: text("notes"),
  status: text("status").notNull().default("wishlist"), // wishlist, planned, completed
  completedDate: text("completed_date"),
  rating: integer("rating"), // 1-5
  url: text("url"),
  location: text("location"),
  estimatedCost: text("estimated_cost"), // low, medium, high, splurge
  duration: text("duration"), // quick, half-day, full-day, weekend, week+
  season: text("season"), // any, spring, summer, fall, winter
  priority: text("priority").default("medium"), // low, medium, high
  tags: text("tags"), // JSON array as string
  review: text("review"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const appliances = sqliteTable("appliances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  location: text("location"),
  brand: text("brand"),
  model: text("model"),
  purchaseDate: text("purchase_date"),
  warrantyExpiry: text("warranty_expiry"),
  manualUrl: text("manual_url"),
  warrantyDocUrl: text("warranty_doc_url"),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const vendors = sqliteTable("vendors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category"), // Plumber, Electrician, HVAC, Appliance Repair, Landscaping, Cleaning, General, Other
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  notes: text("notes"),
  rating: integer("rating"), // 1-5
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Completion = typeof completions.$inferSelect;
export type NewCompletion = typeof completions.$inferInsert;
export type GoogleCalendarSettings = typeof googleCalendarSettings.$inferSelect;
export type NewGoogleCalendarSettings = typeof googleCalendarSettings.$inferInsert;
export type TaskCalendarEvent = typeof taskCalendarEvents.$inferSelect;
export type NewTaskCalendarEvent = typeof taskCalendarEvents.$inferInsert;
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type NewShoppingList = typeof shoppingLists.$inferInsert;
export type ShoppingItem = typeof shoppingItems.$inferSelect;
export type NewShoppingItem = typeof shoppingItems.$inferInsert;
export type ItemHistory = typeof itemHistory.$inferSelect;
export type NewItemHistory = typeof itemHistory.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type NewRecipeIngredient = typeof recipeIngredients.$inferInsert;
export type MealPlan = typeof mealPlan.$inferSelect;
export type NewMealPlan = typeof mealPlan.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Appliance = typeof appliances.$inferSelect;
export type NewAppliance = typeof appliances.$inferInsert;
export const quotes = sqliteTable("quotes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vendorId: integer("vendor_id").references(() => vendors.id),
  description: text("description").notNull(),
  total: real("total").notNull(),
  labour: real("labor"),
  materials: real("materials"),
  other: real("other"),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  receivedDate: text("received_date"),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  make: text("make"),
  model: text("model"),
  year: integer("year"),
  colour: text("colour"),
  regoNumber: text("rego_number"),
  regoState: text("rego_state"),
  vin: text("vin"),
  purchaseDate: text("purchase_date"),
  purchasePrice: real("purchase_price"),
  currentOdometer: integer("current_odometer"),
  imageUrl: text("image_url"),
  regoExpiry: text("rego_expiry"),
  insuranceProvider: text("insurance_provider"),
  insuranceExpiry: text("insurance_expiry"),
  warrantyExpiryDate: text("warranty_expiry_date"),
  warrantyExpiryKm: integer("warranty_expiry_km"),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const vehicleServices = sqliteTable("vehicle_services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id")
    .notNull()
    .references(() => vehicles.id),
  date: text("date").notNull(),
  odometer: integer("odometer"),
  vendorId: integer("vendor_id").references(() => vendors.id),
  cost: real("cost"),
  description: text("description").notNull(),
  serviceType: text("service_type"),
  receiptUrl: text("receipt_url"),
  isDiy: integer("is_diy").default(0),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const fuelLogs = sqliteTable("fuel_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id")
    .notNull()
    .references(() => vehicles.id),
  date: text("date").notNull(),
  odometer: integer("odometer").notNull(),
  litres: real("litres").notNull(),
  costTotal: real("cost_total").notNull(),
  costPerLitre: real("cost_per_litre"),
  station: text("station"),
  isFullTank: integer("is_full_tank").default(1),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type VehicleService = typeof vehicleServices.$inferSelect;
export type NewVehicleService = typeof vehicleServices.$inferInsert;
export type FuelLog = typeof fuelLogs.$inferSelect;
export type NewFuelLog = typeof fuelLogs.$inferInsert;
