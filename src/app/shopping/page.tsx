"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil, ShoppingCart, Check } from "lucide-react";
import { AddItemInput } from "@/components/shopping/AddItemInput";
import { ListForm } from "@/components/shopping/ListForm";
import { AppLayout } from "@/components/layout/AppLayout";

interface ShoppingList {
  id: number;
  name: string;
  color: string | null;
  itemCount: number;
  checkedCount: number;
}

interface ShoppingItem {
  id: number;
  listId: number;
  name: string;
  quantity: string | null;
  checked: boolean;
  sortOrder: number;
  createdAt: string | null;
}

export default function ShoppingPage() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isListFormOpen, setIsListFormOpen] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);

  const selectedList = lists.find((l) => l.id === selectedListId);

  const fetchLists = async () => {
    try {
      const response = await fetch("/api/shopping/lists");
      if (response.ok) {
        const data = await response.json();
        setLists(data);

        // Select first list if none selected
        if (data.length > 0 && !selectedListId) {
          setSelectedListId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching lists:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchItems = async (listId: number) => {
    try {
      const response = await fetch(`/api/shopping/lists/${listId}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  useEffect(() => {
    if (selectedListId) {
      fetchItems(selectedListId);
    }
  }, [selectedListId]);

  const handleAddItem = async (name: string, quantity?: string) => {
    if (!selectedListId) return;

    try {
      const response = await fetch("/api/shopping/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: selectedListId, name, quantity }),
      });

      if (response.ok) {
        fetchItems(selectedListId);
        fetchLists(); // Update counts
      }
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const handleToggleItem = async (id: number, checked: boolean) => {
    try {
      const response = await fetch(`/api/shopping/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked }),
      });

      if (response.ok) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, checked } : item))
        );
        fetchLists(); // Update counts
      }
    } catch (error) {
      console.error("Error toggling item:", error);
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      const response = await fetch(`/api/shopping/items/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        fetchLists(); // Update counts
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleClearChecked = async () => {
    if (!selectedListId) return;

    try {
      const response = await fetch("/api/shopping/items/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: selectedListId }),
      });

      if (response.ok) {
        setItems((prev) => prev.filter((item) => !item.checked));
        fetchLists(); // Update counts
      }
    } catch (error) {
      console.error("Error clearing items:", error);
    }
  };

  const handleDeleteList = async () => {
    if (!selectedListId) return;
    if (!confirm("Delete this list and all its items?")) return;

    try {
      const response = await fetch(`/api/shopping/lists/${selectedListId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSelectedListId(null);
        setItems([]);
        fetchLists();
      }
    } catch (error) {
      console.error("Error deleting list:", error);
    }
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const uncheckedItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);

  return (
    <AppLayout title="Shopping Lists">
      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Loading...</p>
      ) : lists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No shopping lists yet. Create your first list to get started.
            </p>
            <Button onClick={() => setIsListFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create List
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* List selector */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedListId?.toString() || ""}
              onValueChange={(v) => setSelectedListId(parseInt(v))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a list" />
              </SelectTrigger>
              <SelectContent>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: list.color || "#3b82f6" }}
                      />
                      {list.name}
                      <span className="text-muted-foreground text-xs">
                        ({list.itemCount - (list.checkedCount || 0)})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                setEditingList(null);
                setIsListFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>

            {selectedList && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditingList(selectedList);
                    setIsListFormOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700"
                  onClick={handleDeleteList}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {selectedListId && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle
                    className="flex items-center gap-2"
                    style={{ color: selectedList?.color || "#3b82f6" }}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {selectedList?.name}
                  </CardTitle>
                  {checkedCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearChecked}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Clear {checkedCount} checked
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <AddItemInput onAdd={handleAddItem} />

                {items.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No items yet. Add something above!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {/* Unchecked items first */}
                    {uncheckedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 rounded-lg border group"
                      >
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={(checked) =>
                            handleToggleItem(item.id, checked as boolean)
                          }
                        />
                        <div className="flex-1 min-w-0">
                          {item.quantity && (
                            <span className="font-medium text-blue-600 mr-2">
                              {item.quantity}
                            </span>
                          )}
                          {item.name}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {/* Checked items with strikethrough */}
                    {checkedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg border opacity-60 group"
                      >
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={(checked) =>
                            handleToggleItem(item.id, checked as boolean)
                          }
                        />
                        <div className="flex-1 min-w-0 line-through text-muted-foreground">
                          {item.quantity && (
                            <span className="mr-2">{item.quantity}</span>
                          )}
                          {item.name}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <ListForm
        list={editingList}
        open={isListFormOpen}
        onOpenChange={setIsListFormOpen}
        onSuccess={() => {
          fetchLists();
          if (!selectedListId && lists.length === 0) {
            // Will auto-select in fetchLists
          }
        }}
      />
    </AppLayout>
  );
}
