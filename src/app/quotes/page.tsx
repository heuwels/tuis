"use client";

import { useEffect, useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Wrench } from "lucide-react";
import { QuoteForm } from "@/components/quotes/QuoteForm";
import { QuoteDetail } from "@/components/quotes/QuoteDetail";
import { BudgetCard } from "@/components/quotes/BudgetCard";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuoteWithVendor } from "@/types";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  archived: "bg-gray-100 text-gray-600",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteWithVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuoteWithVendor | null>(null);
  const [editingQuote, setEditingQuote] = useState<QuoteWithVendor | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchQuotes = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedStatus) params.set("status", selectedStatus);
      const url = `/api/quotes${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        setQuotes(await response.json());
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [selectedStatus]);

  const pendingTotal = useMemo(
    () =>
      quotes
        .filter((q) => q.status === "pending")
        .reduce((sum, q) => sum + q.total, 0),
    [quotes]
  );

  const handleView = (quote: QuoteWithVendor) => {
    setSelectedQuote(quote);
    setIsDetailOpen(true);
  };

  const handleEdit = () => {
    if (selectedQuote) {
      setEditingQuote(selectedQuote);
      setIsDetailOpen(false);
      setIsFormOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedQuote) return;
    if (!confirm(`Delete this quote from "${selectedQuote.vendorName || "unknown vendor"}"? This cannot be undone.`))
      return;

    try {
      const response = await fetch(`/api/quotes/${selectedQuote.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setIsDetailOpen(false);
        setSelectedQuote(null);
        fetchQuotes();
      }
    } catch (error) {
      console.error("Error deleting quote:", error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedQuote) return;
    try {
      const response = await fetch(`/api/quotes/${selectedQuote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        setIsDetailOpen(false);
        setSelectedQuote(null);
        fetchQuotes();
      }
    } catch (error) {
      console.error("Error updating quote status:", error);
    }
  };

  const actions = (
    <Button
      onClick={() => {
        setEditingQuote(null);
        setIsFormOpen(true);
      }}
    >
      <Plus className="h-4 w-4 mr-2" />
      Add Quote
    </Button>
  );

  return (
    <AppLayout title="Quotes" actions={actions}>
      <div className="space-y-4">
        {/* Budget card */}
        <BudgetCard quotesTotal={pendingTotal} />

        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={selectedStatus === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedStatus(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">
            Loading quotes...
          </p>
        ) : quotes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {selectedStatus
                  ? "No quotes with this status."
                  : "No quotes yet. Add your first quote to track vendor pricing."}
              </p>
              {!selectedStatus && (
                <Button
                  onClick={() => {
                    setEditingQuote(null);
                    setIsFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Quote
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <QuotesTable quotes={quotes} onRowClick={handleView} />
        )}
      </div>

      <QuoteForm
        quote={editingQuote || undefined}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={fetchQuotes}
      />

      <QuoteDetail
        quote={selectedQuote}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />
    </AppLayout>
  );
}

// MARK: - Quotes Table

function QuotesTable({
  quotes,
  onRowClick,
}: {
  quotes: QuoteWithVendor[];
  onRowClick: (quote: QuoteWithVendor) => void;
}) {
  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Desktop header */}
      <div className="hidden md:grid md:grid-cols-[1fr_140px_120px_100px_100px] gap-2 px-4 py-2 bg-gray-50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <span>Description</span>
        <span>Vendor</span>
        <span className="text-right">Total</span>
        <span>Status</span>
        <span>Date</span>
      </div>

      <div className="divide-y">
        {quotes.map((quote) => (
          <div
            key={quote.id}
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => onRowClick(quote)}
          >
            {/* Desktop row */}
            <div className="hidden md:grid md:grid-cols-[1fr_140px_120px_100px_100px] gap-2 px-4 py-3 items-center">
              <div>
                <span className="font-medium text-gray-900">{quote.description}</span>
                {(quote.labour != null || quote.materials != null) && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {[
                      quote.labour != null && `L: ${formatCurrency(quote.labour)}`,
                      quote.materials != null && `M: ${formatCurrency(quote.materials)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </div>
              <span className="text-sm text-muted-foreground truncate">
                {quote.vendorName || "—"}
              </span>
              <span className="text-sm font-semibold text-right">
                {formatCurrency(quote.total)}
              </span>
              <Badge variant="secondary" className={`w-fit text-xs ${statusStyles[quote.status] || ""}`}>
                {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {quote.receivedDate
                  ? format(parseISO(quote.receivedDate), "d MMM yy")
                  : "—"}
              </span>
            </div>

            {/* Mobile row */}
            <div className="md:hidden px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{quote.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {quote.vendorName && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        {quote.vendorName}
                      </span>
                    )}
                    {quote.receivedDate && (
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(quote.receivedDate), "d MMM")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold">{formatCurrency(quote.total)}</p>
                  <Badge variant="secondary" className={`text-xs mt-1 ${statusStyles[quote.status] || ""}`}>
                    {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
