"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface TaskFiltersProps {
  areas: string[];
  frequencies: string[];
  selectedArea: string;
  selectedFrequency: string;
  searchQuery: string;
  onAreaChange: (area: string) => void;
  onFrequencyChange: (frequency: string) => void;
  onSearchChange: (query: string) => void;
}

export function TaskFilters({
  areas,
  frequencies,
  selectedArea,
  selectedFrequency,
  searchQuery,
  onAreaChange,
  onFrequencyChange,
  onSearchChange,
}: TaskFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Area
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedArea === "" ? "default" : "outline"}
            size="sm"
            onClick={() => onAreaChange("")}
          >
            All
          </Button>
          {areas.map((area) => (
            <Button
              key={area}
              variant={selectedArea === area ? "default" : "outline"}
              size="sm"
              onClick={() => onAreaChange(area)}
            >
              {area}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Frequency
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedFrequency === "" ? "default" : "outline"}
            size="sm"
            onClick={() => onFrequencyChange("")}
          >
            All
          </Button>
          {frequencies.map((frequency) => (
            <Button
              key={frequency}
              variant={selectedFrequency === frequency ? "default" : "outline"}
              size="sm"
              onClick={() => onFrequencyChange(frequency)}
            >
              {frequency}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
