"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vehicle } from "@/types";
import { Car, Gauge, Calendar, AlertTriangle } from "lucide-react";
import { format, parseISO, isPast, isBefore, addDays } from "date-fns";

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick?: () => void;
}

function RegoStatus({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return null;

  const expiry = parseISO(expiryDate);
  const now = new Date();
  const soonThreshold = addDays(now, 30);

  if (isPast(expiry)) {
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-800">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Rego expired
      </Badge>
    );
  }

  if (isBefore(expiry, soonThreshold)) {
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Rego due {format(expiry, "d MMM")}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="bg-green-100 text-green-800">
      Rego {format(expiry, "MMM yyyy")}
    </Badge>
  );
}

export function VehicleCard({ vehicle, onClick }: VehicleCardProps) {
  const subtitle = [vehicle.make, vehicle.model, vehicle.year]
    .filter(Boolean)
    .join(" ");

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Car className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{vehicle.name}</h3>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {vehicle.colour && (
            <Badge variant="secondary" className="bg-gray-100 text-gray-800">
              {vehicle.colour}
            </Badge>
          )}
          <RegoStatus expiryDate={vehicle.regoExpiry} />
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {vehicle.regoNumber && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {vehicle.regoNumber}
              {vehicle.regoState && ` (${vehicle.regoState})`}
            </span>
          )}
          {vehicle.currentOdometer && (
            <span className="flex items-center gap-1">
              <Gauge className="h-4 w-4" />
              {vehicle.currentOdometer.toLocaleString()} km
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
