"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Heart,
  MapPin,
  Sparkles,
  UtensilsCrossed,
  ChefHat,
  Film,
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { ActivityCard, Activity } from "@/components/together/ActivityCard";
import { ActivityForm } from "@/components/together/ActivityForm";
import { ActivityDetail } from "@/components/together/ActivityDetail";
import { AppLayout } from "@/components/layout/AppLayout";

const CATEGORIES = [
  { value: "", label: "All", icon: Heart },
  { value: "location", label: "Locations", icon: MapPin },
  { value: "activity", label: "Activities", icon: Sparkles },
  { value: "restaurant", label: "Restaurants", icon: UtensilsCrossed },
  { value: "dish", label: "Dishes", icon: ChefHat },
  { value: "film", label: "Films", icon: Film },
];

const STATUSES = [
  { value: "", label: "All" },
  { value: "wishlist", label: "Wishlist" },
  { value: "planned", label: "Planned" },
  { value: "completed", label: "Completed" },
];

export default function TogetherPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchActivities = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (selectedStatus) params.set("status", selectedStatus);

      const url = `/api/together${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedStatus]);

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsDetailOpen(true);
  };

  const handleEdit = () => {
    if (selectedActivity) {
      setEditingActivity(selectedActivity);
      setIsDetailOpen(false);
      setIsFormOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedActivity) return;
    if (!confirm(`Delete "${selectedActivity.title}"? This cannot be undone.`))
      return;

    try {
      const response = await fetch(`/api/together/${selectedActivity.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setIsDetailOpen(false);
        setSelectedActivity(null);
        fetchActivities();
      }
    } catch (error) {
      console.error("Error deleting activity:", error);
    }
  };

  const handleExport = async (format: "json" | "csv" | "markdown") => {
    try {
      const response = await fetch(`/api/together/export?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = format === "markdown" ? "md" : format;
        a.download = `to-do-together-${new Date().toISOString().split("T")[0]}.${ext}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setIsExportOpen(false);
      }
    } catch (error) {
      console.error("Error exporting:", error);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch("/api/together/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully imported ${result.imported} activities!`);
        fetchActivities();
      } else {
        const error = await response.json();
        setImportError(
          error.details
            ? `Import failed:\n${error.details.join("\n")}`
            : error.error || "Import failed"
        );
      }
    } catch (error) {
      console.error("Error importing:", error);
      setImportError("Invalid JSON file. Please check the file format.");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const actions = (
    <>
      <Popover open={isExportOpen} onOpenChange={setIsExportOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="end">
          <div className="space-y-1">
            <button
              onClick={() => handleExport("json")}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              <FileJson className="h-4 w-4" />
              JSON (for import)
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              <FileSpreadsheet className="h-4 w-4" />
              CSV (spreadsheet)
            </button>
            <button
              onClick={() => handleExport("markdown")}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              <FileText className="h-4 w-4" />
              Markdown (document)
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-4 w-4 mr-2" />
        Import
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />

      <Button
        onClick={() => {
          setEditingActivity(null);
          setIsFormOpen(true);
        }}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add New
      </Button>
    </>
  );

  return (
    <AppLayout title="To-Do Together" actions={actions}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.value)}
                className="gap-1"
              >
                <Icon className="h-4 w-4" />
                {cat.label}
              </Button>
            );
          })}
        </div>
      </div>

      {importError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm whitespace-pre-wrap">
          {importError}
          <button
            onClick={() => setImportError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {STATUSES.map((status) => (
          <Button
            key={status.value}
            variant={selectedStatus === status.value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSelectedStatus(status.value)}
          >
            {status.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">
          Loading activities...
        </p>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {selectedCategory || selectedStatus
                ? "No activities found matching your filters."
                : "Your to-do together list is empty. Add your first activity!"}
            </p>
            {!selectedCategory && !selectedStatus && (
              <Button
                onClick={() => {
                  setEditingActivity(null);
                  setIsFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Activity
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onClick={() => handleActivityClick(activity)}
            />
          ))}
        </div>
      )}

      <ActivityForm
        activity={editingActivity || undefined}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={fetchActivities}
      />

      <ActivityDetail
        activity={selectedActivity}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </AppLayout>
  );
}
