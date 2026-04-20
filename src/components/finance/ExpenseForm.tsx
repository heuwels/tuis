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
import { HouseholdExpenseWithVendor, Vendor } from "@/types";

const COMMON_CATEGORIES = [
  "Insurance",
  "Rates",
  "Utilities",
  "Repairs",
  "Garden",
  "Cleaning",
  "Internet",
  "Other",
];

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  expense?: HouseholdExpenseWithVendor;
}

export function ExpenseForm({
  open,
  onOpenChange,
  onSave,
  expense,
}: ExpenseFormProps) {
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vendorId, setVendorId] = useState<string>("none");
  const [notes, setNotes] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/vendors")
        .then((r) => (r.ok ? r.json() : []))
        .then(setVendors)
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (expense) {
      setDate(expense.date);
      setCategory(expense.category);
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setVendorId(expense.vendorId?.toString() || "none");
      setNotes(expense.notes || "");
    } else {
      setDate(new Date().toISOString().split("T")[0]);
      setCategory("");
      setDescription("");
      setAmount("");
      setVendorId("none");
      setNotes("");
    }
  }, [expense, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !date || !category.trim()) return;
    setIsSaving(true);

    try {
      const url = expense
        ? `/api/finance/expenses/${expense.id}`
        : "/api/finance/expenses";
      const method = expense ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        date,
        category: category.trim(),
        description: description.trim(),
        amount: parseFloat(amount),
        vendorId: vendorId && vendorId !== "none" ? parseInt(vendorId) : null,
        notes: notes.trim() || null,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        onOpenChange(false);
        onSave();
      } else {
        const err = await response.json().catch(() => null);
        console.error("Expense save failed:", response.status, err);
      }
    } catch (error) {
      console.error("Error saving expense:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {expense ? "Edit Expense" : "Add Expense"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                list="category-list"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Insurance, Rates"
                required
              />
              <datalist id="category-list">
                {COMMON_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Quarterly water bill, Lawn mowing"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.name}
                      {v.category ? ` (${v.category})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button
              type="submit"
              disabled={
                isSaving ||
                !description.trim() ||
                !amount ||
                !date ||
                !category.trim()
              }
            >
              {isSaving
                ? "Saving..."
                : expense
                  ? "Save Changes"
                  : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
