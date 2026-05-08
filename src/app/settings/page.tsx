"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User } from "@/types";
import { Plus, Pencil, Trash2, Users, Home } from "lucide-react";
import { GoogleCalendarCard } from "@/components/settings/GoogleCalendarCard";
import { PersonalAccessTokensCard } from "@/components/settings/PersonalAccessTokensCard";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCurrentUser } from "@/lib/user-identity";
import { useCurrentHousehold } from "@/lib/household";

const COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

export default function SettingsPage() {
  const { currentUser } = useCurrentUser();
  const { households, refresh, selectHousehold } = useCurrentHousehold();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: "", color: COLORS[0] });
  const [isSaving, setIsSaving] = useState(false);

  const [isHouseholdFormOpen, setIsHouseholdFormOpen] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [householdError, setHouseholdError] = useState<string | null>(null);
  const [isSavingHousehold, setIsSavingHousehold] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddForm = () => {
    setEditingUser(null);
    setFormData({ name: "", color: COLORS[users.length % COLORS.length] });
    setIsFormOpen(true);
  };

  const openEditForm = (user: User) => {
    setEditingUser(user);
    setFormData({ name: user.name, color: user.color });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchUsers();
        setIsFormOpen(false);
      }
    } catch (error) {
      console.error("Error saving user:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete ${user.name}? This will unassign them from all tasks.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const openHouseholdForm = () => {
    setHouseholdName("");
    setHouseholdError(null);
    setIsHouseholdFormOpen(true);
  };

  const handleHouseholdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHouseholdError(null);

    const trimmed = householdName.trim();
    if (!trimmed) {
      setHouseholdError("Name is required");
      return;
    }
    if (!currentUser) {
      setHouseholdError("Pick a user before creating a household");
      return;
    }

    setIsSavingHousehold(true);
    try {
      const response = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, userId: currentUser.id }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setHouseholdError(body.error ?? "Failed to create household");
        return;
      }

      const { id } = await response.json();
      await refresh();
      selectHousehold(id);
      setIsHouseholdFormOpen(false);
    } catch (error) {
      console.error("Error creating household:", error);
      setHouseholdError("Failed to create household");
    } finally {
      setIsSavingHousehold(false);
    }
  };

  return (
    <AppLayout title="Settings">
      <div className="space-y-6 max-w-2xl">
        <GoogleCalendarCard />
        <PersonalAccessTokensCard />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Households
            </CardTitle>
            <Button
              onClick={openHouseholdForm}
              size="sm"
              disabled={!currentUser}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Household
            </Button>
          </CardHeader>
          <CardContent>
            {households.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                You are not a member of any household yet.
              </p>
            ) : (
              <div className="space-y-2">
                {households.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Home className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="font-medium">{h.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Household Members
            </CardTitle>
            <Button onClick={openAddForm} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : users.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No household members yet. Add someone to assign tasks to them.
              </p>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: user.color }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditForm(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => handleDelete(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isHouseholdFormOpen} onOpenChange={setIsHouseholdFormOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Household</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleHouseholdSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="household-name">Name</Label>
              <Input
                id="household-name"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="e.g., Beach House"
                autoFocus
                required
              />
              {householdError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {householdError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsHouseholdFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingHousehold}>
                {isSavingHousehold ? "Saving..." : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit Member" : "Add Member"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., John"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-transform ${
                      formData.color === color
                        ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-zinc-900 scale-110"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingUser ? "Save" : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
