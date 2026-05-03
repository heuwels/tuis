"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Car } from "lucide-react";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { VehicleForm } from "@/components/vehicles/VehicleForm";
import { VehicleDetail } from "@/components/vehicles/VehicleDetail";
import { AppLayout } from "@/components/layout/AppLayout";
import { Vehicle, VehicleWithDetails } from "@/types";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] =
    useState<VehicleWithDetails | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchVehicles = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);

      const url = `/api/vehicles${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVehicleDetails = async (id: number) => {
    try {
      const response = await fetch(`/api/vehicles/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedVehicle(data);
        setIsDetailOpen(true);
      }
    } catch (error) {
      console.error("Error fetching vehicle details:", error);
    }
  };

  useEffect(() => {
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchVehicles();
    }, 300);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleEdit = () => {
    if (selectedVehicle) {
      setEditingVehicle(selectedVehicle);
      setIsDetailOpen(false);
      setIsFormOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedVehicle) return;
    if (!confirm(`Delete "${selectedVehicle.name}"? This cannot be undone.`))
      return;

    try {
      const response = await fetch(`/api/vehicles/${selectedVehicle.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setIsDetailOpen(false);
        setSelectedVehicle(null);
        fetchVehicles();
      }
    } catch (error) {
      console.error("Error deleting vehicle:", error);
    }
  };

  const handleRefreshDetail = () => {
    if (selectedVehicle) {
      fetchVehicleDetails(selectedVehicle.id);
    }
  };

  const actions = (
    <Button
      onClick={() => {
        setEditingVehicle(null);
        setIsFormOpen(true);
      }}
    >
      <Plus className="h-4 w-4 mr-2" />
      Add Vehicle
    </Button>
  );

  return (
    <AppLayout title="Vehicles" actions={actions}>
      <div className="space-y-4">
        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search vehicles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">
            Loading vehicles...
          </p>
        ) : vehicles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "No vehicles found matching your search."
                  : "No vehicles yet. Add your first vehicle to track services and fuel."}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => {
                    setEditingVehicle(null);
                    setIsFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Vehicle
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onClick={() => fetchVehicleDetails(vehicle.id)}
              />
            ))}
          </div>
        )}
      </div>

      <VehicleForm
        vehicle={editingVehicle || undefined}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => {
          fetchVehicles();
        }}
      />

      <VehicleDetail
        vehicle={selectedVehicle}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={handleRefreshDetail}
      />
    </AppLayout>
  );
}
