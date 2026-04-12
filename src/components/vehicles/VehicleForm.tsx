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
import { Vehicle } from "@/types";

interface VehicleFormProps {
  vehicle?: Vehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

export function VehicleForm({
  vehicle,
  open,
  onOpenChange,
  onSuccess,
}: VehicleFormProps) {
  const [name, setName] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [colour, setColour] = useState("");
  const [regoNumber, setRegoNumber] = useState("");
  const [regoState, setRegoState] = useState("");
  const [vin, setVin] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentOdometer, setCurrentOdometer] = useState("");
  const [regoExpiry, setRegoExpiry] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState("");
  const [warrantyExpiryKm, setWarrantyExpiryKm] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setName(vehicle.name);
      setMake(vehicle.make || "");
      setModel(vehicle.model || "");
      setYear(vehicle.year?.toString() || "");
      setColour(vehicle.colour || "");
      setRegoNumber(vehicle.regoNumber || "");
      setRegoState(vehicle.regoState || "");
      setVin(vehicle.vin || "");
      setPurchaseDate(vehicle.purchaseDate || "");
      setPurchasePrice(vehicle.purchasePrice?.toString() || "");
      setCurrentOdometer(vehicle.currentOdometer?.toString() || "");
      setRegoExpiry(vehicle.regoExpiry || "");
      setInsuranceProvider(vehicle.insuranceProvider || "");
      setInsuranceExpiry(vehicle.insuranceExpiry || "");
      setWarrantyExpiryDate(vehicle.warrantyExpiryDate || "");
      setWarrantyExpiryKm(vehicle.warrantyExpiryKm?.toString() || "");
      setNotes(vehicle.notes || "");
    } else {
      setName("");
      setMake("");
      setModel("");
      setYear("");
      setColour("");
      setRegoNumber("");
      setRegoState("");
      setVin("");
      setPurchaseDate("");
      setPurchasePrice("");
      setCurrentOdometer("");
      setRegoExpiry("");
      setInsuranceProvider("");
      setInsuranceExpiry("");
      setWarrantyExpiryDate("");
      setWarrantyExpiryKm("");
      setNotes("");
    }
  }, [vehicle, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = vehicle ? `/api/vehicles/${vehicle.id}` : "/api/vehicles";
      const method = vehicle ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          make: make || null,
          model: model || null,
          year: year ? parseInt(year) : null,
          colour: colour || null,
          regoNumber: regoNumber || null,
          regoState: regoState || null,
          vin: vin || null,
          purchaseDate: purchaseDate || null,
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
          currentOdometer: currentOdometer ? parseInt(currentOdometer) : null,
          regoExpiry: regoExpiry || null,
          insuranceProvider: insuranceProvider || null,
          insuranceExpiry: insuranceExpiry || null,
          warrantyExpiryDate: warrantyExpiryDate || null,
          warrantyExpiryKm: warrantyExpiryKm ? parseInt(warrantyExpiryKm) : null,
          notes: notes || null,
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        onSuccess();
      }
    } catch (error) {
      console.error("Error saving vehicle:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vehicle ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Family Car"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Input
                id="make"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="e.g., Toyota"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., Corolla"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g., 2022"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="colour">Colour</Label>
              <Input
                id="colour"
                value={colour}
                onChange={(e) => setColour(e.target.value)}
                placeholder="e.g., Silver"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="Vehicle identification number"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="regoNumber">Rego Number</Label>
              <Input
                id="regoNumber"
                value={regoNumber}
                onChange={(e) => setRegoNumber(e.target.value)}
                placeholder="e.g., ABC123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regoState">State</Label>
              <Select value={regoState} onValueChange={setRegoState}>
                <SelectTrigger>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="regoExpiry">Rego Expiry</Label>
              <Input
                id="regoExpiry"
                type="date"
                value={regoExpiry}
                onChange={(e) => setRegoExpiry(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentOdometer">Current Odometer (km)</Label>
              <Input
                id="currentOdometer"
                type="number"
                value={currentOdometer}
                onChange={(e) => setCurrentOdometer(e.target.value)}
                placeholder="e.g., 45000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="e.g., 35000"
              />
            </div>
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
              <Label htmlFor="insuranceProvider">Insurance Provider</Label>
              <Input
                id="insuranceProvider"
                value={insuranceProvider}
                onChange={(e) => setInsuranceProvider(e.target.value)}
                placeholder="e.g., RACV"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="insuranceExpiry">Insurance Expiry</Label>
              <Input
                id="insuranceExpiry"
                type="date"
                value={insuranceExpiry}
                onChange={(e) => setInsuranceExpiry(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warrantyExpiryDate">Warranty Expiry</Label>
              <Input
                id="warrantyExpiryDate"
                type="date"
                value={warrantyExpiryDate}
                onChange={(e) => setWarrantyExpiryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warrantyExpiryKm">Warranty km</Label>
              <Input
                id="warrantyExpiryKm"
                type="number"
                value={warrantyExpiryKm}
                onChange={(e) => setWarrantyExpiryKm(e.target.value)}
                placeholder="e.g., 100000"
              />
            </div>
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
              {isSaving ? "Saving..." : vehicle ? "Save Changes" : "Add Vehicle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
