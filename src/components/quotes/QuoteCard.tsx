"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuoteWithVendor } from "@/types";
import { Calendar, Wrench } from "lucide-react";
import { format, parseISO } from "date-fns";

interface QuoteCardProps {
  quote: QuoteWithVendor;
  onClick?: () => void;
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  accepted: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function QuoteCard({ quote, onClick }: QuoteCardProps) {
  const statusColor = statusStyles[quote.status] || statusStyles.pending;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{quote.description}</h3>
            <div className="flex flex-wrap items-center gap-2">
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
          <div className="text-right shrink-0 ml-4">
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(quote.total)}
            </p>
          </div>
        </div>

        {/* Cost breakdown */}
        {(quote.labour || quote.materials || quote.other) && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
            {quote.labour != null && (
              <span>Labour: {formatCurrency(quote.labour)}</span>
            )}
            {quote.materials != null && (
              <span>Materials: {formatCurrency(quote.materials)}</span>
            )}
            {quote.other != null && (
              <span>Other: {formatCurrency(quote.other)}</span>
            )}
          </div>
        )}

        {quote.receivedDate && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Received {format(parseISO(quote.receivedDate), "d MMM yyyy")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
