"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  Sparkles,
  UtensilsCrossed,
  ChefHat,
  Film,
  Star,
  DollarSign,
  Clock,
  Calendar,
  ExternalLink,
  Pencil,
  Trash2,
  Leaf,
  Flag,
} from "lucide-react";
import { Activity } from "./ActivityCard";
import { activityCategoryColors, activityStatusColors } from "@/lib/area-colors";

interface ActivityDetailProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
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
  low: "$ - Budget friendly",
  medium: "$$ - Moderate",
  high: "$$$ - Expensive",
  splurge: "$$$$ - Splurge",
};

const DURATION_LABELS: Record<string, string> = {
  quick: "Quick (< 2 hours)",
  "half-day": "Half day",
  "full-day": "Full day",
  weekend: "Weekend",
  "week+": "Week or more",
};

const SEASON_LABELS: Record<string, string> = {
  any: "Any time",
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low priority",
  medium: "Medium priority",
  high: "High priority",
};

export function ActivityDetail({
  activity,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ActivityDetailProps) {
  if (!activity) return null;

  const categoryConfig = CATEGORY_CONFIG[activity.category] || {
    label: activity.category,
    icon: Sparkles,
    color: "bg-gray-100 text-gray-700",
  };
  const statusConfig = STATUS_CONFIG[activity.status] || STATUS_CONFIG.wishlist;
  const CategoryIcon = categoryConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{activity.title}</DialogTitle>
        </DialogHeader>

        {activity.imageUrl && (
          <div className="aspect-video relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden -mx-6">
            <Image
              src={activity.imageUrl}
              alt={activity.title}
              className="object-cover"
              fill
              unoptimized
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge className={activityCategoryColors[activity.category] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"} variant="secondary">
            <CategoryIcon className="h-3 w-3" />
            {categoryConfig.label}
          </Badge>
          <Badge className={activityStatusColors[activity.status] || activityStatusColors.wishlist} variant="secondary">
            {statusConfig.label}
          </Badge>
          {activity.priority && activity.priority !== "medium" && (
            <Badge variant="outline" className="gap-1">
              <Flag className="h-3 w-3" />
              {PRIORITY_LABELS[activity.priority] || activity.priority}
            </Badge>
          )}
        </div>

        {activity.rating && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rating:</span>
            <div className="flex items-center gap-0.5 text-yellow-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < activity.rating! ? "fill-current" : "stroke-current fill-none"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {activity.notes && (
          <div>
            <h3 className="font-semibold mb-1">Notes</h3>
            <p className="text-muted-foreground">{activity.notes}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          {activity.location && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <span className="font-medium">Location</span>
                <p className="text-muted-foreground">{activity.location}</p>
              </div>
            </div>
          )}

          {activity.estimatedCost && (
            <div className="flex items-start gap-2">
              <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <span className="font-medium">Estimated Cost</span>
                <p className="text-muted-foreground">
                  {COST_LABELS[activity.estimatedCost] || activity.estimatedCost}
                </p>
              </div>
            </div>
          )}

          {activity.duration && (
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <span className="font-medium">Duration</span>
                <p className="text-muted-foreground">
                  {DURATION_LABELS[activity.duration] || activity.duration}
                </p>
              </div>
            </div>
          )}

          {activity.season && (
            <div className="flex items-start gap-2">
              <Leaf className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <span className="font-medium">Best Season</span>
                <p className="text-muted-foreground">
                  {SEASON_LABELS[activity.season] || activity.season}
                </p>
              </div>
            </div>
          )}

          {activity.completedDate && (
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <span className="font-medium">Completed</span>
                <p className="text-muted-foreground">
                  {new Date(activity.completedDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {activity.url && (
          <div>
            <a
              href={activity.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              Visit Link
            </a>
          </div>
        )}

        {activity.review && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-1">Review / Reflection</h3>
            <div className="prose prose-sm max-w-none text-muted-foreground">
              {activity.review.split("\n").map((line, i) => (
                <p key={i} className="mb-2">
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 hover:text-red-700"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
