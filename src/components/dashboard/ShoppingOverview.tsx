"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

interface ShoppingList {
  id: number;
  name: string;
  color: string | null;
  itemCount: number | null;
  checkedCount: number | null;
}

export function ShoppingOverview() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/shopping/lists")
      .then((r) => r.ok ? r.json() : [])
      .then((data: ShoppingList[]) => {
        setLists(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  // Only show lists that have unchecked items
  const activeLists = lists.filter((l) => {
    const total = l.itemCount ?? 0;
    const checked = l.checkedCount ?? 0;
    return total > 0 && checked < total;
  });

  const totalRemaining = activeLists.reduce((sum, l) => {
    return sum + (l.itemCount ?? 0) - (l.checkedCount ?? 0);
  }, 0);

  return (
    <Link href="/shopping" className="block group">
      <Card className="h-full transition-colors group-hover:border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Shopping
            {totalRemaining > 0 && (
              <span className="ml-auto text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                {totalRemaining} to buy
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeLists.length > 0 ? (
            <div className="space-y-2.5">
              {activeLists.slice(0, 3).map((list) => {
                const total = list.itemCount ?? 0;
                const checked = list.checkedCount ?? 0;
                const remaining = total - checked;
                const progress = total > 0 ? (checked / total) * 100 : 0;

                return (
                  <div key={list.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: list.color || "#3b82f6" }}
                        />
                        <span className="font-medium truncate">{list.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {remaining} left
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: list.color || "#3b82f6",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {activeLists.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{activeLists.length - 3} more list{activeLists.length - 3 > 1 ? "s" : ""}
                </p>
              )}
            </div>
          ) : lists.length > 0 ? (
            <p className="text-sm text-green-600 font-medium">All done!</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No shopping lists</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
