export const SCOPE_GROUPS = {
  tasks: { label: "Tasks", scopes: ["tasks:read", "tasks:write"] },
  shopping: { label: "Shopping", scopes: ["shopping:read", "shopping:write"] },
  meals: { label: "Meals", scopes: ["meals:read", "meals:write"] },
  recipes: { label: "Recipes", scopes: ["recipes:read", "recipes:write"] },
  vehicles: { label: "Vehicles", scopes: ["vehicles:read", "vehicles:write"] },
  vendors: { label: "Vendors", scopes: ["vendors:read", "vendors:write"] },
  quotes: { label: "Quotes", scopes: ["quotes:read", "quotes:write"] },
  appliances: {
    label: "Appliances",
    scopes: ["appliances:read", "appliances:write"],
  },
  activities: {
    label: "Activities",
    scopes: ["activities:read", "activities:write"],
  },
  users: { label: "Users", scopes: ["users:read", "users:write"] },
  stats: { label: "Stats", scopes: ["stats:read"] },
} as const;

export type Scope = (typeof ALL_SCOPES)[number];

export const ALL_SCOPES = Object.values(SCOPE_GROUPS).flatMap(
  (g) => g.scopes
) as string[];

// Map API route prefixes to required scopes
export const ROUTE_SCOPE_MAP: Record<string, { read: string; write: string }> =
  {
    "/api/tasks": { read: "tasks:read", write: "tasks:write" },
    "/api/shopping": { read: "shopping:read", write: "shopping:write" },
    "/api/meals": { read: "meals:read", write: "meals:write" },
    "/api/recipes": { read: "recipes:read", write: "recipes:write" },
    "/api/vehicles": { read: "vehicles:read", write: "vehicles:write" },
    "/api/vendors": { read: "vendors:read", write: "vendors:write" },
    "/api/quotes": { read: "quotes:read", write: "quotes:write" },
    "/api/appliances": {
      read: "appliances:read",
      write: "appliances:write",
    },
    "/api/together": { read: "activities:read", write: "activities:write" },
    "/api/users": { read: "users:read", write: "users:write" },
    "/api/stats": { read: "stats:read", write: "stats:read" },
  };
