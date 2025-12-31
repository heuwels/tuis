"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface CompleteButtonProps {
  taskId: number;
  onComplete: () => void;
}

export function CompleteButton({ taskId, onComplete }: CompleteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const completeTask = async (date?: Date) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedDate: date ? format(date, "yyyy-MM-dd") : undefined,
        }),
      });

      if (response.ok) {
        onComplete();
        setIsCalendarOpen(false);
      }
    } catch (error) {
      console.error("Error completing task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={() => completeTask()}
        disabled={isLoading}
        className="h-8"
      >
        <Check className="h-4 w-4 mr-1" />
        Done
      </Button>
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 px-2">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={new Date()}
            onSelect={(date) => date && completeTask(date)}
            disabled={(date) => date > new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
