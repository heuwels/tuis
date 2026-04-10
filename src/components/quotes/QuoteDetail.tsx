"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuoteWithVendor } from "@/types";
import {
  FileText,
  Wrench,
  Calendar,
  DollarSign,
  Pencil,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface QuoteDetailProps {
  quote: QuoteWithVendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
}

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
    maximumFractionDigits: 2,
  }).format(amount);
}

export function QuoteDetail({
  quote,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onStatusChange,
}: QuoteDetailProps) {
  if (!quote) return null;

  const statusColor = statusStyles[quote.status] || statusStyles.pending;
  const hasBreakdown = quote.labour != null || quote.materials != null || quote.other != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">{quote.description}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={statusColor}>
                  {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                </Badge>
                {quote.vendorName && (
                  <Badge variant="outline" className="gap-1">
                    <Wrench className="h-3 w-3" />
                    {quote.vendorName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Total */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
            <p className="text-3xl font-bold">{formatCurrency(quote.total)}</p>
          </div>

          {/* Cost Breakdown */}
          {hasBreakdown && (
            <div>
              <h4 className="font-medium mb-2">Cost Breakdown</h4>
              <div className="grid grid-cols-3 gap-3">
                {quote.labour != null && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Labour</p>
                    <p className="text-lg font-semibold">{formatCurrency(quote.labour)}</p>
                  </div>
                )}
                {quote.materials != null && (
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Materials</p>
                    <p className="text-lg font-semibold">{formatCurrency(quote.materials)}</p>
                  </div>
                )}
                {quote.other != null && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Other</p>
                    <p className="text-lg font-semibold">{formatCurrency(quote.other)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Date */}
          {quote.receivedDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Received {format(parseISO(quote.receivedDate), "d MMMM yyyy")}
            </div>
          )}

          {/* Notes */}
          {quote.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm bg-gray-50 rounded-lg p-3">{quote.notes}</p>
            </div>
          )}

          {/* Quick status change */}
          {quote.status === "pending" && onStatusChange && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-green-700 border-green-200 hover:bg-green-50"
                onClick={() => onStatusChange("accepted")}
              >
                Accept Quote
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-red-700 border-red-200 hover:bg-red-50"
                onClick={() => onStatusChange("rejected")}
              >
                Reject Quote
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {onDelete && (
              <Button variant="outline" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            {onEdit && (
              <Button size="sm" onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
