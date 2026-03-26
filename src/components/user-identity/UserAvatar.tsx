"use client";

import { useCurrentUser } from "@/lib/user-identity";

export function UserAvatar() {
  const { currentUser, setIsSelecting } = useCurrentUser();

  if (!currentUser) return <div className="w-10" />;

  return (
    <button
      onClick={() => setIsSelecting(true)}
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
      style={{ backgroundColor: currentUser.color }}
      title={`${currentUser.name} — tap to switch`}
    >
      {currentUser.name.charAt(0).toUpperCase()}
    </button>
  );
}
