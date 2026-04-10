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
import { QuoteWithVendor, Vendor } from "@/types";

interface QuoteFormProps {
  quote?: QuoteWithVendor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];

export function QuoteForm({
  quote,
  open,
  onOpenChange,
  onSuccess,
}: QuoteFormProps) {
  const [description, setDescription] = useState("");
  const [vendorId, setVendorId] = useState<string>("none");
  const [total, setTotal] = useState("");
  const [labour, setLabour] = useState("");
  const [materials, setMaterials] = useState("");
  const [other, setOther] = useState("");
  const [status, setStatus] = useState("pending");
  const [receivedDate, setReceivedDate] = useState("");
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
    if (quote) {
      setDescription(quote.description);
      setVendorId(quote.vendorId?.toString() || "none");
      setTotal(quote.total.toString());
      setLabour(quote.labour?.toString() || "");
      setMaterials(quote.materials?.toString() || "");
      setOther(quote.other?.toString() || "");
      setStatus(quote.status);
      setReceivedDate(quote.receivedDate || "");
      setNotes(quote.notes || "");
    } else {
      setDescription("");
      setVendorId("none");
      setTotal("");
      setLabour("");
      setMaterials("");
      setOther("");
      setStatus("pending");
      setReceivedDate(new Date().toISOString().split("T")[0]);
      setNotes("");
    }
  }, [quote, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !total) return;
    setIsSaving(true);

    try {
      const url = quote ? `/api/quotes/${quote.id}` : "/api/quotes";
      const method = quote ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        description,
        vendorId: vendorId && vendorId !== "none" ? parseInt(vendorId) : null,
        total: parseFloat(total),
        status,
        receivedDate: receivedDate || null,
        notes: notes || null,
      };

      if (labour) body.labour = parseFloat(labour);
      if (materials) body.materials = parseFloat(materials);
      if (other) body.other = parseFloat(other);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        onOpenChange(false);
        onSuccess();
      } else {
        const err = await response.json().catch(() => null);
        console.error("Quote save failed:", response.status, err);
      }
    } catch (error) {
      console.error("Error saving quote:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{quote ? "Edit Quote" : "Add Quote"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Bathroom renovation, Fence repair"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total">Total Amount ($) *</Label>
            <Input
              id="total"
              type="number"
              step="0.01"
              min="0"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="labour">Labour ($)</Label>
              <Input
                id="labour"
                type="number"
                step="0.01"
                min="0"
                value={labour}
                onChange={(e) => setLabour(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="materials">Materials ($)</Label>
              <Input
                id="materials"
                type="number"
                step="0.01"
                min="0"
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="other">Other ($)</Label>
              <Input
                id="other"
                type="number"
                step="0.01"
                min="0"
                value={other}
                onChange={(e) => setOther(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receivedDate">Date Received</Label>
            <Input
              id="receivedDate"
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
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
            <Button type="submit" disabled={isSaving || !description.trim() || !total}>
              {isSaving ? "Saving..." : quote ? "Save Changes" : "Add Quote"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
