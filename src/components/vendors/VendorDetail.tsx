"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Vendor } from "@/types";
import {
  Wrench,
  Phone,
  Mail,
  Globe,
  Star,
  Pencil,
  Trash2,
  ExternalLink,
  DollarSign,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { vendorCategoryColors, areaColorFallback } from "@/lib/area-colors";

interface JobHistoryItem {
  id: number;
  taskId: number;
  taskName: string;
  completedAt: string;
  cost: string | null;
}

interface VendorWithDetails extends Vendor {
  jobHistory?: JobHistoryItem[];
}

interface VendorDetailProps {
  vendor: VendorWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}


function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-5 w-5 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300 dark:text-gray-600"
          }`}
        />
      ))}
      <span className="ml-2 text-sm text-muted-foreground">{rating}/5</span>
    </div>
  );
}

export function VendorDetail({
  vendor,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: VendorDetailProps) {
  if (!vendor) return null;

  const categoryColor =
    vendorCategoryColors[vendor.category || ""] || areaColorFallback;

  // Calculate total spent
  const totalSpent = vendor.jobHistory?.reduce((sum, job) => {
    if (job.cost) {
      const amount = parseFloat(job.cost.replace(/[^0-9.]/g, ""));
      return sum + (isNaN(amount) ? 0 : amount);
    }
    return sum;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950 rounded-lg">
                <Wrench className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">{vendor.name}</DialogTitle>
                <StarRating rating={vendor.rating} />
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Category Badge */}
          {vendor.category && (
            <Badge variant="secondary" className={categoryColor}>
              {vendor.category}
            </Badge>
          )}

          {/* Contact Info */}
          <div className="space-y-2">
            {vendor.phone && (
              <a
                href={`tel:${vendor.phone}`}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <Phone className="h-4 w-4" />
                {vendor.phone}
              </a>
            )}
            {vendor.email && (
              <a
                href={`mailto:${vendor.email}`}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <Mail className="h-4 w-4" />
                {vendor.email}
              </a>
            )}
            {vendor.website && (
              <a
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <Globe className="h-4 w-4" />
                Visit Website
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Notes */}
          {vendor.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm bg-gray-50 dark:bg-zinc-900 rounded-lg p-3">{vendor.notes}</p>
            </div>
          )}

          {/* Job History */}
          {vendor.jobHistory && vendor.jobHistory.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Job History</h4>
                {totalSpent !== undefined && totalSpent > 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                    <DollarSign className="h-3 w-3" />
                    Total: ${totalSpent.toFixed(2)}
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                {vendor.jobHistory.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-zinc-900 rounded-lg text-sm"
                  >
                    <div>
                      <p className="font-medium">{job.taskName}</p>
                      <p className="text-muted-foreground">
                        {format(parseISO(job.completedAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    {job.cost && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                        <DollarSign className="h-3 w-3" />
                        {job.cost}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
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
