"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Clock } from "lucide-react";

interface SnoozeButtonProps {
  taskId: number;
  onSnooze: () => void;
}

const snoozeOptions = [
  { label: "1 day", value: "1day" },
  { label: "3 days", value: "3days" },
  { label: "1 week", value: "1week" },
  { label: "2 weeks", value: "2weeks" },
];

export function SnoozeButton({ taskId, onSnooze }: SnoozeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSnooze = async (duration: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration }),
      });

      if (response.ok) {
        onSnooze();
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Error snoozing task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 px-2" title="Snooze">
          <Clock className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1" align="end">
        <div className="flex flex-col">
          {snoozeOptions.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              size="sm"
              className="justify-start h-8 px-2"
              onClick={() => handleSnooze(option.value)}
              disabled={isLoading}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
