"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Task, User, Appliance } from "@/types";

const AREAS = [
  "Kitchen",
  "Bathroom",
  "Bedrooms",
  "Lounge",
  "Living room",
  "Whole house",
  "Garden",
  "Exterior",
  "Interior",
  "Laundry",
];

const FREQUENCIES = [
  "Daily",
  "Weekly",
  "Weekly (Ad-hoc)",
  "Bi-Weekly",
  "Monthly",
  "Quarterly",
  "Bi-Annually",
  "Annual",
];

interface TaskFormProps {
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TaskForm({ task, open, onOpenChange, onSuccess }: TaskFormProps) {
  const isEditing = !!task;

  const [formData, setFormData] = useState({
    name: "",
    area: "",
    frequency: "",
    assignedDay: "",
    season: "",
    notes: "",
    nextDue: "",
    assignedTo: "",
    applianceId: "",
  });
  const [users, setUsers] = useState<User[]>([]);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch users and appliances
  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch("/api/users");
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    }
    async function fetchAppliances() {
      try {
        const response = await fetch("/api/appliances");
        if (response.ok) {
          const data = await response.json();
          setAppliances(data);
        }
      } catch (error) {
        console.error("Error fetching appliances:", error);
      }
    }
    fetchUsers();
    fetchAppliances();
  }, []);

  // Update form when task changes (for editing different tasks)
  useEffect(() => {
    if (open) {
      setFormData({
        name: task?.name || "",
        area: task?.area || "",
        frequency: task?.frequency || "",
        assignedDay: task?.assignedDay || "",
        season: task?.season || "",
        notes: task?.notes || "",
        nextDue: task?.nextDue || "",
        assignedTo: task?.assignedTo?.toString() || "",
        applianceId: task?.applianceId?.toString() || "",
      });
      setError("");
    }
  }, [task, open]);

  const resetForm = () => {
    setFormData({
      name: "",
      area: "",
      frequency: "",
      assignedDay: "",
      season: "",
      notes: "",
      nextDue: "",
      assignedTo: "",
      applianceId: "",
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const url = isEditing ? `/api/tasks/${task.id}` : "/api/tasks";
      const method = isEditing ? "PUT" : "POST";

      const payload = {
        ...formData,
        assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : null,
        applianceId: formData.applianceId ? parseInt(formData.applianceId) : null,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save task");
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Add New Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Task Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Clean the gutters"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area">Area *</Label>
              <Select
                value={formData.area}
                onValueChange={(value) => setFormData({ ...formData, area: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency *</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((freq) => (
                    <SelectItem key={freq} value={freq}>
                      {freq}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignedDay">Assigned Day</Label>
              <Input
                id="assignedDay"
                value={formData.assignedDay}
                onChange={(e) => setFormData({ ...formData, assignedDay: e.target.value })}
                placeholder="e.g., Monday, Saturday"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assign To</Label>
              <Select
                value={formData.assignedTo || "unassigned"}
                onValueChange={(value) => setFormData({ ...formData, assignedTo: value === "unassigned" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: user.color }}
                        />
                        {user.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="season">Season</Label>
              <Input
                id="season"
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                placeholder="e.g., All, Spring, Winter"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextDue">Next Due Date</Label>
              <Input
                id="nextDue"
                type="date"
                value={formData.nextDue}
                onChange={(e) => setFormData({ ...formData, nextDue: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="applianceId">Related Appliance</Label>
            <Select
              value={formData.applianceId || "none"}
              onValueChange={(value) => setFormData({ ...formData, applianceId: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {appliances.map((appliance) => (
                  <SelectItem key={appliance.id} value={appliance.id.toString()}>
                    {appliance.name}
                    {appliance.location && (
                      <span className="text-muted-foreground ml-2">
                        ({appliance.location})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional instructions or details"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : isEditing ? "Save Changes" : "Add Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
