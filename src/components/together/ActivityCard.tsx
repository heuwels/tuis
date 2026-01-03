"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Sparkles,
  UtensilsCrossed,
  ChefHat,
  Film,
  Star,
  DollarSign,
  Clock,
} from "lucide-react";

export interface Activity {
  id: number;
  title: string;
  category: string;
  imageUrl: string | null;
  notes: string | null;
  status: string;
  completedDate: string | null;
  rating: number | null;
  url: string | null;
  location: string | null;
  estimatedCost: string | null;
  duration: string | null;
  season: string | null;
  priority: string | null;
  tags: string | null;
  review: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ActivityCardProps {
  activity: Activity;
  onClick?: () => void;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: typeof MapPin; color: string }
> = {
  location: {
    label: "Location",
    icon: MapPin,
    color: "bg-blue-100 text-blue-700",
  },
  activity: {
    label: "Activity",
    icon: Sparkles,
    color: "bg-purple-100 text-purple-700",
  },
  restaurant: {
    label: "Restaurant",
    icon: UtensilsCrossed,
    color: "bg-orange-100 text-orange-700",
  },
  dish: {
    label: "Dish",
    icon: ChefHat,
    color: "bg-green-100 text-green-700",
  },
  film: {
    label: "Film/Show",
    icon: Film,
    color: "bg-pink-100 text-pink-700",
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  wishlist: { label: "Wishlist", color: "bg-gray-100 text-gray-700" },
  planned: { label: "Planned", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
};

const COST_LABELS: Record<string, string> = {
  low: "$",
  medium: "$$",
  high: "$$$",
  splurge: "$$$$",
};

const DURATION_LABELS: Record<string, string> = {
  quick: "Quick",
  "half-day": "Half day",
  "full-day": "Full day",
  weekend: "Weekend",
  "week+": "Week+",
};

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const categoryConfig = CATEGORY_CONFIG[activity.category] || {
    label: activity.category,
    icon: Sparkles,
    color: "bg-gray-100 text-gray-700",
  };
  const statusConfig = STATUS_CONFIG[activity.status] || STATUS_CONFIG.wishlist;
  const CategoryIcon = categoryConfig.icon;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
      onClick={onClick}
    >
      {activity.imageUrl && (
        <div className="aspect-video relative bg-gray-100">
          <img
            src={activity.imageUrl}
            alt={activity.title}
            className="object-cover w-full h-full"
          />
        </div>
      )}
      <CardContent className={activity.imageUrl ? "pt-3" : "pt-4"}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-lg line-clamp-1">{activity.title}</h3>
          {activity.rating && (
            <div className="flex items-center gap-0.5 text-yellow-500 shrink-0">
              {Array.from({ length: activity.rating }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-current" />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge className={categoryConfig.color} variant="secondary">
            <CategoryIcon className="h-3 w-3" />
            {categoryConfig.label}
          </Badge>
          <Badge className={statusConfig.color} variant="secondary">
            {statusConfig.label}
          </Badge>
        </div>

        {activity.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {activity.notes}
          </p>
        )}

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {activity.estimatedCost && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span>{COST_LABELS[activity.estimatedCost] || activity.estimatedCost}</span>
            </div>
          )}
          {activity.duration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{DURATION_LABELS[activity.duration] || activity.duration}</span>
            </div>
          )}
          {activity.location && (
            <div className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{activity.location}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
