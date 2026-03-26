"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCurrentUser } from "@/lib/user-identity";
import Link from "next/link";

export function UserPicker() {
  const { users, selectUser, isSelecting, setIsSelecting, currentUser } =
    useCurrentUser();

  // Non-dismissible on first visit (no current user yet)
  const isFirstVisit = !currentUser;

  return (
    <Dialog
      open={isSelecting}
      onOpenChange={(open) => {
        if (!open && !isFirstVisit) setIsSelecting(false);
      }}
    >
      <DialogContent
        className="sm:max-w-[360px]"
        onPointerDownOutside={(e) => isFirstVisit && e.preventDefault()}
        onEscapeKeyDown={(e) => isFirstVisit && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isFirstVisit ? "Who are you?" : "Switch User"}
          </DialogTitle>
        </DialogHeader>
        {users.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <p>No household members yet.</p>
            <Link
              href="/settings"
              className="text-blue-600 underline mt-2 inline-block"
            >
              Add someone in Settings
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 py-2">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => selectUser(user.id)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-semibold"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {user.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
