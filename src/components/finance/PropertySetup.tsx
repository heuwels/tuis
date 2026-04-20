"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Home, Plus } from "lucide-react";
import { Property } from "@/types";

interface PropertySetupProps {
  onPropertyCreated: (id: number) => void;
  property?: Property;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PropertySetup({
  onPropertyCreated,
  property,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: PropertySetupProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen;

  const [address, setAddress] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [loanAmountOriginal, setLoanAmountOriginal] = useState("");
  const [loanTermYears, setLoanTermYears] = useState("");
  const [lender, setLender] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (property) {
      setAddress(property.address);
      setPurchasePrice(property.purchasePrice.toString());
      setPurchaseDate(property.purchaseDate);
      setLoanAmountOriginal(property.loanAmountOriginal.toString());
      setLoanTermYears(property.loanTermYears?.toString() ?? "");
      setLender(property.lender ?? "");
      setNotes(property.notes ?? "");
    } else {
      setAddress("");
      setPurchasePrice("");
      setPurchaseDate("");
      setLoanAmountOriginal("");
      setLoanTermYears("");
      setLender("");
      setNotes("");
    }
  }, [property, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || !purchasePrice || !purchaseDate || !loanAmountOriginal)
      return;
    setIsSaving(true);

    try {
      const url = property
        ? `/api/finance/properties/${property.id}`
        : "/api/finance/properties";
      const method = property ? "PUT" : "POST";

      const body = {
        address: address.trim(),
        purchasePrice: parseFloat(purchasePrice),
        purchaseDate,
        loanAmountOriginal: parseFloat(loanAmountOriginal),
        loanTermYears: loanTermYears ? parseInt(loanTermYears) : null,
        lender: lender.trim() || null,
        notes: notes.trim() || null,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        onOpenChange(false);
        onPropertyCreated(property ? property.id : Number(data.id));
      }
    } catch (error) {
      console.error("Error saving property:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // If controlled (edit mode), render dialog only
  if (controlledOpen !== undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {property ? "Edit Property" : "Add Property"}
            </DialogTitle>
          </DialogHeader>
          <PropertyForm
            address={address}
            setAddress={setAddress}
            purchasePrice={purchasePrice}
            setPurchasePrice={setPurchasePrice}
            purchaseDate={purchaseDate}
            setPurchaseDate={setPurchaseDate}
            loanAmountOriginal={loanAmountOriginal}
            setLoanAmountOriginal={setLoanAmountOriginal}
            loanTermYears={loanTermYears}
            setLoanTermYears={setLoanTermYears}
            lender={lender}
            setLender={setLender}
            notes={notes}
            setNotes={setNotes}
            isSaving={isSaving}
            isEdit={!!property}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // No property — show setup card
  return (
    <>
      <Card>
        <CardContent className="py-12 text-center">
          <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Set up your property to start tracking home equity, mortgage
            payments, and valuations.
          </p>
          <Button onClick={() => onOpenChange(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Property</DialogTitle>
          </DialogHeader>
          <PropertyForm
            address={address}
            setAddress={setAddress}
            purchasePrice={purchasePrice}
            setPurchasePrice={setPurchasePrice}
            purchaseDate={purchaseDate}
            setPurchaseDate={setPurchaseDate}
            loanAmountOriginal={loanAmountOriginal}
            setLoanAmountOriginal={setLoanAmountOriginal}
            loanTermYears={loanTermYears}
            setLoanTermYears={setLoanTermYears}
            lender={lender}
            setLender={setLender}
            notes={notes}
            setNotes={setNotes}
            isSaving={isSaving}
            isEdit={false}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function PropertyForm({
  address,
  setAddress,
  purchasePrice,
  setPurchasePrice,
  purchaseDate,
  setPurchaseDate,
  loanAmountOriginal,
  setLoanAmountOriginal,
  loanTermYears,
  setLoanTermYears,
  lender,
  setLender,
  notes,
  setNotes,
  isSaving,
  isEdit,
  onSubmit,
  onCancel,
}: {
  address: string;
  setAddress: (v: string) => void;
  purchasePrice: string;
  setPurchasePrice: (v: string) => void;
  purchaseDate: string;
  setPurchaseDate: (v: string) => void;
  loanAmountOriginal: string;
  setLoanAmountOriginal: (v: string) => void;
  loanTermYears: string;
  setLoanTermYears: (v: string) => void;
  lender: string;
  setLender: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  isSaving: boolean;
  isEdit: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Example St, Suburb"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="purchasePrice">Purchase Price ($) *</Label>
          <Input
            id="purchasePrice"
            type="number"
            step="1"
            min="0"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            placeholder="500000"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchaseDate">Purchase Date *</Label>
          <Input
            id="purchaseDate"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="loanAmountOriginal">Original Loan Amount ($) *</Label>
          <Input
            id="loanAmountOriginal"
            type="number"
            step="1"
            min="0"
            value={loanAmountOriginal}
            onChange={(e) => setLoanAmountOriginal(e.target.value)}
            placeholder="400000"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="loanTermYears">Loan Term (years)</Label>
          <Input
            id="loanTermYears"
            type="number"
            min="1"
            max="50"
            value={loanTermYears}
            onChange={(e) => setLoanTermYears(e.target.value)}
            placeholder="30"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lender">Lender</Label>
        <Input
          id="lender"
          value={lender}
          onChange={(e) => setLender(e.target.value)}
          placeholder="e.g., Commonwealth Bank"
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
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            isSaving ||
            !address.trim() ||
            !purchasePrice ||
            !purchaseDate ||
            !loanAmountOriginal
          }
        >
          {isSaving
            ? "Saving..."
            : isEdit
              ? "Save Changes"
              : "Add Property"}
        </Button>
      </div>
    </form>
  );
}
