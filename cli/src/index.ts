#!/usr/bin/env node

import { Command } from "commander";
import { loadConfig, saveConfig } from "./config.js";
import { api, printJson, printTable } from "./api.js";
import { createInterface } from "readline/promises";

const program = new Command();

program
  .name("tuis")
  .description("CLI for the Tuis household management app")
  .version("1.0.0");

// ─── Configure ──────────────────────────────────────────────────────────────

program
  .command("configure")
  .description("Set server URL and access token")
  .option("--url <url>", "Server URL")
  .option("--token <token>", "Personal access token")
  .action(async (opts) => {
    const existing = loadConfig();
    let url = opts.url;
    let token = opts.token;

    if (!url || !token) {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      if (!url) {
        url = await rl.question(
          `Server URL [${existing?.url || "http://localhost:3000"}]: `
        );
        if (!url) url = existing?.url || "http://localhost:3000";
      }
      if (!token) {
        token = await rl.question("Access token: ");
      }
      rl.close();
    }

    saveConfig({ url, token });
    console.log("Configuration saved.");
  });

// ─── Tasks ──────────────────────────────────────────────────────────────────

const tasks = program.command("tasks").description("Manage household tasks");

tasks
  .command("list")
  .description("List all tasks")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const data = (await api("/api/tasks")) as Record<string, unknown>[];
    if (opts.json) return printJson(data);
    printTable(data, [
      { key: "id", label: "ID", width: 5 },
      { key: "name", label: "Name", width: 30 },
      { key: "area", label: "Area", width: 15 },
      { key: "frequency", label: "Freq", width: 12 },
      { key: "nextDue", label: "Next Due", width: 12 },
    ]);
  });

tasks
  .command("get <id>")
  .description("Get a task by ID")
  .action(async (id) => {
    printJson(await api(`/api/tasks/${id}`));
  });

tasks
  .command("create")
  .description("Create a task")
  .requiredOption("--name <name>", "Task name")
  .requiredOption("--area <area>", "Area (Kitchen, Bathroom, etc.)")
  .requiredOption(
    "--frequency <freq>",
    "Frequency (Daily, Weekly, Monthly, etc.)"
  )
  .option("--assigned-day <day>", "Day of week")
  .option("--notes <notes>", "Notes")
  .option("--next-due <date>", "Next due date (YYYY-MM-DD)")
  .action(async (opts) => {
    printJson(
      await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          name: opts.name,
          area: opts.area,
          frequency: opts.frequency,
          assignedDay: opts.assignedDay,
          notes: opts.notes,
          nextDue: opts.nextDue,
        }),
      })
    );
  });

tasks
  .command("update <id>")
  .description("Update a task")
  .option("--name <name>", "Task name")
  .option("--area <area>", "Area")
  .option("--frequency <freq>", "Frequency")
  .option("--notes <notes>", "Notes")
  .option("--next-due <date>", "Next due date")
  .action(async (id, opts) => {
    const body: Record<string, unknown> = {};
    if (opts.name) body.name = opts.name;
    if (opts.area) body.area = opts.area;
    if (opts.frequency) body.frequency = opts.frequency;
    if (opts.notes) body.notes = opts.notes;
    if (opts.nextDue) body.nextDue = opts.nextDue;
    printJson(
      await api(`/api/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      })
    );
  });

tasks
  .command("delete <id>")
  .description("Delete a task")
  .action(async (id) => {
    printJson(await api(`/api/tasks/${id}`, { method: "DELETE" }));
  });

tasks
  .command("complete <id>")
  .description("Mark a task as complete")
  .action(async (id) => {
    printJson(await api(`/api/tasks/${id}/complete`, { method: "POST" }));
  });

// ─── Shopping ───────────────────────────────────────────────────────────────

const shopping = program
  .command("shopping")
  .description("Manage shopping lists and items");

const shoppingLists = shopping
  .command("lists")
  .description("Manage shopping lists");

shoppingLists
  .command("list")
  .description("List all shopping lists")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const data = (await api("/api/shopping/lists")) as Record<
      string,
      unknown
    >[];
    if (opts.json) return printJson(data);
    printTable(data, [
      { key: "id", label: "ID", width: 5 },
      { key: "name", label: "Name", width: 30 },
    ]);
  });

shoppingLists
  .command("create")
  .description("Create a shopping list")
  .requiredOption("--name <name>", "List name")
  .option("--color <color>", "Color hex")
  .action(async (opts) => {
    printJson(
      await api("/api/shopping/lists", {
        method: "POST",
        body: JSON.stringify({ name: opts.name, color: opts.color }),
      })
    );
  });

shoppingLists
  .command("delete <id>")
  .description("Delete a shopping list")
  .action(async (id) => {
    printJson(
      await api(`/api/shopping/lists/${id}`, { method: "DELETE" })
    );
  });

const shoppingItems = shopping
  .command("items")
  .description("Manage shopping items");

shoppingItems
  .command("add")
  .description("Add an item to a list")
  .requiredOption("--list <id>", "List ID")
  .requiredOption("--name <name>", "Item name")
  .option("--quantity <qty>", "Quantity")
  .action(async (opts) => {
    printJson(
      await api("/api/shopping/items", {
        method: "POST",
        body: JSON.stringify({
          listId: parseInt(opts.list),
          name: opts.name,
          quantity: opts.quantity,
        }),
      })
    );
  });

shoppingItems
  .command("update <id>")
  .description("Update a shopping item")
  .option("--name <name>", "Item name")
  .option("--quantity <qty>", "Quantity")
  .option("--checked", "Mark as checked")
  .option("--no-checked", "Mark as unchecked")
  .action(async (id, opts) => {
    const body: Record<string, unknown> = {};
    if (opts.name !== undefined) body.name = opts.name;
    if (opts.quantity !== undefined) body.quantity = opts.quantity;
    if (opts.checked !== undefined) body.checked = opts.checked;
    printJson(
      await api(`/api/shopping/items/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      })
    );
  });

shoppingItems
  .command("delete <id>")
  .description("Delete a shopping item")
  .action(async (id) => {
    printJson(
      await api(`/api/shopping/items/${id}`, { method: "DELETE" })
    );
  });

// ─── Recipes ────────────────────────────────────────────────────────────────

const recipes = program.command("recipes").description("Manage recipes");

recipes
  .command("list")
  .description("List all recipes")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const data = (await api("/api/recipes")) as Record<string, unknown>[];
    if (opts.json) return printJson(data);
    printTable(data, [
      { key: "id", label: "ID", width: 5 },
      { key: "name", label: "Name", width: 30 },
      { key: "category", label: "Category", width: 10 },
      { key: "prepTime", label: "Prep", width: 6 },
      { key: "cookTime", label: "Cook", width: 6 },
    ]);
  });

recipes
  .command("get <id>")
  .description("Get a recipe by ID")
  .action(async (id) => {
    printJson(await api(`/api/recipes/${id}`));
  });

recipes
  .command("create")
  .description("Create a recipe")
  .requiredOption("--name <name>", "Recipe name")
  .option("--description <desc>", "Description")
  .option("--instructions <text>", "Instructions")
  .option("--prep-time <mins>", "Prep time in minutes")
  .option("--cook-time <mins>", "Cook time in minutes")
  .option("--servings <n>", "Number of servings")
  .option("--category <cat>", "Category (side, main, dessert)")
  .action(async (opts) => {
    printJson(
      await api("/api/recipes", {
        method: "POST",
        body: JSON.stringify({
          name: opts.name,
          description: opts.description,
          instructions: opts.instructions,
          prepTime: opts.prepTime ? parseInt(opts.prepTime) : undefined,
          cookTime: opts.cookTime ? parseInt(opts.cookTime) : undefined,
          servings: opts.servings ? parseInt(opts.servings) : undefined,
          category: opts.category,
        }),
      })
    );
  });

recipes
  .command("update <id>")
  .description("Update a recipe")
  .option("--name <name>", "Recipe name")
  .option("--description <desc>", "Description")
  .option("--category <cat>", "Category")
  .action(async (id, opts) => {
    const body: Record<string, unknown> = {};
    if (opts.name) body.name = opts.name;
    if (opts.description) body.description = opts.description;
    if (opts.category) body.category = opts.category;
    printJson(
      await api(`/api/recipes/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      })
    );
  });

recipes
  .command("delete <id>")
  .description("Delete a recipe")
  .action(async (id) => {
    printJson(await api(`/api/recipes/${id}`, { method: "DELETE" }));
  });

// ─── Meals ──────────────────────────────────────────────────────────────────

const meals = program.command("meals").description("Manage meal plan");

meals
  .command("list")
  .description("List meal plan for a date range")
  .requiredOption("--start <date>", "Start date (YYYY-MM-DD)")
  .requiredOption("--end <date>", "End date (YYYY-MM-DD)")
  .action(async (opts) => {
    printJson(
      await api(`/api/meals?start=${opts.start}&end=${opts.end}`)
    );
  });

meals
  .command("get <date>")
  .description("Get meal for a specific date")
  .action(async (date) => {
    printJson(await api(`/api/meals/${date}`));
  });

meals
  .command("set <date>")
  .description("Set a meal for a date")
  .option("--recipe <id>", "Recipe ID")
  .option("--custom <name>", "Custom meal name")
  .option("--slot <slot>", "Slot (side, main, dessert)", "main")
  .option("--notes <notes>", "Notes")
  .action(async (date, opts) => {
    printJson(
      await api(`/api/meals/${date}`, {
        method: "PUT",
        body: JSON.stringify({
          recipeId: opts.recipe ? parseInt(opts.recipe) : undefined,
          customMeal: opts.custom,
          slot: opts.slot,
          notes: opts.notes,
        }),
      })
    );
  });

meals
  .command("delete <date>")
  .description("Delete a meal plan entry")
  .option("--slot <slot>", "Slot (side, main, dessert)", "main")
  .action(async (date, opts) => {
    printJson(
      await api(`/api/meals/${date}?slot=${opts.slot}`, {
        method: "DELETE",
      })
    );
  });

// ─── Vehicles ───────────────────────────────────────────────────────────────

const vehicles = program.command("vehicles").description("Manage vehicles");

vehicles
  .command("list")
  .description("List all vehicles")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const data = (await api("/api/vehicles")) as Record<string, unknown>[];
    if (opts.json) return printJson(data);
    printTable(data, [
      { key: "id", label: "ID", width: 5 },
      { key: "name", label: "Name", width: 20 },
      { key: "make", label: "Make", width: 12 },
      { key: "model", label: "Model", width: 12 },
      { key: "year", label: "Year", width: 6 },
    ]);
  });

vehicles
  .command("get <id>")
  .description("Get a vehicle by ID")
  .action(async (id) => {
    printJson(await api(`/api/vehicles/${id}`));
  });

vehicles
  .command("create")
  .description("Create a vehicle")
  .requiredOption("--name <name>", "Vehicle name")
  .option("--make <make>", "Make")
  .option("--model <model>", "Model")
  .option("--year <year>", "Year")
  .action(async (opts) => {
    printJson(
      await api("/api/vehicles", {
        method: "POST",
        body: JSON.stringify({
          name: opts.name,
          make: opts.make,
          model: opts.model,
          year: opts.year ? parseInt(opts.year) : undefined,
        }),
      })
    );
  });

vehicles
  .command("update <id>")
  .description("Update a vehicle")
  .option("--name <name>", "Name")
  .option("--make <make>", "Make")
  .option("--model <model>", "Model")
  .action(async (id, opts) => {
    const body: Record<string, unknown> = {};
    if (opts.name) body.name = opts.name;
    if (opts.make) body.make = opts.make;
    if (opts.model) body.model = opts.model;
    printJson(
      await api(`/api/vehicles/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      })
    );
  });

vehicles
  .command("delete <id>")
  .description("Delete a vehicle")
  .action(async (id) => {
    printJson(await api(`/api/vehicles/${id}`, { method: "DELETE" }));
  });

const fuel = vehicles.command("fuel").description("Manage fuel logs");

fuel
  .command("list <vehicleId>")
  .description("List fuel logs for a vehicle")
  .action(async (vehicleId) => {
    printJson(await api(`/api/vehicles/${vehicleId}/fuel`));
  });

fuel
  .command("add <vehicleId>")
  .description("Add a fuel log")
  .requiredOption("--date <date>", "Date (YYYY-MM-DD)")
  .requiredOption("--odometer <km>", "Odometer reading")
  .requiredOption("--litres <l>", "Litres")
  .requiredOption("--cost <amount>", "Total cost")
  .option("--station <name>", "Station")
  .action(async (vehicleId, opts) => {
    printJson(
      await api(`/api/vehicles/${vehicleId}/fuel`, {
        method: "POST",
        body: JSON.stringify({
          date: opts.date,
          odometer: parseInt(opts.odometer),
          litres: parseFloat(opts.litres),
          costTotal: parseFloat(opts.cost),
          station: opts.station,
        }),
      })
    );
  });

const services = vehicles
  .command("services")
  .description("Manage vehicle services");

services
  .command("list <vehicleId>")
  .description("List services for a vehicle")
  .action(async (vehicleId) => {
    printJson(await api(`/api/vehicles/${vehicleId}/services`));
  });

services
  .command("add <vehicleId>")
  .description("Add a service record")
  .requiredOption("--date <date>", "Date (YYYY-MM-DD)")
  .requiredOption("--description <desc>", "Description")
  .option("--odometer <km>", "Odometer reading")
  .option("--cost <amount>", "Cost")
  .option("--service-type <type>", "Service type")
  .action(async (vehicleId, opts) => {
    printJson(
      await api(`/api/vehicles/${vehicleId}/services`, {
        method: "POST",
        body: JSON.stringify({
          date: opts.date,
          description: opts.description,
          odometer: opts.odometer ? parseInt(opts.odometer) : undefined,
          cost: opts.cost ? parseFloat(opts.cost) : undefined,
          serviceType: opts.serviceType,
        }),
      })
    );
  });

// ─── Vendors ────────────────────────────────────────────────────────────────

const vendors = program.command("vendors").description("Manage vendors");

vendors
  .command("list")
  .description("List all vendors")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const data = (await api("/api/vendors")) as Record<string, unknown>[];
    if (opts.json) return printJson(data);
    printTable(data, [
      { key: "id", label: "ID", width: 5 },
      { key: "name", label: "Name", width: 25 },
      { key: "category", label: "Category", width: 15 },
      { key: "phone", label: "Phone", width: 15 },
      { key: "rating", label: "Rating", width: 6 },
    ]);
  });

vendors
  .command("get <id>")
  .description("Get a vendor by ID")
  .action(async (id) => {
    printJson(await api(`/api/vendors/${id}`));
  });

vendors
  .command("create")
  .description("Create a vendor")
  .requiredOption("--name <name>", "Vendor name")
  .option("--category <cat>", "Category")
  .option("--phone <phone>", "Phone number")
  .option("--email <email>", "Email")
  .option("--rating <n>", "Rating (1-5)")
  .action(async (opts) => {
    printJson(
      await api("/api/vendors", {
        method: "POST",
        body: JSON.stringify({
          name: opts.name,
          category: opts.category,
          phone: opts.phone,
          email: opts.email,
          rating: opts.rating ? parseInt(opts.rating) : undefined,
        }),
      })
    );
  });

vendors
  .command("update <id>")
  .description("Update a vendor")
  .option("--name <name>", "Name")
  .option("--category <cat>", "Category")
  .option("--phone <phone>", "Phone")
  .option("--email <email>", "Email")
  .option("--rating <n>", "Rating")
  .action(async (id, opts) => {
    const body: Record<string, unknown> = {};
    if (opts.name) body.name = opts.name;
    if (opts.category) body.category = opts.category;
    if (opts.phone) body.phone = opts.phone;
    if (opts.email) body.email = opts.email;
    if (opts.rating) body.rating = parseInt(opts.rating);
    printJson(
      await api(`/api/vendors/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      })
    );
  });

vendors
  .command("delete <id>")
  .description("Delete a vendor")
  .action(async (id) => {
    printJson(await api(`/api/vendors/${id}`, { method: "DELETE" }));
  });

// ─── Quotes ─────────────────────────────────────────────────────────────────

const quotes = program.command("quotes").description("Manage quotes");

quotes
  .command("list")
  .description("List all quotes")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const data = (await api("/api/quotes")) as Record<string, unknown>[];
    if (opts.json) return printJson(data);
    printTable(data, [
      { key: "id", label: "ID", width: 5 },
      { key: "description", label: "Description", width: 30 },
      { key: "total", label: "Total", width: 10 },
      { key: "status", label: "Status", width: 10 },
    ]);
  });

quotes
  .command("get <id>")
  .description("Get a quote by ID")
  .action(async (id) => {
    printJson(await api(`/api/quotes/${id}`));
  });

quotes
  .command("create")
  .description("Create a quote")
  .requiredOption("--description <desc>", "Description")
  .requiredOption("--total <amount>", "Total amount")
  .option("--vendor <id>", "Vendor ID")
  .option("--status <status>", "Status (pending, accepted, rejected)")
  .option("--labour <amount>", "Labour cost")
  .option("--materials <amount>", "Materials cost")
  .action(async (opts) => {
    printJson(
      await api("/api/quotes", {
        method: "POST",
        body: JSON.stringify({
          description: opts.description,
          total: parseFloat(opts.total),
          vendorId: opts.vendor ? parseInt(opts.vendor) : undefined,
          status: opts.status,
          labour: opts.labour ? parseFloat(opts.labour) : undefined,
          materials: opts.materials
            ? parseFloat(opts.materials)
            : undefined,
        }),
      })
    );
  });

quotes
  .command("update <id>")
  .description("Update a quote")
  .option("--description <desc>", "Description")
  .option("--total <amount>", "Total")
  .option("--status <status>", "Status")
  .action(async (id, opts) => {
    const body: Record<string, unknown> = {};
    if (opts.description) body.description = opts.description;
    if (opts.total) body.total = parseFloat(opts.total);
    if (opts.status) body.status = opts.status;
    printJson(
      await api(`/api/quotes/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      })
    );
  });

quotes
  .command("delete <id>")
  .description("Delete a quote")
  .action(async (id) => {
    printJson(await api(`/api/quotes/${id}`, { method: "DELETE" }));
  });

// ─── Appliances ─────────────────────────────────────────────────────────────

const appliances = program
  .command("appliances")
  .description("Manage appliances");

appliances
  .command("list")
  .description("List all appliances")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const data = (await api("/api/appliances")) as Record<
      string,
      unknown
    >[];
    if (opts.json) return printJson(data);
    printTable(data, [
      { key: "id", label: "ID", width: 5 },
      { key: "name", label: "Name", width: 25 },
      { key: "brand", label: "Brand", width: 15 },
      { key: "location", label: "Location", width: 15 },
    ]);
  });

appliances
  .command("get <id>")
  .description("Get an appliance by ID")
  .action(async (id) => {
    printJson(await api(`/api/appliances/${id}`));
  });

appliances
  .command("create")
  .description("Create an appliance")
  .requiredOption("--name <name>", "Appliance name")
  .option("--brand <brand>", "Brand")
  .option("--model <model>", "Model")
  .option("--location <loc>", "Location")
  .action(async (opts) => {
    printJson(
      await api("/api/appliances", {
        method: "POST",
        body: JSON.stringify({
          name: opts.name,
          brand: opts.brand,
          model: opts.model,
          location: opts.location,
        }),
      })
    );
  });

appliances
  .command("update <id>")
  .description("Update an appliance")
  .option("--name <name>", "Name")
  .option("--brand <brand>", "Brand")
  .option("--model <model>", "Model")
  .option("--location <loc>", "Location")
  .action(async (id, opts) => {
    const body: Record<string, unknown> = {};
    if (opts.name) body.name = opts.name;
    if (opts.brand) body.brand = opts.brand;
    if (opts.model) body.model = opts.model;
    if (opts.location) body.location = opts.location;
    printJson(
      await api(`/api/appliances/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      })
    );
  });

appliances
  .command("delete <id>")
  .description("Delete an appliance")
  .action(async (id) => {
    printJson(await api(`/api/appliances/${id}`, { method: "DELETE" }));
  });

// ─── Activities (Together) ──────────────────────────────────────────────────

const activities = program
  .command("activities")
  .description("Manage together activities");

activities
  .command("list")
  .description("List all activities")
  .option("--json", "Output as JSON")
  .option("--status <status>", "Filter by status")
  .option("--category <cat>", "Filter by category")
  .action(async (opts) => {
    const params = new URLSearchParams();
    if (opts.status) params.set("status", opts.status);
    if (opts.category) params.set("category", opts.category);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const data = (await api(`/api/together${qs}`)) as Record<
      string,
      unknown
    >[];
    if (opts.json) return printJson(data);
    printTable(data, [
      { key: "id", label: "ID", width: 5 },
      { key: "title", label: "Title", width: 30 },
      { key: "category", label: "Category", width: 12 },
      { key: "status", label: "Status", width: 10 },
    ]);
  });

activities
  .command("get <id>")
  .description("Get an activity by ID")
  .action(async (id) => {
    printJson(await api(`/api/together/${id}`));
  });

activities
  .command("create")
  .description("Create an activity")
  .requiredOption("--title <title>", "Activity title")
  .requiredOption(
    "--category <cat>",
    "Category (location, activity, restaurant, dish, film)"
  )
  .option("--status <status>", "Status (wishlist, planned, completed)")
  .option("--notes <notes>", "Notes")
  .option("--url <url>", "URL")
  .option("--location <loc>", "Location")
  .action(async (opts) => {
    printJson(
      await api("/api/together", {
        method: "POST",
        body: JSON.stringify({
          title: opts.title,
          category: opts.category,
          status: opts.status,
          notes: opts.notes,
          url: opts.url,
          location: opts.location,
        }),
      })
    );
  });

activities
  .command("update <id>")
  .description("Update an activity")
  .option("--title <title>", "Title")
  .option("--status <status>", "Status")
  .option("--notes <notes>", "Notes")
  .option("--rating <n>", "Rating (1-5)")
  .action(async (id, opts) => {
    const body: Record<string, unknown> = {};
    if (opts.title) body.title = opts.title;
    if (opts.status) body.status = opts.status;
    if (opts.notes) body.notes = opts.notes;
    if (opts.rating) body.rating = parseInt(opts.rating);
    printJson(
      await api(`/api/together/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      })
    );
  });

activities
  .command("delete <id>")
  .description("Delete an activity")
  .action(async (id) => {
    printJson(await api(`/api/together/${id}`, { method: "DELETE" }));
  });

// ─── Users ──────────────────────────────────────────────────────────────────

const users = program
  .command("users")
  .description("Manage household members");

users
  .command("list")
  .description("List all household members")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const data = (await api("/api/users")) as Record<string, unknown>[];
    if (opts.json) return printJson(data);
    printTable(data, [
      { key: "id", label: "ID", width: 5 },
      { key: "name", label: "Name", width: 25 },
      { key: "color", label: "Color", width: 10 },
    ]);
  });

users
  .command("create")
  .description("Create a household member")
  .requiredOption("--name <name>", "Name")
  .option("--color <color>", "Color hex")
  .action(async (opts) => {
    printJson(
      await api("/api/users", {
        method: "POST",
        body: JSON.stringify({ name: opts.name, color: opts.color }),
      })
    );
  });

users
  .command("delete <id>")
  .description("Delete a household member")
  .action(async (id) => {
    printJson(await api(`/api/users/${id}`, { method: "DELETE" }));
  });

// ─── Stats ──────────────────────────────────────────────────────────────────

program
  .command("stats")
  .description("View household stats")
  .action(async () => {
    printJson(await api("/api/stats"));
  });

program.parse();
