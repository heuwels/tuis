export interface DockerComposeConfig {
  /** Host port to map to the Tuis container (default: 6969) */
  port: number;
  /** Named volume or host path for data persistence (default: "tuis-data") */
  volumePath: string;
  /** Include the MCP server sidecar (default: false) */
  includeMcp: boolean;
  /** Environment variable overrides (key-value pairs) */
  envVars: Record<string, string>;
  /** Tuis image tag (default: "latest") */
  imageTag: string;
}

export const DEFAULT_CONFIG: DockerComposeConfig = {
  port: 6969,
  volumePath: "tuis-data",
  imageTag: "latest",
  includeMcp: false,
  envVars: {},
};

export function generateDockerCompose(
  partial: Partial<DockerComposeConfig> = {}
): string {
  const config: DockerComposeConfig = { ...DEFAULT_CONFIG, ...partial };

  const lines: string[] = [];

  lines.push("services:");
  lines.push("  tuis:");
  lines.push(
    `    image: ghcr.io/heuwels/tuis:\${TUIS_VERSION:-${config.imageTag}}`
  );
  lines.push("    container_name: tuis");
  lines.push("    restart: unless-stopped");
  lines.push("    ports:");
  lines.push(`      - "\${WEB_PORT:-${config.port}}:3000"`);
  lines.push("    volumes:");

  if (isNamedVolume(config.volumePath)) {
    lines.push(`      - ${config.volumePath}:/app/data`);
  } else {
    lines.push(`      - ${config.volumePath}:/app/data`);
  }

  // Environment variables
  const envEntries = buildEnvEntries(config);
  if (envEntries.length > 0) {
    lines.push("    environment:");
    for (const entry of envEntries) {
      lines.push(`      - ${entry}`);
    }
  }

  // MCP sidecar
  if (config.includeMcp) {
    lines.push("");
    lines.push("  mcp-server:");
    lines.push(
      `    image: ghcr.io/heuwels/tuis:\${TUIS_VERSION:-${config.imageTag}}`
    );
    lines.push("    container_name: tuis-mcp");
    lines.push("    restart: unless-stopped");
    lines.push('    command: ["node", "mcp-server/dist/index.js"]');
    lines.push("    environment:");
    lines.push("      - TUIS_API_URL=http://tuis:3000");
    lines.push("    depends_on:");
    lines.push("      - tuis");
  }

  // Named volumes section
  const namedVolumes = collectNamedVolumes(config);
  if (namedVolumes.length > 0) {
    lines.push("");
    lines.push("volumes:");
    for (const vol of namedVolumes) {
      lines.push(`  ${vol}:`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

function buildEnvEntries(config: DockerComposeConfig): string[] {
  const entries: string[] = [];

  entries.push("NODE_ENV=production");

  // Default optional env vars with shell-variable syntax
  const defaults: Record<string, string> = {
    NEXTAUTH_URL: "http://localhost:3000",
  };

  // Optional env vars that have no default -- only include if user provided them
  const optionalKeys = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "NEXTAUTH_SECRET",
    "ACTUAL_API_URL",
  ];

  // Always include NEXTAUTH_URL with its default
  const nextauthUrl =
    config.envVars["NEXTAUTH_URL"] || defaults["NEXTAUTH_URL"];
  entries.push(
    `NEXTAUTH_URL=\${NEXTAUTH_URL:-${nextauthUrl}}`
  );

  for (const key of optionalKeys) {
    if (config.envVars[key]) {
      entries.push(`${key}=\${${key}:-${config.envVars[key]}}`);
    } else {
      entries.push(`${key}=\${${key}}`);
    }
  }

  // Any extra env vars the user added
  for (const [key, value] of Object.entries(config.envVars)) {
    if (
      key === "NEXTAUTH_URL" ||
      optionalKeys.includes(key) ||
      key === "NODE_ENV"
    ) {
      continue;
    }
    entries.push(`${key}=${value}`);
  }

  return entries;
}

/** A named volume is a simple identifier (no slashes, no dots at start). */
function isNamedVolume(path: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(path);
}

function collectNamedVolumes(config: DockerComposeConfig): string[] {
  const volumes: string[] = [];
  if (isNamedVolume(config.volumePath)) {
    volumes.push(config.volumePath);
  }
  return volumes;
}
