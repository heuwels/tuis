"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Appliance } from "@/types";
import { Refrigerator, FileText, Shield, MapPin } from "lucide-react";
import { format, parseISO, isPast, isFuture, addMonths } from "date-fns";

interface ApplianceCardProps {
  appliance: Appliance;
  onClick?: () => void;
}

const locationColors: Record<string, string> = {
  Kitchen: "bg-orange-100 text-orange-800",
  Bathroom: "bg-blue-100 text-blue-800",
  Laundry: "bg-cyan-100 text-cyan-800",
  Garage: "bg-stone-100 text-stone-800",
  Bedroom: "bg-pink-100 text-pink-800",
  "Living Room": "bg-yellow-100 text-yellow-800",
  Office: "bg-indigo-100 text-indigo-800",
  Basement: "bg-gray-100 text-gray-800",
  Outdoor: "bg-green-100 text-green-800",
};

function getWarrantyStatus(warrantyExpiry: string | null) {
  if (!warrantyExpiry) return null;

  const expiryDate = parseISO(warrantyExpiry);
  const now = new Date();
  const threeMonthsFromNow = addMonths(now, 3);

  if (isPast(expiryDate)) {
    return { label: "Expired", color: "bg-gray-100 text-gray-600" };
  } else if (isFuture(threeMonthsFromNow) && expiryDate <= threeMonthsFromNow) {
    return { label: "Expiring Soon", color: "bg-amber-100 text-amber-800" };
  } else {
    return { label: "Active", color: "bg-green-100 text-green-800" };
  }
}

export function ApplianceCard({ appliance, onClick }: ApplianceCardProps) {
  const locationColor =
    locationColors[appliance.location || ""] || "bg-gray-100 text-gray-800";
  const warrantyStatus = getWarrantyStatus(appliance.warrantyExpiry);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Refrigerator className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{appliance.name}</h3>
              {(appliance.brand || appliance.model) && (
                <p className="text-sm text-muted-foreground">
                  {[appliance.brand, appliance.model].filter(Boolean).join(" - ")}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {appliance.location && (
            <Badge variant="secondary" className={locationColor}>
              <MapPin className="h-3 w-3 mr-1" />
              {appliance.location}
            </Badge>
          )}
          {warrantyStatus && (
            <Badge variant="secondary" className={warrantyStatus.color}>
              <Shield className="h-3 w-3 mr-1" />
              {warrantyStatus.label}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {appliance.manualUrl && (
            <a
              href={appliance.manualUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
            >
              <FileText className="h-4 w-4" />
              Manual
            </a>
          )}
          {appliance.warrantyDocUrl && (
            <a
              href={appliance.warrantyDocUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
            >
              <Shield className="h-4 w-4" />
              Warranty
            </a>
          )}
          {appliance.warrantyExpiry && (
            <span className="ml-auto">
              Warranty: {format(parseISO(appliance.warrantyExpiry), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
