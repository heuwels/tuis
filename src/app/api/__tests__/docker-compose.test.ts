import { describe, it, expect } from "vitest";
import {
  generateDockerCompose,
  DEFAULT_CONFIG,
} from "@/lib/docker-compose";

describe("Docker Compose Generator", () => {
  describe("default config", () => {
    it("produces valid YAML starting with services:", () => {
      const yaml = generateDockerCompose();
      expect(yaml).toMatch(/^services:\n/);
    });

    it("includes the tuis service with correct image", () => {
      const yaml = generateDockerCompose();
      expect(yaml).toContain("  tuis:");
      expect(yaml).toContain("image: ghcr.io/heuwels/tuis:${TUIS_VERSION:-latest}");
    });

    it("maps the default port 6969", () => {
      const yaml = generateDockerCompose();
      expect(yaml).toContain("${WEB_PORT:-6969}:3000");
    });

    it("uses the default named volume tuis-data", () => {
      const yaml = generateDockerCompose();
      expect(yaml).toContain("tuis-data:/app/data");
      expect(yaml).toContain("volumes:\n  tuis-data:");
    });

    it("includes standard environment variables", () => {
      const yaml = generateDockerCompose();
      expect(yaml).toContain("NODE_ENV=production");
      expect(yaml).toContain("NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}");
      expect(yaml).toContain("GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}");
      expect(yaml).toContain("GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}");
      expect(yaml).toContain("NEXTAUTH_SECRET=${NEXTAUTH_SECRET}");
    });

    it("does not include MCP sidecar by default", () => {
      const yaml = generateDockerCompose();
      expect(yaml).not.toContain("mcp-server:");
      expect(yaml).not.toContain("tuis-mcp");
    });
  });

  describe("custom port", () => {
    it("uses the specified port", () => {
      const yaml = generateDockerCompose({ port: 8080 });
      expect(yaml).toContain("${WEB_PORT:-8080}:3000");
      expect(yaml).not.toContain("${WEB_PORT:-6969}");
    });
  });

  describe("custom volume path", () => {
    it("uses a named volume when given a simple name", () => {
      const yaml = generateDockerCompose({ volumePath: "my-data" });
      expect(yaml).toContain("my-data:/app/data");
      expect(yaml).toContain("volumes:\n  my-data:");
    });

    it("uses a bind mount path and omits named volumes section", () => {
      const yaml = generateDockerCompose({ volumePath: "./data" });
      expect(yaml).toContain("./data:/app/data");
      // No named volumes section when using a bind mount
      const volumesSections = yaml.split("volumes:");
      // Only the service-level volumes: should appear, not a top-level volumes:
      expect(volumesSections).toHaveLength(2); // one in service, no top-level
    });

    it("handles absolute host paths", () => {
      const yaml = generateDockerCompose({ volumePath: "/opt/tuis/data" });
      expect(yaml).toContain("/opt/tuis/data:/app/data");
    });
  });

  describe("custom image tag", () => {
    it("uses the specified image tag", () => {
      const yaml = generateDockerCompose({ imageTag: "v1.2.3" });
      expect(yaml).toContain("ghcr.io/heuwels/tuis:${TUIS_VERSION:-v1.2.3}");
    });
  });

  describe("MCP sidecar", () => {
    it("adds mcp-server service when enabled", () => {
      const yaml = generateDockerCompose({ includeMcp: true });
      expect(yaml).toContain("  mcp-server:");
      expect(yaml).toContain("container_name: tuis-mcp");
      expect(yaml).toContain("TUIS_API_URL=http://tuis:3000");
    });

    it("MCP sidecar depends on tuis service", () => {
      const yaml = generateDockerCompose({ includeMcp: true });
      expect(yaml).toContain("depends_on:");
      expect(yaml).toContain("      - tuis");
    });

    it("MCP sidecar uses the same image tag", () => {
      const yaml = generateDockerCompose({
        includeMcp: true,
        imageTag: "v2.0.0",
      });
      // Both services should reference the same tag
      const matches = yaml.match(/ghcr\.io\/heuwels\/tuis:\$\{TUIS_VERSION:-v2\.0\.0\}/g);
      expect(matches).toHaveLength(2);
    });
  });

  describe("environment variables", () => {
    it("includes user-provided values with defaults", () => {
      const yaml = generateDockerCompose({
        envVars: {
          NEXTAUTH_SECRET: "my-secret-key",
        },
      });
      expect(yaml).toContain("NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-my-secret-key}");
    });

    it("includes custom env vars", () => {
      const yaml = generateDockerCompose({
        envVars: {
          MY_CUSTOM_VAR: "hello",
        },
      });
      expect(yaml).toContain("MY_CUSTOM_VAR=hello");
    });

    it("allows overriding NEXTAUTH_URL default", () => {
      const yaml = generateDockerCompose({
        envVars: {
          NEXTAUTH_URL: "https://tuis.example.com",
        },
      });
      expect(yaml).toContain("NEXTAUTH_URL=${NEXTAUTH_URL:-https://tuis.example.com}");
    });
  });

  describe("DEFAULT_CONFIG", () => {
    it("has sensible defaults", () => {
      expect(DEFAULT_CONFIG.port).toBe(6969);
      expect(DEFAULT_CONFIG.volumePath).toBe("tuis-data");
      expect(DEFAULT_CONFIG.imageTag).toBe("latest");
      expect(DEFAULT_CONFIG.includeMcp).toBe(false);
      expect(DEFAULT_CONFIG.envVars).toEqual({});
    });
  });
});
