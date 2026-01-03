"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Heart,
  MapPin,
  Sparkles,
  UtensilsCrossed,
  ChefHat,
  Film,
} from "lucide-react";
import { ActivityCard, Activity } from "@/components/together/ActivityCard";
import { ActivityForm } from "@/components/together/ActivityForm";
import { ActivityDetail } from "@/components/together/ActivityDetail";

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            &larr; Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">To-Do Together</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
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

          <Button
            onClick={() => {
              setEditingActivity(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        </div>

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
      </main>

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
    </div>
  );
}
