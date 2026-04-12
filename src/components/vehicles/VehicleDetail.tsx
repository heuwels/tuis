"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VehicleWithDetails,
  VehicleServiceWithVendor,
  FuelLog,
  VehicleCostSummary,
  Vendor,
} from "@/types";
import {
  Car,
  Gauge,
  Calendar,
  Pencil,
  Trash2,
  AlertTriangle,
  Fuel,
  Wrench,
  DollarSign,
  Plus,
  Info,
  TrendingUp,
} from "lucide-react";
import { format, parseISO, isPast, isBefore, addDays } from "date-fns";
import { cn } from "@/lib/utils";

type TabId = "overview" | "services" | "fuel" | "costs";

interface VehicleDetailProps {
  vehicle: VehicleWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
}

function ExpiryBadge({
  label,
  date,
}: {
  label: string;
  date: string | null;
}) {
  if (!date) return null;

  const expiry = parseISO(date);
  const now = new Date();
  const soonThreshold = addDays(now, 30);

  let className = "bg-green-100 text-green-800";
  let icon = null;
  if (isPast(expiry)) {
    className = "bg-red-100 text-red-800";
    icon = <AlertTriangle className="h-3 w-3 mr-1" />;
  } else if (isBefore(expiry, soonThreshold)) {
    className = "bg-amber-100 text-amber-800";
    icon = <AlertTriangle className="h-3 w-3 mr-1" />;
  }

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant="secondary" className={className}>
        {icon}
        {format(expiry, "d MMM yyyy")}
      </Badge>
    </div>
  );
}

function ServiceForm({
  vehicleId,
  onSuccess,
}: {
  vehicleId: number;
  onSuccess: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [odometer, setOdometer] = useState("");
  const [cost, setCost] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [isDiy, setIsDiy] = useState(false);
  const [notes, setNotes] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/vendors")
        .then((r) => r.json())
        .then(setVendors)
        .catch(console.error);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          description,
          serviceType: serviceType || null,
          odometer: odometer ? parseInt(odometer) : null,
          cost: cost ? parseFloat(cost) : null,
          vendorId: vendorId ? parseInt(vendorId) : null,
          isDiy,
          notes: notes || null,
        }),
      });
      if (response.ok) {
        setIsOpen(false);
        setDescription("");
        setServiceType("");
        setOdometer("");
        setCost("");
        setVendorId("");
        setIsDiy(false);
        setNotes("");
        onSuccess();
      }
    } catch (error) {
      console.error("Error adding service:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Add Service
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3 bg-gray-50 rounded-lg border">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Date *</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {["Scheduled Service", "Repair", "Tyres", "Brakes", "Battery", "Inspection", "Other"].map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Description *</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., 60,000 km service"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Odometer (km)</Label>
          <Input
            type="number"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Cost ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Vendor</Label>
        <Select value={vendorId} onValueChange={setVendorId}>
          <SelectTrigger>
            <SelectValue placeholder="Select vendor" />
          </SelectTrigger>
          <SelectContent>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="isDiy"
          checked={isDiy}
          onCheckedChange={(checked) => setIsDiy(!!checked)}
        />
        <Label htmlFor="isDiy" className="text-xs">DIY</Label>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? "Saving..." : "Add"}
        </Button>
      </div>
    </form>
  );
}

function FuelForm({
  vehicleId,
  onSuccess,
}: {
  vehicleId: number;
  onSuccess: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [odometer, setOdometer] = useState("");
  const [litres, setLitres] = useState("");
  const [costTotal, setCostTotal] = useState("");
  const [station, setStation] = useState("");
  const [isFullTank, setIsFullTank] = useState(true);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const costPerLitre =
    litres && costTotal
      ? (parseFloat(costTotal) / parseFloat(litres)).toFixed(3)
      : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/fuel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          odometer: parseInt(odometer),
          litres: parseFloat(litres),
          costTotal: parseFloat(costTotal),
          station: station || null,
          isFullTank,
          notes: notes || null,
        }),
      });
      if (response.ok) {
        setIsOpen(false);
        setOdometer("");
        setLitres("");
        setCostTotal("");
        setStation("");
        setIsFullTank(true);
        setNotes("");
        onSuccess();
      }
    } catch (error) {
      console.error("Error adding fuel log:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Add Fuel
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3 bg-gray-50 rounded-lg border">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Date *</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Odometer (km) *</Label>
          <Input
            type="number"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Litres *</Label>
          <Input
            type="number"
            step="0.01"
            value={litres}
            onChange={(e) => setLitres(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Total Cost ($) *</Label>
          <Input
            type="number"
            step="0.01"
            value={costTotal}
            onChange={(e) => setCostTotal(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">$/L</Label>
          <Input value={costPerLitre} disabled className="bg-gray-100" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Station</Label>
        <Input
          value={station}
          onChange={(e) => setStation(e.target.value)}
          placeholder="e.g., Shell Heidelberg"
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="isFullTank"
          checked={isFullTank}
          onCheckedChange={(checked) => setIsFullTank(!!checked)}
        />
        <Label htmlFor="isFullTank" className="text-xs">Full tank</Label>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? "Saving..." : "Add"}
        </Button>
      </div>
    </form>
  );
}

export function VehicleDetail({
  vehicle,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onRefresh,
}: VehicleDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [costSummary, setCostSummary] = useState<VehicleCostSummary | null>(
    null
  );

  useEffect(() => {
    if (vehicle && activeTab === "costs") {
      fetch(`/api/vehicles/${vehicle.id}/costs`)
        .then((r) => r.json())
        .then(setCostSummary)
        .catch(console.error);
    }
  }, [vehicle, activeTab]);

  useEffect(() => {
    if (open) {
      setActiveTab("overview");
      setCostSummary(null);
    }
  }, [open]);

  if (!vehicle) return null;

  const subtitle = [vehicle.make, vehicle.model, vehicle.year]
    .filter(Boolean)
    .join(" ");

  const tabs: { id: TabId; label: string; icon: typeof Info }[] = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "services", label: "Services", icon: Wrench },
    { id: "fuel", label: "Fuel", icon: Fuel },
    { id: "costs", label: "Costs", icon: DollarSign },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Car className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">{vehicle.name}</DialogTitle>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tab buttons */}
        <div className="flex gap-1 border-b pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px",
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-700 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Key info */}
              <div className="grid grid-cols-2 gap-3">
                {vehicle.regoNumber && (
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Registration</p>
                    <p className="font-medium">
                      {vehicle.regoNumber}
                      {vehicle.regoState && ` (${vehicle.regoState})`}
                    </p>
                  </div>
                )}
                {vehicle.currentOdometer && (
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Odometer</p>
                    <p className="font-medium flex items-center gap-1">
                      <Gauge className="h-4 w-4" />
                      {vehicle.currentOdometer.toLocaleString()} km
                    </p>
                  </div>
                )}
                {vehicle.colour && (
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Colour</p>
                    <p className="font-medium">{vehicle.colour}</p>
                  </div>
                )}
                {vehicle.vin && (
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">VIN</p>
                    <p className="font-medium text-xs font-mono">{vehicle.vin}</p>
                  </div>
                )}
                {vehicle.purchaseDate && (
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Purchased</p>
                    <p className="font-medium">
                      {format(parseISO(vehicle.purchaseDate), "d MMM yyyy")}
                      {vehicle.purchasePrice && ` — $${vehicle.purchasePrice.toLocaleString()}`}
                    </p>
                  </div>
                )}
                {vehicle.insuranceProvider && (
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Insurance</p>
                    <p className="font-medium">{vehicle.insuranceProvider}</p>
                  </div>
                )}
              </div>

              {/* Expiry dates */}
              <div className="space-y-2">
                <ExpiryBadge label="Registration" date={vehicle.regoExpiry} />
                <ExpiryBadge label="Insurance" date={vehicle.insuranceExpiry} />
                <ExpiryBadge label="Warranty" date={vehicle.warrantyExpiryDate} />
                {vehicle.warrantyExpiryKm && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-muted-foreground">
                      Warranty km limit
                    </span>
                    <span className="text-sm font-medium">
                      {vehicle.warrantyExpiryKm.toLocaleString()} km
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {vehicle.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm bg-gray-50 rounded-lg p-3">
                    {vehicle.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Services Tab */}
          {activeTab === "services" && (
            <div className="space-y-3">
              <ServiceForm
                vehicleId={vehicle.id}
                onSuccess={() => onRefresh?.()}
              />
              {vehicle.services && vehicle.services.length > 0 ? (
                <div className="space-y-2">
                  {vehicle.services.map((service: VehicleServiceWithVendor) => (
                    <div
                      key={service.id}
                      className="p-3 bg-gray-50 rounded-lg text-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{service.description}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="text-muted-foreground">
                              {format(parseISO(service.date), "d MMM yyyy")}
                            </span>
                            {service.serviceType && (
                              <Badge variant="secondary" className="text-xs">
                                {service.serviceType}
                              </Badge>
                            )}
                            {service.isDiy ? (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-blue-100 text-blue-800"
                              >
                                DIY
                              </Badge>
                            ) : null}
                            {service.vendorName && (
                              <span className="text-muted-foreground">
                                {service.vendorName}
                              </span>
                            )}
                          </div>
                          {service.odometer && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {service.odometer.toLocaleString()} km
                            </p>
                          )}
                          {service.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              {service.notes}
                            </p>
                          )}
                        </div>
                        {service.cost && (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 whitespace-nowrap"
                          >
                            ${service.cost.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No service records yet.
                </p>
              )}
            </div>
          )}

          {/* Fuel Tab */}
          {activeTab === "fuel" && (
            <div className="space-y-3">
              <FuelForm
                vehicleId={vehicle.id}
                onSuccess={() => onRefresh?.()}
              />
              {vehicle.fuelLogs && vehicle.fuelLogs.length > 0 ? (
                <div className="space-y-2">
                  {vehicle.fuelLogs.map((log: FuelLog) => (
                    <div
                      key={log.id}
                      className="p-3 bg-gray-50 rounded-lg text-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {format(parseISO(log.date), "d MMM yyyy")}
                          </p>
                          <div className="flex flex-wrap gap-3 mt-1 text-muted-foreground">
                            <span>{log.odometer.toLocaleString()} km</span>
                            <span>{log.litres.toFixed(2)} L</span>
                            {log.costPerLitre && (
                              <span>${log.costPerLitre.toFixed(3)}/L</span>
                            )}
                            {log.station && <span>{log.station}</span>}
                          </div>
                          {!log.isFullTank && (
                            <Badge
                              variant="secondary"
                              className="text-xs mt-1 bg-amber-100 text-amber-800"
                            >
                              Partial fill
                            </Badge>
                          )}
                          {log.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              {log.notes}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800 whitespace-nowrap"
                        >
                          ${log.costTotal.toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No fuel logs yet.
                </p>
              )}
            </div>
          )}

          {/* Costs Tab */}
          {activeTab === "costs" && (
            <div className="space-y-4">
              {costSummary ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Total Fuel</p>
                      <p className="text-lg font-semibold text-blue-700">
                        ${costSummary.totalFuelCost.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">
                        Total Services
                      </p>
                      <p className="text-lg font-semibold text-orange-700">
                        ${costSummary.totalServiceCost.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">
                        Total Running Cost
                      </p>
                      <p className="text-lg font-semibold text-green-700">
                        ${costSummary.totalCost.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">
                        Distance Tracked
                      </p>
                      <p className="text-lg font-semibold">
                        {costSummary.totalKmTracked.toLocaleString()} km
                      </p>
                    </div>
                  </div>
                  {(costSummary.costPerKm || costSummary.avgFuelConsumption) && (
                    <div className="space-y-2">
                      {costSummary.costPerKm && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Cost per km</span>
                          </div>
                          <span className="font-medium">
                            ${costSummary.costPerKm.toFixed(2)}/km
                          </span>
                        </div>
                      )}
                      {costSummary.avgFuelConsumption && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Fuel className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              Avg fuel consumption
                            </span>
                          </div>
                          <span className="font-medium">
                            {costSummary.avgFuelConsumption.toFixed(1)} L/100km
                          </span>
                        </div>
                      )}
                      {costSummary.totalFuelLitres > 0 && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Fuel className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              Total fuel
                            </span>
                          </div>
                          <span className="font-medium">
                            {costSummary.totalFuelLitres.toFixed(1)} L
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Loading cost summary...
                </p>
              )}
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
