"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { Task } from "@/types";
import { Markdown } from "@/components/ui/markdown";

interface TaskDetailProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export function TaskDetail({
  task,
  open,
  onOpenChange,
  onEdit,
}: TaskDetailProps) {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task.name}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">{task.area}</Badge>
          <Badge variant="outline">{task.frequency}</Badge>
        </div>

        {task.notes && (
          <p className="text-sm text-muted-foreground">{task.notes}</p>
        )}

        {task.extendedNotes && (
          <div className="border-t pt-4">
            <Markdown>{task.extendedNotes}</Markdown>
          </div>
        )}

        {onEdit && (
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
