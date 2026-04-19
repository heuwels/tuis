import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

interface Config {
  url: string;
  token: string;
}

const CONFIG_DIR = join(homedir(), ".config", "tuis");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export function loadConfig(): Config | null {
  if (!existsSync(CONFIG_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return null;
  }
}

export function saveConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", {
    mode: 0o600,
  });
}

export function requireConfig(): Config {
  const config = loadConfig();
  if (!config) {
    console.error(
      "Not configured. Run `tuis configure` to set your server URL and token."
    );
    process.exit(1);
  }
  return config;
}
