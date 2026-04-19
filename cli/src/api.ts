import { requireConfig } from "./config.js";

export async function api(
  path: string,
  options?: RequestInit
): Promise<unknown> {
  const config = requireConfig();
  const url = `${config.url.replace(/\/$/, "")}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
        ...options?.headers,
      },
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Unknown network error";
    console.error(`Cannot connect to ${config.url}: ${msg}`);
    process.exit(1);
  }

  if (!res.ok) {
    const body = await res.text();
    let message: string;
    try {
      const json = JSON.parse(body);
      message = json.error || body;
    } catch {
      message = body;
    }
    console.error(`Error ${res.status}: ${message}`);
    process.exit(1);
  }

  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printTable(
  items: Record<string, unknown>[],
  columns: { key: string; label: string; width?: number }[]
): void {
  if (items.length === 0) {
    console.log("No results.");
    return;
  }

  // Header
  const header = columns
    .map((c) => c.label.padEnd(c.width || 20))
    .join("  ");
  console.log(header);
  console.log("-".repeat(header.length));

  // Rows
  for (const item of items) {
    const row = columns
      .map((c) => {
        const val = String(item[c.key] ?? "");
        return val.padEnd(c.width || 20).slice(0, c.width || 20);
      })
      .join("  ");
    console.log(row);
  }
}
