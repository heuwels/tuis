"use client";

import { useEffect, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
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
import {
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  Percent,
  TrendingUp,
} from "lucide-react";
import {
  MortgagePayment,
  MortgageRate,
  PropertyValuation,
} from "@/types";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// MARK: - Payments Tab

export function PaymentsTab({ propertyId }: { propertyId: number | null }) {
  if (propertyId === null) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Set up your property on the Equity tab first to start tracking
            mortgage payments, rates, and valuations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <MortgagePaymentsSection propertyId={propertyId} />
      <RateHistorySection propertyId={propertyId} />
      <ValuationsSection propertyId={propertyId} />
    </div>
  );
}

// MARK: - Mortgage Payments Section

function MortgagePaymentsSection({ propertyId }: { propertyId: number }) {
  const [payments, setPayments] = useState<MortgagePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MortgagePayment | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/finance/properties/${propertyId}/payments`
      );
      if (res.ok) setPayments(await res.json());
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleDelete = async (payment: MortgagePayment) => {
    if (!window.confirm("Delete this payment? This cannot be undone.")) return;
    try {
      const res = await fetch(
        `/api/finance/properties/${propertyId}/payments/${payment.id}`,
        { method: "DELETE" }
      );
      if (res.ok) fetchPayments();
    } catch (error) {
      console.error("Error deleting payment:", error);
    }
  };

  const totals = payments.reduce(
    (acc, p) => ({
      payment: acc.payment + p.paymentAmount,
      interest: acc.interest + p.interestAmount,
      principal: acc.principal + p.principalAmount,
    }),
    { payment: 0, interest: 0, principal: 0 }
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Mortgage Payments</h3>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Payment
          </Button>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-4">Loading...</p>
        ) : payments.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No payments recorded yet.
          </p>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
            {/* Desktop header */}
            <div className="hidden md:grid md:grid-cols-[100px_1fr_1fr_1fr_80px] gap-2 px-4 py-2 bg-gray-50 dark:bg-zinc-800 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>Date</span>
              <span className="text-right">Payment</span>
              <span className="text-right">Interest</span>
              <span className="text-right">Principal</span>
              <span>Actions</span>
            </div>

            <div className="divide-y">
              {payments.map((p) => (
                <div key={p.id}>
                  {/* Desktop row */}
                  <div className="hidden md:grid md:grid-cols-[100px_1fr_1fr_1fr_80px] gap-2 px-4 py-3 items-center">
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(p.date), "d MMM yy")}
                    </span>
                    <span className="text-sm font-semibold text-right">
                      {formatCurrency(p.paymentAmount)}
                    </span>
                    <span className="text-sm text-right text-red-600 dark:text-red-400">
                      {formatCurrency(p.interestAmount)}
                    </span>
                    <span className="text-sm text-right text-blue-600 dark:text-blue-400">
                      {formatCurrency(p.principalAmount)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Mobile row */}
                  <div className="md:hidden px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {formatCurrency(p.paymentAmount)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(p.date), "d MMM yy")}
                          </span>
                          <span className="text-xs text-red-600 dark:text-red-400">
                            Int: {formatCurrency(p.interestAmount)}
                          </span>
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            Prin: {formatCurrency(p.principalAmount)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditing(p);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Totals row */}
              <div className="hidden md:grid md:grid-cols-[100px_1fr_1fr_1fr_80px] gap-2 px-4 py-2 bg-gray-50 dark:bg-zinc-800 text-xs font-semibold">
                <span>Totals</span>
                <span className="text-right">
                  {formatCurrency(totals.payment)}
                </span>
                <span className="text-right text-red-600 dark:text-red-400">
                  {formatCurrency(totals.interest)}
                </span>
                <span className="text-right text-blue-600 dark:text-blue-400">
                  {formatCurrency(totals.principal)}
                </span>
                <span />
              </div>
            </div>
          </div>
        )}

        <PaymentFormDialog
          propertyId={propertyId}
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditing(null);
          }}
          payment={editing}
          onSave={fetchPayments}
        />
      </CardContent>
    </Card>
  );
}

// MARK: - Payment Form Dialog

function PaymentFormDialog({
  propertyId,
  open,
  onOpenChange,
  payment,
  onSave,
}: {
  propertyId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: MortgagePayment | null;
  onSave: () => void;
}) {
  const [date, setDate] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [interestAmount, setInterestAmount] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (payment) {
      setDate(payment.date);
      setPaymentAmount(payment.paymentAmount.toString());
      setInterestAmount(payment.interestAmount.toString());
      setPrincipalAmount(payment.principalAmount.toString());
      setNotes(payment.notes ?? "");
    } else {
      setDate(new Date().toISOString().split("T")[0]);
      setPaymentAmount("");
      setInterestAmount("");
      setPrincipalAmount("");
      setNotes("");
    }
  }, [payment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !paymentAmount || !interestAmount || !principalAmount) return;
    setIsSaving(true);

    try {
      const url = payment
        ? `/api/finance/properties/${propertyId}/payments/${payment.id}`
        : `/api/finance/properties/${propertyId}/payments`;
      const method = payment ? "PUT" : "POST";

      const body = {
        date,
        paymentAmount: parseFloat(paymentAmount),
        interestAmount: parseFloat(interestAmount),
        principalAmount: parseFloat(principalAmount),
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
      }
    } catch (error) {
      console.error("Error saving payment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {payment ? "Edit Payment" : "Add Payment"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pay-date">Date *</Label>
            <Input
              id="pay-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Payment ($) *</Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-interest">Interest ($) *</Label>
              <Input
                id="pay-interest"
                type="number"
                step="0.01"
                min="0"
                value={interestAmount}
                onChange={(e) => setInterestAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-principal">Principal ($) *</Label>
              <Input
                id="pay-principal"
                type="number"
                step="0.01"
                min="0"
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay-notes">Notes</Label>
            <Textarea
              id="pay-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
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
                !date ||
                !paymentAmount ||
                !interestAmount ||
                !principalAmount
              }
            >
              {isSaving
                ? "Saving..."
                : payment
                  ? "Save Changes"
                  : "Add Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// MARK: - Rate History Section

function RateHistorySection({ propertyId }: { propertyId: number }) {
  const [rates, setRates] = useState<MortgageRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/finance/properties/${propertyId}/rates`
      );
      if (res.ok) setRates(await res.json());
    } catch (error) {
      console.error("Error fetching rates:", error);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Rate History</h3>
          </div>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Rate
          </Button>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-4">Loading...</p>
        ) : rates.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No rates recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {rates.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-zinc-800"
              >
                <div>
                  <span className="text-sm font-medium">
                    {(r.annualRate * 100).toFixed(2)}%
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    from {format(parseISO(r.effectiveDate), "d MMM yyyy")}
                  </span>
                </div>
                {r.notes && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {r.notes}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <RateFormDialog
          propertyId={propertyId}
          open={formOpen}
          onOpenChange={setFormOpen}
          onSave={fetchRates}
        />
      </CardContent>
    </Card>
  );
}

// MARK: - Rate Form Dialog

function RateFormDialog({
  propertyId,
  open,
  onOpenChange,
  onSave,
}: {
  propertyId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) {
  const [effectiveDate, setEffectiveDate] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEffectiveDate(new Date().toISOString().split("T")[0]);
      setAnnualRate("");
      setNotes("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveDate || !annualRate) return;
    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/finance/properties/${propertyId}/rates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            effectiveDate,
            annualRate: parseFloat(annualRate) / 100,
            notes: notes.trim() || null,
          }),
        }
      );

      if (response.ok) {
        onOpenChange(false);
        onSave();
      }
    } catch (error) {
      console.error("Error saving rate:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Rate</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate-date">Effective Date *</Label>
              <Input
                id="rate-date"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate-value">Annual Rate (%) *</Label>
              <Input
                id="rate-value"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={annualRate}
                onChange={(e) => setAnnualRate(e.target.value)}
                placeholder="5.99"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate-notes">Notes</Label>
            <Textarea
              id="rate-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
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
              disabled={isSaving || !effectiveDate || !annualRate}
            >
              {isSaving ? "Saving..." : "Add Rate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// MARK: - Valuations Section

function ValuationsSection({ propertyId }: { propertyId: number }) {
  const [valuations, setValuations] = useState<PropertyValuation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PropertyValuation | null>(null);

  const fetchValuations = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/finance/properties/${propertyId}/valuations`
      );
      if (res.ok) setValuations(await res.json());
    } catch (error) {
      console.error("Error fetching valuations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchValuations();
  }, [fetchValuations]);

  const handleDelete = async (v: PropertyValuation) => {
    if (!window.confirm("Delete this valuation? This cannot be undone."))
      return;
    try {
      const res = await fetch(
        `/api/finance/properties/${propertyId}/valuations/${v.id}`,
        { method: "DELETE" }
      );
      if (res.ok) fetchValuations();
    } catch (error) {
      console.error("Error deleting valuation:", error);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Valuations</h3>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Valuation
          </Button>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-4">Loading...</p>
        ) : valuations.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No valuations recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {valuations.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-zinc-800"
              >
                <div>
                  <span className="text-sm font-medium">
                    {formatCurrency(v.estimatedValue)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {format(parseISO(v.date), "d MMM yyyy")}
                  </span>
                  {v.source && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({v.source})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditing(v);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(v)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <ValuationFormDialog
          propertyId={propertyId}
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditing(null);
          }}
          valuation={editing}
          onSave={fetchValuations}
        />
      </CardContent>
    </Card>
  );
}

// MARK: - Valuation Form Dialog

function ValuationFormDialog({
  propertyId,
  open,
  onOpenChange,
  valuation,
  onSave,
}: {
  propertyId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  valuation: PropertyValuation | null;
  onSave: () => void;
}) {
  const [date, setDate] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (valuation) {
      setDate(valuation.date);
      setEstimatedValue(valuation.estimatedValue.toString());
      setSource(valuation.source ?? "");
      setNotes(valuation.notes ?? "");
    } else {
      setDate(new Date().toISOString().split("T")[0]);
      setEstimatedValue("");
      setSource("");
      setNotes("");
    }
  }, [valuation, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !estimatedValue) return;
    setIsSaving(true);

    try {
      const url = valuation
        ? `/api/finance/properties/${propertyId}/valuations/${valuation.id}`
        : `/api/finance/properties/${propertyId}/valuations`;
      const method = valuation ? "PUT" : "POST";

      const body = {
        date,
        estimatedValue: parseFloat(estimatedValue),
        source: source.trim() || null,
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
      }
    } catch (error) {
      console.error("Error saving valuation:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {valuation ? "Edit Valuation" : "Add Valuation"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="val-date">Date *</Label>
              <Input
                id="val-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="val-value">Estimated Value ($) *</Label>
              <Input
                id="val-value"
                type="number"
                step="1"
                min="0"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="550000"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="val-source">Source</Label>
            <Input
              id="val-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g., CoreLogic, Agent appraisal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="val-notes">Notes</Label>
            <Textarea
              id="val-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
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
              disabled={isSaving || !date || !estimatedValue}
            >
              {isSaving
                ? "Saving..."
                : valuation
                  ? "Save Changes"
                  : "Add Valuation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
