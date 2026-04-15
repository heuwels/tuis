"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, CalendarIcon, ChevronDown, FileText } from "lucide-react";
import { format } from "date-fns";
import { CompletionDetailsDialog } from "./CompletionDetailsDialog";
import { useCurrentUser } from "@/lib/user-identity";

interface CompleteButtonProps {
  taskId: number;
  taskName?: string;
  onComplete: () => void;
}

export function CompleteButton({ taskId, taskName, onComplete }: CompleteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { currentUser } = useCurrentUser();

  const completeTask = async (date?: Date) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedDate: date ? format(date, "yyyy-MM-dd") : undefined,
          completedBy: currentUser?.id || null,
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
    <>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => completeTask()}
          disabled={isLoading}
          className="h-10 md:h-8"
        >
          <Check className="h-4 w-4 mr-1" />
          Done
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-10 md:h-8 px-1">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsCalendarOpen(true)}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Complete on date...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsDetailsOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Complete with details...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="w-auto p-0 sm:max-w-fit">
          <DialogHeader className="px-4 pt-4 pb-0">
            <DialogTitle className="text-sm font-medium">Complete on date</DialogTitle>
          </DialogHeader>
          <Calendar
            mode="single"
            selected={new Date()}
            onSelect={(date) => date && completeTask(date)}
            disabled={(date) => date > new Date()}
            autoFocus
          />
        </DialogContent>
      </Dialog>

      <CompletionDetailsDialog
        taskId={taskId}
        taskName={taskName || "Task"}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onComplete={onComplete}
      />
    </>
  );
}
