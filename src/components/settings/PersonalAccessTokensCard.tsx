"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KeyRound, Plus, Trash2, Copy, Check } from "lucide-react";

const SCOPE_GROUPS = {
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

interface TokenInfo {
  id: number;
  name: string;
  scopes: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export function PersonalAccessTokensCard() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set());
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTokens = async () => {
    try {
      const response = await fetch("/api/tokens");
      if (response.ok) {
        setTokens(await response.json());
      }
    } catch (error) {
      console.error("Error fetching tokens:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  };

  const toggleGroup = (groupKey: string) => {
    const group =
      SCOPE_GROUPS[groupKey as keyof typeof SCOPE_GROUPS];
    const allSelected = group.scopes.every((s) => selectedScopes.has(s));
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      for (const s of group.scopes) {
        if (allSelected) next.delete(s);
        else next.add(s);
      }
      return next;
    });
  };

  const selectAll = () => {
    const all = Object.values(SCOPE_GROUPS).flatMap((g) => g.scopes);
    setSelectedScopes(new Set(all));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedScopes.size === 0) return;
    setIsSaving(true);

    try {
      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          scopes: Array.from(selectedScopes),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewToken(data.token);
        fetchTokens();
      }
    } catch (error) {
      console.error("Error creating token:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (token: TokenInfo) => {
    if (!confirm(`Revoke token "${token.name}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/tokens/${token.id}`, {
        method: "DELETE",
      });
      if (response.ok) fetchTokens();
    } catch (error) {
      console.error("Error deleting token:", error);
    }
  };

  const handleCopy = async () => {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setName("");
    setSelectedScopes(new Set());
    setNewToken(null);
    setCopied(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString();
  };

  const parsedScopes = (scopesJson: string): string[] => {
    try {
      return JSON.parse(scopesJson);
    } catch {
      return [];
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Personal Access Tokens
        </CardTitle>
        <Button
          onClick={() => setIsFormOpen(true)}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Token
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : tokens.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No tokens yet. Create one to use with the CLI.
          </p>
        ) : (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{token.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {parsedScopes(token.scopes).map((scope) => (
                      <span
                        key={scope}
                        className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-zinc-700 rounded"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created {formatDate(token.createdAt)}
                    {token.lastUsedAt &&
                      ` \u00B7 Last used ${formatDate(token.lastUsedAt)}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 ml-2 shrink-0"
                  onClick={() => handleDelete(token)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {newToken ? "Token Created" : "Create Access Token"}
            </DialogTitle>
          </DialogHeader>

          {newToken ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Copy this token now. It will not be shown again.
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={newToken}
                  className="font-mono text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex justify-end">
                <Button onClick={closeForm}>Done</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token-name">Token Name</Label>
                <Input
                  id="token-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., CLI, Home Assistant"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Scopes</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-auto py-1"
                    onClick={selectAll}
                  >
                    Select all
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto border rounded-lg p-3 dark:border-zinc-700">
                  {Object.entries(SCOPE_GROUPS).map(([key, group]) => (
                    <div key={key} className="space-y-1">
                      <button
                        type="button"
                        className="text-sm font-medium hover:underline"
                        onClick={() => toggleGroup(key)}
                      >
                        {group.label}
                      </button>
                      {group.scopes.map((scope) => (
                        <label
                          key={scope}
                          className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedScopes.has(scope)}
                            onCheckedChange={() => toggleScope(scope)}
                          />
                          {scope.split(":")[1]}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || selectedScopes.size === 0}
                >
                  {isSaving ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
