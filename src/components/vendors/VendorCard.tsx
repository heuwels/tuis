"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vendor } from "@/types";
import { Wrench, Phone, Mail, Globe, Star } from "lucide-react";
import { vendorCategoryColors, areaColorFallback } from "@/lib/area-colors";

interface VendorCardProps {
  vendor: Vendor;
  onClick?: () => void;
}


function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300 dark:text-gray-600"
          }`}
        />
      ))}
    </div>
  );
}

export function VendorCard({ vendor, onClick }: VendorCardProps) {
  const categoryColor =
    vendorCategoryColors[vendor.category || ""] || areaColorFallback;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950 rounded-lg">
              <Wrench className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{vendor.name}</h3>
              <StarRating rating={vendor.rating} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {vendor.category && (
            <Badge variant="secondary" className={categoryColor}>
              {vendor.category}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {vendor.phone && (
            <a
              href={`tel:${vendor.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
            >
              <Phone className="h-4 w-4" />
              {vendor.phone}
            </a>
          )}
          {vendor.email && (
            <a
              href={`mailto:${vendor.email}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
            >
              <Mail className="h-4 w-4" />
              Email
            </a>
          )}
          {vendor.website && (
            <a
              href={vendor.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
            >
              <Globe className="h-4 w-4" />
              Website
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
