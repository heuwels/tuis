"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Refrigerator } from "lucide-react";
import { ApplianceCard } from "@/components/appliances/ApplianceCard";
import { ApplianceForm } from "@/components/appliances/ApplianceForm";
import { ApplianceDetail } from "@/components/appliances/ApplianceDetail";
import { AppLayout } from "@/components/layout/AppLayout";
import { Appliance } from "@/types";

const LOCATIONS = [
  { value: "", label: "All Locations" },
  { value: "Kitchen", label: "Kitchen" },
  { value: "Bathroom", label: "Bathroom" },
  { value: "Laundry", label: "Laundry" },
  { value: "Garage", label: "Garage" },
  { value: "Bedroom", label: "Bedroom" },
  { value: "Living Room", label: "Living Room" },
  { value: "Office", label: "Office" },
  { value: "Basement", label: "Basement" },
  { value: "Outdoor", label: "Outdoor" },
];

interface ApplianceWithDetails extends Appliance {
  tasks?: Array<{
    id: number;
    name: string;
    frequency: string;
    lastCompleted: string | null;
  }>;
  serviceHistory?: Array<{
    id: number;
    taskId: number;
    taskName: string;
    completedAt: string;
    vendorId: number | null;
    cost: string | null;
  }>;
}

export default function AppliancesPage() {
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAppliance, setSelectedAppliance] = useState<ApplianceWithDetails | null>(null);
  const [editingAppliance, setEditingAppliance] = useState<Appliance | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchAppliances = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedLocation) params.set("location", selectedLocation);

      const url = `/api/appliances${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAppliances(data);
      }
    } catch (error) {
      console.error("Error fetching appliances:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchApplianceDetails = async (id: number) => {
    try {
      const response = await fetch(`/api/appliances/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedAppliance(data);
        setIsDetailOpen(true);
      }
    } catch (error) {
      console.error("Error fetching appliance details:", error);
    }
  };

  useEffect(() => {
    fetchAppliances();
  }, [selectedLocation]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchAppliances();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleEdit = () => {
    if (selectedAppliance) {
      setEditingAppliance(selectedAppliance);
      setIsDetailOpen(false);
      setIsFormOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedAppliance) return;
    if (!confirm(`Delete "${selectedAppliance.name}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/appliances/${selectedAppliance.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setIsDetailOpen(false);
        setSelectedAppliance(null);
        fetchAppliances();
      }
    } catch (error) {
      console.error("Error deleting appliance:", error);
    }
  };

  const actions = (
    <Button
      onClick={() => {
        setEditingAppliance(null);
        setIsFormOpen(true);
      }}
    >
      <Plus className="h-4 w-4 mr-2" />
      Add Appliance
    </Button>
  );

  return (
    <AppLayout title="Appliances" actions={actions}>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search appliances..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {LOCATIONS.map((loc) => (
              <Button
                key={loc.value}
                variant={selectedLocation === loc.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedLocation(loc.value)}
              >
                {loc.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">
            Loading appliances...
          </p>
        ) : appliances.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Refrigerator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedLocation
                  ? "No appliances found matching your filters."
                  : "No appliances yet. Add your first appliance to track warranties and maintenance."}
              </p>
              {!searchQuery && !selectedLocation && (
                <Button
                  onClick={() => {
                    setEditingAppliance(null);
                    setIsFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Appliance
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appliances.map((appliance) => (
              <ApplianceCard
                key={appliance.id}
                appliance={appliance}
                onClick={() => fetchApplianceDetails(appliance.id)}
              />
            ))}
          </div>
        )}
      </div>

      <ApplianceForm
        appliance={editingAppliance || undefined}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => {
          fetchAppliances();
        }}
      />

      <ApplianceDetail
        appliance={selectedAppliance}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </AppLayout>
  );
}
