"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Appliance } from "@/types";
import {
  Refrigerator,
  FileText,
  Shield,
  MapPin,
  Calendar,
  Pencil,
  Trash2,
  ExternalLink,
  ListTodo,
  DollarSign,
} from "lucide-react";
import { format, parseISO, isPast, addMonths, isFuture } from "date-fns";

interface ServiceHistoryItem {
  id: number;
  taskId: number;
  taskName: string;
  completedAt: string;
  vendorId: number | null;
  cost: string | null;
}

interface LinkedTask {
  id: number;
  name: string;
  frequency: string;
  lastCompleted: string | null;
}

interface ApplianceWithDetails extends Appliance {
  tasks?: LinkedTask[];
  serviceHistory?: ServiceHistoryItem[];
}

interface ApplianceDetailProps {
  appliance: ApplianceWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

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

export function ApplianceDetail({
  appliance,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ApplianceDetailProps) {
  if (!appliance) return null;

  const warrantyStatus = getWarrantyStatus(appliance.warrantyExpiry);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Refrigerator className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">{appliance.name}</DialogTitle>
                {(appliance.brand || appliance.model) && (
                  <p className="text-sm text-muted-foreground">
                    {[appliance.brand, appliance.model].filter(Boolean).join(" - ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {appliance.location && (
              <Badge variant="secondary" className="bg-gray-100">
                <MapPin className="h-3 w-3 mr-1" />
                {appliance.location}
              </Badge>
            )}
            {warrantyStatus && (
              <Badge variant="secondary" className={warrantyStatus.color}>
                <Shield className="h-3 w-3 mr-1" />
                Warranty: {warrantyStatus.label}
              </Badge>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {appliance.purchaseDate && (
              <div>
                <p className="text-muted-foreground">Purchase Date</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(parseISO(appliance.purchaseDate), "MMMM d, yyyy")}
                </p>
              </div>
            )}
            {appliance.warrantyExpiry && (
              <div>
                <p className="text-muted-foreground">Warranty Expiry</p>
                <p className="font-medium flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  {format(parseISO(appliance.warrantyExpiry), "MMMM d, yyyy")}
                </p>
              </div>
            )}
          </div>

          {/* Document Links */}
          {(appliance.manualUrl || appliance.warrantyDocUrl) && (
            <div className="flex gap-4">
              {appliance.manualUrl && (
                <a
                  href={appliance.manualUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <FileText className="h-4 w-4" />
                  View Manual
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {appliance.warrantyDocUrl && (
                <a
                  href={appliance.warrantyDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <Shield className="h-4 w-4" />
                  View Warranty
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {/* Notes */}
          {appliance.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm bg-gray-50 rounded-lg p-3">{appliance.notes}</p>
            </div>
          )}

          {/* Linked Tasks */}
          {appliance.tasks && appliance.tasks.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                Linked Tasks
              </h4>
              <div className="space-y-2">
                {appliance.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                  >
                    <span className="font-medium">{task.name}</span>
                    <span className="text-muted-foreground">{task.frequency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Service History */}
          {appliance.serviceHistory && appliance.serviceHistory.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Service History</h4>
              <div className="space-y-2">
                {appliance.serviceHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                  >
                    <div>
                      <p className="font-medium">{entry.taskName}</p>
                      <p className="text-muted-foreground">
                        {format(parseISO(entry.completedAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    {entry.cost && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <DollarSign className="h-3 w-3" />
                        {entry.cost}
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
