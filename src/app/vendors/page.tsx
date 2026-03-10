"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Wrench } from "lucide-react";
import { VendorCard } from "@/components/vendors/VendorCard";
import { VendorForm } from "@/components/vendors/VendorForm";
import { VendorDetail } from "@/components/vendors/VendorDetail";
import { AppLayout } from "@/components/layout/AppLayout";
import { Vendor } from "@/types";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "Plumber", label: "Plumber" },
  { value: "Electrician", label: "Electrician" },
  { value: "HVAC", label: "HVAC" },
  { value: "Appliance Repair", label: "Appliance Repair" },
  { value: "Landscaping", label: "Landscaping" },
  { value: "Cleaning", label: "Cleaning" },
  { value: "General", label: "General" },
  { value: "Other", label: "Other" },
];

interface VendorWithDetails extends Vendor {
  jobHistory?: Array<{
    id: number;
    taskId: number;
    taskName: string;
    completedAt: string;
    cost: string | null;
  }>;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorWithDetails | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchVendors = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedCategory) params.set("category", selectedCategory);

      const url = `/api/vendors${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVendorDetails = async (id: number) => {
    try {
      const response = await fetch(`/api/vendors/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedVendor(data);
        setIsDetailOpen(true);
      }
    } catch (error) {
      console.error("Error fetching vendor details:", error);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [selectedCategory]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchVendors();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleEdit = () => {
    if (selectedVendor) {
      setEditingVendor(selectedVendor);
      setIsDetailOpen(false);
      setIsFormOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedVendor) return;
    if (!confirm(`Delete "${selectedVendor.name}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/vendors/${selectedVendor.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setIsDetailOpen(false);
        setSelectedVendor(null);
        fetchVendors();
      }
    } catch (error) {
      console.error("Error deleting vendor:", error);
    }
  };

  const actions = (
    <Button
      onClick={() => {
        setEditingVendor(null);
        setIsFormOpen(true);
      }}
    >
      <Plus className="h-4 w-4 mr-2" />
      Add Vendor
    </Button>
  );

  return (
    <AppLayout title="Vendors" actions={actions}>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.value)}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">
            Loading vendors...
          </p>
        ) : vendors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory
                  ? "No vendors found matching your filters."
                  : "No vendors yet. Add your first vendor to keep track of service providers."}
              </p>
              {!searchQuery && !selectedCategory && (
                <Button
                  onClick={() => {
                    setEditingVendor(null);
                    setIsFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Vendor
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                onClick={() => fetchVendorDetails(vendor.id)}
              />
            ))}
          </div>
        )}
      </div>

      <VendorForm
        vendor={editingVendor || undefined}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => {
          fetchVendors();
        }}
      />

      <VendorDetail
        vendor={selectedVendor}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </AppLayout>
  );
}
