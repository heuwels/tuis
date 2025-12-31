"use client";

import { Button } from "@/components/ui/button";

interface TaskFiltersProps {
  areas: string[];
  frequencies: string[];
  selectedArea: string;
  selectedFrequency: string;
  onAreaChange: (area: string) => void;
  onFrequencyChange: (frequency: string) => void;
}

export function TaskFilters({
  areas,
  frequencies,
  selectedArea,
  selectedFrequency,
  onAreaChange,
  onFrequencyChange,
}: TaskFiltersProps) {
  return (
    <div className="space-y-4">
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
