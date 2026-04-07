import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function createMcpServer(baseUrl: string) {
  async function api(path: string, options?: RequestInit) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API ${res.status}: ${body}`);
    }
    return res.json();
  }

  function text(data: unknown): { content: [{ type: "text"; text: string }] } {
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }

  const server = new McpServer({
    name: "chore-calendar",
    version: "1.0.0",
  });

  // ─── Tasks ───────────────────────────────────────────────────────────────────

  server.tool(
    "list_tasks",
    "List all household tasks/chores. Returns name, area, frequency, due dates, and assignment info.",
    {},
    async () => text(await api("/api/tasks"))
  );

  server.tool(
    "get_task",
    "Get a single task by ID with full details.",
    { id: z.number().describe("Task ID") },
    async ({ id }) => text(await api(`/api/tasks/${id}`))
  );

  server.tool(
    "create_task",
    "Create a new household task/chore.",
    {
      name: z.string().describe("Task name"),
      area: z.string().describe("Area of the house (e.g. Kitchen, Bathroom, Outdoor)"),
      frequency: z.string().describe("How often: Daily, Weekly, Bi-Weekly, Monthly, Quarterly, Bi-Annually, Annual, Ad-hoc"),
      assignedDay: z.string().optional().describe("Day of week if weekly"),
      season: z.string().optional().describe("Season relevance"),
      notes: z.string().optional().describe("Additional notes"),
      nextDue: z.string().optional().describe("Next due date (ISO format)"),
      assignedTo: z.number().optional().describe("User ID to assign to"),
      applianceId: z.number().optional().describe("Linked appliance ID"),
    },
    async (params) => text(await api("/api/tasks", { method: "POST", body: JSON.stringify(params) }))
  );

  server.tool(
    "update_task",
    "Update an existing task.",
    {
      id: z.number().describe("Task ID"),
      name: z.string().optional(),
      area: z.string().optional(),
      frequency: z.string().optional(),
      assignedDay: z.string().optional(),
      season: z.string().optional(),
      notes: z.string().optional(),
      nextDue: z.string().optional(),
      assignedTo: z.number().optional(),
      applianceId: z.number().optional(),
    },
    async ({ id, ...body }) => text(await api(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(body) }))
  );

  server.tool(
    "complete_task",
    "Mark a task as completed. Automatically calculates the next due date based on frequency.",
    {
      id: z.number().describe("Task ID"),
      completedDate: z.string().optional().describe("Completion date (ISO format, defaults to today)"),
      completedBy: z.string().optional().describe("User ID who completed it"),
      vendorId: z.number().optional().describe("Vendor who did the work"),
      cost: z.string().optional().describe("Cost if applicable"),
    },
    async ({ id, ...body }) =>
      text(await api(`/api/tasks/${id}/complete`, { method: "POST", body: JSON.stringify(body) }))
  );

  server.tool(
    "snooze_task",
    "Snooze a task to push back its due date.",
    {
      id: z.number().describe("Task ID"),
      duration: z.enum(["1day", "3days", "1week", "2weeks"]).describe("How long to snooze"),
    },
    async ({ id, ...body }) =>
      text(await api(`/api/tasks/${id}/snooze`, { method: "POST", body: JSON.stringify(body) }))
  );

  server.tool(
    "delete_task",
    "Delete a task permanently.",
    { id: z.number().describe("Task ID") },
    async ({ id }) => text(await api(`/api/tasks/${id}`, { method: "DELETE" }))
  );

  // ─── Shopping ────────────────────────────────────────────────────────────────

  server.tool(
    "get_shopping_lists",
    "Get all shopping lists with item counts.",
    {},
    async () => text(await api("/api/shopping/lists"))
  );

  server.tool(
    "get_shopping_list",
    "Get a shopping list with all its items.",
    { id: z.number().describe("List ID") },
    async ({ id }) => text(await api(`/api/shopping/lists/${id}`))
  );

  server.tool(
    "create_shopping_list",
    "Create a new shopping list.",
    {
      name: z.string().describe("List name"),
      color: z.string().optional().describe("Hex color"),
    },
    async (params) => text(await api("/api/shopping/lists", { method: "POST", body: JSON.stringify(params) }))
  );

  server.tool(
    "add_shopping_item",
    "Add an item to a shopping list.",
    {
      listId: z.number().describe("Shopping list ID"),
      name: z.string().describe("Item name"),
      quantity: z.string().optional().describe("Quantity (e.g. '2', '500g')"),
      addedBy: z.number().optional().describe("User ID who added it"),
    },
    async (params) => text(await api("/api/shopping/items", { method: "POST", body: JSON.stringify(params) }))
  );

  server.tool(
    "update_shopping_item",
    "Update a shopping item (e.g. check/uncheck it, change quantity).",
    {
      id: z.number().describe("Item ID"),
      name: z.string().optional(),
      quantity: z.string().optional(),
      checked: z.boolean().optional().describe("Whether the item is checked off"),
    },
    async ({ id, ...body }) =>
      text(await api(`/api/shopping/items/${id}`, { method: "PUT", body: JSON.stringify(body) }))
  );

  server.tool(
    "delete_shopping_item",
    "Delete a shopping item.",
    { id: z.number().describe("Item ID") },
    async ({ id }) => text(await api(`/api/shopping/items/${id}`, { method: "DELETE" }))
  );

  server.tool(
    "clear_checked_items",
    "Remove all checked items from a shopping list.",
    { listId: z.number().describe("Shopping list ID") },
    async (params) =>
      text(await api("/api/shopping/items/clear", { method: "POST", body: JSON.stringify(params) }))
  );

  server.tool(
    "shopping_suggestions",
    "Get autocomplete suggestions for shopping items based on history.",
    { q: z.string().describe("Search query (at least 1 character)") },
    async ({ q }) => text(await api(`/api/shopping/suggestions?q=${encodeURIComponent(q)}`))
  );

  // ─── Meals ───────────────────────────────────────────────────────────────────

  server.tool(
    "get_meal_plan",
    "Get the meal plan for a date range.",
    {
      start: z.string().describe("Start date (ISO format, e.g. 2026-04-07)"),
      end: z.string().describe("End date (ISO format, e.g. 2026-04-13)"),
    },
    async ({ start, end }) =>
      text(await api(`/api/meals?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`))
  );

  server.tool(
    "get_meal",
    "Get the meal for a specific date with full recipe details.",
    { date: z.string().describe("Date (ISO format, e.g. 2026-04-07)") },
    async ({ date }) => text(await api(`/api/meals/${date}`))
  );

  server.tool(
    "set_meal",
    "Set or update the meal for a specific date.",
    {
      date: z.string().describe("Date (ISO format, e.g. 2026-04-07)"),
      recipeId: z.number().optional().describe("Recipe ID (use this OR customMeal)"),
      customMeal: z.string().optional().describe("Custom meal name (use this OR recipeId)"),
      notes: z.string().optional(),
    },
    async ({ date, ...body }) =>
      text(await api(`/api/meals/${date}`, { method: "PUT", body: JSON.stringify(body) }))
  );

  server.tool(
    "delete_meal",
    "Remove the meal plan entry for a specific date.",
    { date: z.string().describe("Date (ISO format)") },
    async ({ date }) => text(await api(`/api/meals/${date}`, { method: "DELETE" }))
  );

  server.tool(
    "get_meal_ingredients",
    "Get aggregated ingredients needed for meals in a date range. Also shows which items are already on a shopping list.",
    {
      start: z.string().describe("Start date (ISO format)"),
      end: z.string().describe("End date (ISO format)"),
    },
    async ({ start, end }) =>
      text(await api(`/api/meals/ingredients?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`))
  );

  // ─── Recipes ─────────────────────────────────────────────────────────────────

  server.tool(
    "list_recipes",
    "List all recipes, optionally search by name.",
    { q: z.string().optional().describe("Search query") },
    async ({ q }) => text(await api(`/api/recipes${q ? `?q=${encodeURIComponent(q)}` : ""}`))
  );

  server.tool(
    "get_recipe",
    "Get a recipe with its ingredients.",
    { id: z.number().describe("Recipe ID") },
    async ({ id }) => text(await api(`/api/recipes/${id}`))
  );

  server.tool(
    "create_recipe",
    "Create a new recipe.",
    {
      name: z.string().describe("Recipe name"),
      description: z.string().optional(),
      instructions: z.string().optional(),
      prepTime: z.number().optional().describe("Prep time in minutes"),
      cookTime: z.number().optional().describe("Cook time in minutes"),
      servings: z.number().optional(),
      imageUrl: z.string().optional(),
      ingredients: z
        .array(z.object({ name: z.string(), quantity: z.string().optional() }))
        .optional()
        .describe("List of ingredients"),
    },
    async (params) => text(await api("/api/recipes", { method: "POST", body: JSON.stringify(params) }))
  );

  server.tool(
    "update_recipe",
    "Update an existing recipe.",
    {
      id: z.number().describe("Recipe ID"),
      name: z.string().optional(),
      description: z.string().optional(),
      instructions: z.string().optional(),
      prepTime: z.number().optional(),
      cookTime: z.number().optional(),
      servings: z.number().optional(),
      imageUrl: z.string().optional(),
      ingredients: z
        .array(z.object({ name: z.string(), quantity: z.string().optional() }))
        .optional(),
    },
    async ({ id, ...body }) =>
      text(await api(`/api/recipes/${id}`, { method: "PUT", body: JSON.stringify(body) }))
  );

  server.tool(
    "delete_recipe",
    "Delete a recipe.",
    { id: z.number().describe("Recipe ID") },
    async ({ id }) => text(await api(`/api/recipes/${id}`, { method: "DELETE" }))
  );

  // ─── Together (Activities) ───────────────────────────────────────────────────

  server.tool(
    "list_activities",
    "List activities from the 'To Do Together' board. Can filter by status, category, or search.",
    {
      status: z.string().optional().describe("Filter: wishlist, planned, completed"),
      category: z.string().optional().describe("Filter: location, activity, restaurant, dish, film"),
      q: z.string().optional().describe("Search query"),
    },
    async ({ status, category, q }) => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      if (q) params.set("q", q);
      const qs = params.toString();
      return text(await api(`/api/together${qs ? `?${qs}` : ""}`));
    }
  );

  server.tool(
    "get_activity",
    "Get a single activity with full details.",
    { id: z.number().describe("Activity ID") },
    async ({ id }) => text(await api(`/api/together/${id}`))
  );

  server.tool(
    "create_activity",
    "Add a new activity to the 'To Do Together' board.",
    {
      title: z.string().describe("Activity title"),
      category: z.enum(["location", "activity", "restaurant", "dish", "film"]).describe("Category"),
      notes: z.string().optional(),
      status: z.enum(["wishlist", "planned", "completed"]).optional(),
      url: z.string().optional(),
      location: z.string().optional(),
      estimatedCost: z.enum(["low", "medium", "high", "splurge"]).optional(),
      duration: z.enum(["quick", "half-day", "full-day", "weekend", "week+"]).optional(),
      season: z.enum(["any", "spring", "summer", "fall", "winter"]).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      tags: z.string().optional().describe("JSON array of tags as string"),
    },
    async (params) => text(await api("/api/together", { method: "POST", body: JSON.stringify(params) }))
  );

  server.tool(
    "update_activity",
    "Update an existing activity.",
    {
      id: z.number().describe("Activity ID"),
      title: z.string().optional(),
      category: z.string().optional(),
      notes: z.string().optional(),
      status: z.string().optional(),
      completedDate: z.string().optional(),
      rating: z.number().optional().describe("1-5 rating"),
      review: z.string().optional(),
      url: z.string().optional(),
      location: z.string().optional(),
      estimatedCost: z.string().optional(),
      duration: z.string().optional(),
      season: z.string().optional(),
      priority: z.string().optional(),
      tags: z.string().optional(),
    },
    async ({ id, ...body }) =>
      text(await api(`/api/together/${id}`, { method: "PUT", body: JSON.stringify(body) }))
  );

  server.tool(
    "delete_activity",
    "Delete an activity.",
    { id: z.number().describe("Activity ID") },
    async ({ id }) => text(await api(`/api/together/${id}`, { method: "DELETE" }))
  );

  // ─── Stats ───────────────────────────────────────────────────────────────────

  server.tool(
    "get_stats",
    "Get household chore statistics: total tasks, overdue count, completions by day/area/task, and trends.",
    {},
    async () => text(await api("/api/stats"))
  );

  // ─── Users ───────────────────────────────────────────────────────────────────

  server.tool(
    "list_users",
    "List all household members.",
    {},
    async () => text(await api("/api/users"))
  );

  server.tool(
    "create_user",
    "Create a new household member.",
    {
      name: z.string().describe("Person's name"),
      color: z.string().optional().describe("Hex color for UI display"),
    },
    async (params) => text(await api("/api/users", { method: "POST", body: JSON.stringify(params) }))
  );

  // ─── Appliances ──────────────────────────────────────────────────────────────

  server.tool(
    "list_appliances",
    "List all household appliances.",
    {
      search: z.string().optional().describe("Search by name"),
      location: z.string().optional().describe("Filter by location"),
    },
    async ({ search, location }) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (location) params.set("location", location);
      const qs = params.toString();
      return text(await api(`/api/appliances${qs ? `?${qs}` : ""}`));
    }
  );

  server.tool(
    "get_appliance",
    "Get appliance details with linked tasks and service history.",
    { id: z.number().describe("Appliance ID") },
    async ({ id }) => text(await api(`/api/appliances/${id}`))
  );

  server.tool(
    "create_appliance",
    "Add a new household appliance.",
    {
      name: z.string().describe("Appliance name (e.g. Dishwasher, Oven, Hot Water System)"),
      location: z.string().optional().describe("Where it is (e.g. Kitchen, Laundry, Garage)"),
      brand: z.string().optional().describe("Manufacturer"),
      model: z.string().optional().describe("Model number"),
      purchaseDate: z.string().optional().describe("Purchase date (ISO format)"),
      warrantyExpiry: z.string().optional().describe("Warranty expiry date (ISO format)"),
      manualUrl: z.string().optional().describe("URL to product manual"),
      warrantyDocUrl: z.string().optional().describe("URL to warranty document"),
      notes: z.string().optional(),
    },
    async (params) => text(await api("/api/appliances", { method: "POST", body: JSON.stringify(params) }))
  );

  server.tool(
    "update_appliance",
    "Update an existing appliance.",
    {
      id: z.number().describe("Appliance ID"),
      name: z.string().optional(),
      location: z.string().optional(),
      brand: z.string().optional(),
      model: z.string().optional(),
      purchaseDate: z.string().optional(),
      warrantyExpiry: z.string().optional(),
      manualUrl: z.string().optional(),
      warrantyDocUrl: z.string().optional(),
      notes: z.string().optional(),
    },
    async ({ id, ...body }) =>
      text(await api(`/api/appliances/${id}`, { method: "PUT", body: JSON.stringify(body) }))
  );

  server.tool(
    "delete_appliance",
    "Delete an appliance.",
    { id: z.number().describe("Appliance ID") },
    async ({ id }) => text(await api(`/api/appliances/${id}`, { method: "DELETE" }))
  );

  // ─── Vendors ─────────────────────────────────────────────────────────────────

  server.tool(
    "list_vendors",
    "List all service vendors/contractors.",
    {
      search: z.string().optional().describe("Search by name"),
      category: z.string().optional().describe("Filter by category (Plumber, Electrician, etc.)"),
    },
    async ({ search, category }) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      const qs = params.toString();
      return text(await api(`/api/vendors${qs ? `?${qs}` : ""}`));
    }
  );

  server.tool(
    "get_vendor",
    "Get vendor details with job history.",
    { id: z.number().describe("Vendor ID") },
    async ({ id }) => text(await api(`/api/vendors/${id}`))
  );

  server.tool(
    "create_vendor",
    "Add a new service vendor/contractor.",
    {
      name: z.string().describe("Vendor/business name"),
      category: z.string().optional().describe("Category: Plumber, Electrician, HVAC, Appliance Repair, Landscaping, Cleaning, Chimney, General, Other"),
      phone: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
      notes: z.string().optional(),
      rating: z.number().optional().describe("Rating 1-5"),
    },
    async (params) => text(await api("/api/vendors", { method: "POST", body: JSON.stringify(params) }))
  );

  server.tool(
    "update_vendor",
    "Update an existing vendor.",
    {
      id: z.number().describe("Vendor ID"),
      name: z.string().optional(),
      category: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
      notes: z.string().optional(),
      rating: z.number().optional(),
    },
    async ({ id, ...body }) =>
      text(await api(`/api/vendors/${id}`, { method: "PUT", body: JSON.stringify(body) }))
  );

  server.tool(
    "delete_vendor",
    "Delete a vendor.",
    { id: z.number().describe("Vendor ID") },
    async ({ id }) => text(await api(`/api/vendors/${id}`, { method: "DELETE" }))
  );

  return server;
}
