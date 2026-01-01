"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";

interface ShoppingItemProps {
  id: number;
  name: string;
  quantity: string | null;
  checked: boolean;
  onToggle: (id: number, checked: boolean) => void;
  onDelete: (id: number) => void;
}

export function ShoppingItem({
  id,
  name,
  quantity,
  checked,
  onToggle,
  onDelete,
}: ShoppingItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(id);
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 bg-white rounded-lg border ${
        checked ? "opacity-60" : ""
      }`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onToggle(id, value as boolean)}
      />
      <div className="flex-1 min-w-0">
        <span className={checked ? "line-through text-muted-foreground" : ""}>
          {quantity && (
            <span className="font-medium text-blue-600 mr-2">{quantity}</span>
          )}
          {name}
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
