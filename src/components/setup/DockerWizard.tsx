"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Puzzle,
  Variable,
  FileCode,
  ArrowRight,
  ArrowLeft,
  Copy,
  Download,
  Check,
  Container,
  Plus,
  Trash2,
} from "lucide-react";
import {
  generateDockerCompose,
  DEFAULT_CONFIG,
  type DockerComposeConfig,
} from "@/lib/docker-compose";

const STEPS = [
  { label: "Core", icon: Settings },
  { label: "Sidecars", icon: Puzzle },
  { label: "Environment", icon: Variable },
  { label: "Preview", icon: FileCode },
];

const KNOWN_ENV_VARS: Array<{
  key: string;
  label: string;
  description: string;
  placeholder: string;
}> = [
  {
    key: "NEXTAUTH_SECRET",
    label: "NextAuth Secret",
    description: "Secret key for session encryption",
    placeholder: "e.g. openssl rand -base64 32",
  },
  {
    key: "NEXTAUTH_URL",
    label: "NextAuth URL",
    description: "Public URL of your Tuis instance",
    placeholder: "http://localhost:3000",
  },
  {
    key: "GOOGLE_CLIENT_ID",
    label: "Google Client ID",
    description: "For Google Calendar integration (optional)",
    placeholder: "your-client-id.apps.googleusercontent.com",
  },
  {
    key: "GOOGLE_CLIENT_SECRET",
    label: "Google Client Secret",
    description: "For Google Calendar integration (optional)",
    placeholder: "your-client-secret",
  },
  {
    key: "ACTUAL_API_URL",
    label: "Actual Budget API URL",
    description: "URL of your Actual Budget server (optional)",
    placeholder: "http://localhost:3100",
  },
];

interface CustomEnvVar {
  key: string;
  value: string;
}

export default function DockerWizard() {
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);

  // Step 1: Core settings
  const [port, setPort] = useState(DEFAULT_CONFIG.port);
  const [volumePath, setVolumePath] = useState(DEFAULT_CONFIG.volumePath);
  const [imageTag, setImageTag] = useState(DEFAULT_CONFIG.imageTag);

  // Step 2: Sidecars
  const [includeMcp, setIncludeMcp] = useState(false);

  // Step 3: Environment
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const [customEnvVars, setCustomEnvVars] = useState<CustomEnvVar[]>([]);

  const updateEnvValue = useCallback((key: string, value: string) => {
    setEnvValues((prev) => {
      if (value === "") {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const addCustomEnvVar = useCallback(() => {
    setCustomEnvVars((prev) => [...prev, { key: "", value: "" }]);
  }, []);

  const updateCustomEnvVar = useCallback(
    (index: number, field: "key" | "value", val: string) => {
      setCustomEnvVars((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: val };
        return next;
      });
    },
    []
  );

  const removeCustomEnvVar = useCallback((index: number) => {
    setCustomEnvVars((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Build config and generate YAML
  const buildConfig = useCallback((): Partial<DockerComposeConfig> => {
    const allEnvVars: Record<string, string> = { ...envValues };
    for (const { key, value } of customEnvVars) {
      if (key.trim() && value.trim()) {
        allEnvVars[key.trim()] = value.trim();
      }
    }
    return {
      port,
      volumePath,
      imageTag,
      includeMcp,
      envVars: allEnvVars,
    };
  }, [port, volumePath, imageTag, includeMcp, envValues, customEnvVars]);

  const generatedYaml = generateDockerCompose(buildConfig());

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedYaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement("textarea");
      textarea.value = generatedYaml;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedYaml]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([generatedYaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "docker-compose.yml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedYaml]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Container className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
            Docker Compose Wizard
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Generate a docker-compose.yml tailored to your setup
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
                    i <= step
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-zinc-700 text-gray-400 dark:text-zinc-500"
                  }`}
                  aria-label={`Go to step: ${s.label}`}
                >
                  <Icon className="h-4 w-4" />
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-8 h-0.5 transition-colors ${
                      i < step
                        ? "bg-blue-600"
                        : "bg-gray-200 dark:bg-zinc-700"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 0: Core Settings */}
        {step === 0 && (
          <Card>
            <CardContent className="pt-6 pb-6 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
                  Core Settings
                </h2>
                <p className="text-gray-500 dark:text-zinc-400 text-sm">
                  Configure the basics for your Tuis deployment.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="port">Host Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={port}
                    onChange={(e) =>
                      setPort(parseInt(e.target.value, 10) || 6969)
                    }
                    placeholder="6969"
                    min={1}
                    max={65535}
                  />
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    The port on your host machine to access Tuis (maps to
                    container port 3000).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="volume">Data Volume</Label>
                  <Input
                    id="volume"
                    value={volumePath}
                    onChange={(e) => setVolumePath(e.target.value || "tuis-data")}
                    placeholder="tuis-data"
                  />
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    A named Docker volume (e.g. &quot;tuis-data&quot;) or a host path
                    (e.g. &quot;./data&quot; or &quot;/opt/tuis/data&quot;) for database
                    persistence.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image-tag">Image Tag</Label>
                  <Input
                    id="image-tag"
                    value={imageTag}
                    onChange={(e) => setImageTag(e.target.value || "latest")}
                    placeholder="latest"
                  />
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    The default image tag. Can be overridden at runtime with the
                    TUIS_VERSION env var.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep(1)} className="gap-2">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Sidecars */}
        {step === 1 && (
          <Card>
            <CardContent className="pt-6 pb-6 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
                  Sidecars
                </h2>
                <p className="text-gray-500 dark:text-zinc-400 text-sm">
                  Add optional companion services alongside the main Tuis app.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
                  <Checkbox
                    checked={includeMcp}
                    onCheckedChange={(checked) =>
                      setIncludeMcp(checked === true)
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-zinc-100">
                        MCP Server
                      </span>
                      <Badge variant="secondary">Sidecar</Badge>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                      Model Context Protocol server for AI assistant
                      integrations. Connects to the Tuis API to allow AI tools
                      to manage your household data.
                    </div>
                  </div>
                </label>

                <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg opacity-60">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-zinc-100">
                      More coming soon
                    </span>
                    <Badge variant="outline">Planned</Badge>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                    Additional adapters and integrations will be available in
                    future releases.
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(0)}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  className="flex-1 gap-2"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Environment Variables */}
        {step === 2 && (
          <Card>
            <CardContent className="pt-6 pb-6 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
                  Environment Variables
                </h2>
                <p className="text-gray-500 dark:text-zinc-400 text-sm">
                  Optionally pre-fill environment variable defaults. Leave blank
                  to use shell variable references in the output.
                </p>
              </div>

              <div className="space-y-4">
                {KNOWN_ENV_VARS.map((envVar) => (
                  <div key={envVar.key} className="space-y-1.5">
                    <Label htmlFor={`env-${envVar.key}`}>{envVar.label}</Label>
                    <Input
                      id={`env-${envVar.key}`}
                      value={envValues[envVar.key] || ""}
                      onChange={(e) =>
                        updateEnvValue(envVar.key, e.target.value)
                      }
                      placeholder={envVar.placeholder}
                    />
                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                      {envVar.description}
                    </p>
                  </div>
                ))}

                {/* Custom env vars */}
                {customEnvVars.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-zinc-700 pt-4 space-y-3">
                    <Label>Custom Variables</Label>
                    {customEnvVars.map((envVar, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={envVar.key}
                          onChange={(e) =>
                            updateCustomEnvVar(index, "key", e.target.value)
                          }
                          placeholder="KEY"
                          className="flex-1"
                        />
                        <Input
                          value={envVar.value}
                          onChange={(e) =>
                            updateCustomEnvVar(index, "value", e.target.value)
                          }
                          placeholder="value"
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustomEnvVar(index)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={addCustomEnvVar}
                  className="w-full gap-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Custom Variable
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1 gap-2"
                >
                  Preview
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <Card>
            <CardContent className="pt-6 pb-6 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
                  Your docker-compose.yml
                </h2>
                <p className="text-gray-500 dark:text-zinc-400 text-sm">
                  Review and download your generated configuration.
                </p>
              </div>

              {/* YAML Preview */}
              <div className="relative">
                <pre
                  className="bg-gray-900 dark:bg-zinc-900 text-green-400 dark:text-green-300 p-4 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre leading-relaxed"
                  data-testid="yaml-preview"
                >
                  {generatedYaml}
                </pre>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="flex-1 gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
                <Button onClick={handleDownload} className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Download File
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
