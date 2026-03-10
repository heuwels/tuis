"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Appliance } from "@/types";

interface ApplianceFormProps {
  appliance?: Appliance;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const LOCATIONS = [
  "Kitchen",
  "Bathroom",
  "Laundry",
  "Garage",
  "Bedroom",
  "Living Room",
  "Office",
  "Basement",
  "Outdoor",
  "Other",
];

export function ApplianceForm({
  appliance,
  open,
  onOpenChange,
  onSuccess,
}: ApplianceFormProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [warrantyExpiry, setWarrantyExpiry] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [warrantyDocUrl, setWarrantyDocUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (appliance) {
      setName(appliance.name);
      setLocation(appliance.location || "");
      setBrand(appliance.brand || "");
      setModel(appliance.model || "");
      setPurchaseDate(appliance.purchaseDate || "");
      setWarrantyExpiry(appliance.warrantyExpiry || "");
      setManualUrl(appliance.manualUrl || "");
      setWarrantyDocUrl(appliance.warrantyDocUrl || "");
      setNotes(appliance.notes || "");
    } else {
      setName("");
      setLocation("");
      setBrand("");
      setModel("");
      setPurchaseDate("");
      setWarrantyExpiry("");
      setManualUrl("");
      setWarrantyDocUrl("");
      setNotes("");
    }
  }, [appliance, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = appliance
        ? `/api/appliances/${appliance.id}`
        : "/api/appliances";
      const method = appliance ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          location: location || null,
          brand: brand || null,
          model: model || null,
          purchaseDate: purchaseDate || null,
          warrantyExpiry: warrantyExpiry || null,
          manualUrl: manualUrl || null,
          warrantyDocUrl: warrantyDocUrl || null,
          notes: notes || null,
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        onSuccess();
      }
    } catch (error) {
      console.error("Error saving appliance:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appliance ? "Edit Appliance" : "Add Appliance"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Refrigerator, Dishwasher"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Samsung, LG"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Model number"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
              <Input
                id="warrantyExpiry"
                type="date"
                value={warrantyExpiry}
                onChange={(e) => setWarrantyExpiry(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manualUrl">Manual URL</Label>
            <Input
              id="manualUrl"
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warrantyDocUrl">Warranty Document URL</Label>
            <Input
              id="warrantyDocUrl"
              type="url"
              value={warrantyDocUrl}
              onChange={(e) => setWarrantyDocUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
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
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : appliance ? "Save Changes" : "Add Appliance"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
