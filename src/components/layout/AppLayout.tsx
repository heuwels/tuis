"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Home,
  ListTodo,
  Refrigerator,
  Wrench,
  ShoppingCart,
  UtensilsCrossed,
  BookOpen,
  Heart,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Car,
  Landmark,
} from "lucide-react";
import { BottomNav } from "./BottomNav";
import { UserAvatar } from "@/components/user-identity/UserAvatar";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    title: "Home",
    items: [{ href: "/", label: "Dashboard", icon: Home }],
  },
  {
    title: "Household",
    items: [
      { href: "/tasks", label: "Chores", icon: ListTodo },
      { href: "/appliances", label: "Appliances", icon: Refrigerator },
      { href: "/vendors", label: "Vendors", icon: Wrench },
      { href: "/quotes", label: "Quotes", icon: FileText },
      { href: "/vehicles", label: "Cars", icon: Car },
      { href: "/finance", label: "Finance", icon: Landmark },
    ],
  },
  {
    title: "Food",
    items: [
      { href: "/shopping", label: "Shopping", icon: ShoppingCart },
      { href: "/meals", label: "Meals", icon: UtensilsCrossed },
      { href: "/recipes", label: "Recipes", icon: BookOpen },
    ],
  },
  {
    title: "Us",
    items: [{ href: "/together", label: "Together", icon: Heart }],
  },
  {
    title: "System",
    items: [
      { href: "/stats", label: "Stats", icon: BarChart3 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

export function AppLayout({ children, title, actions }: AppLayoutProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navContent = (
    <nav className="flex-1 overflow-y-auto py-4">
      {navigation.map((group) => (
        <div key={group.title} className="mb-4">
          {!isCollapsed && (
            <h3 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.title}
            </h3>
          )}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg mx-2 transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          {title && (
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          )}
          <UserAvatar />
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <span className="text-lg font-bold text-sidebar-foreground">Tuis</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        {navContent}
        <div className="p-3 border-t border-sidebar-border">
          <ThemeToggle />
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 bg-sidebar border-r border-sidebar-border transition-all duration-200",
          isCollapsed ? "lg:w-16" : "lg:w-56"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border h-16">
          {!isCollapsed && (
            <span className="text-lg font-bold text-sidebar-foreground">Tuis</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(isCollapsed && "mx-auto")}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        {navContent}
        <div className={cn("p-3 border-t border-sidebar-border", isCollapsed ? "px-1" : "")}>
          <ThemeToggle collapsed={isCollapsed} />
        </div>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          "transition-all duration-200",
          isCollapsed ? "lg:pl-16" : "lg:pl-56"
        )}
      >
        {/* Desktop header */}
        {(title || actions) && (
          <header className="hidden lg:block bg-card border-b border-border sticky top-0 z-20">
            <div className="flex items-center justify-between px-6 py-4">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <div className="flex items-center gap-4">
                {actions}
                <UserAvatar />
              </div>
            </div>
          </header>
        )}

        {/* Mobile actions bar (if actions exist but no header shown) */}
        {actions && (
          <div className="lg:hidden bg-card border-b border-border px-4 py-2">
            <div className="flex items-center justify-end gap-2">{actions}</div>
          </div>
        )}

        <div className="p-4 lg:p-6 pb-20 lg:pb-6">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav onMenuClick={() => setIsMobileOpen(true)} />
    </div>
  );
}
