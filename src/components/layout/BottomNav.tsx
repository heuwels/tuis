"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, ListTodo, ShoppingCart, Heart, Menu } from "lucide-react";

interface BottomNavProps {
  onMenuClick: () => void;
}

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tasks", label: "Chores", icon: ListTodo },
  { href: "/shopping", label: "Shop", icon: ShoppingCart },
  { href: "/together", label: "Us", icon: Heart },
];

export function BottomNav({ onMenuClick }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] h-11 px-3 rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs mt-0.5 font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center min-w-[64px] h-11 px-3 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="h-6 w-6" />
          <span className="text-xs mt-0.5 font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}
