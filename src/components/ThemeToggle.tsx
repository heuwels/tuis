"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Theme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

const options: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

interface ThemeToggleProps {
  collapsed?: boolean;
}

export function ThemeToggle({ collapsed }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  if (collapsed) {
    // When sidebar is collapsed, show a single button that cycles through modes
    const current = options.find((o) => o.value === theme) ?? options[2];
    const Icon = current.icon;
    const nextIndex =
      (options.findIndex((o) => o.value === theme) + 1) % options.length;
    return (
      <button
        onClick={() => setTheme(options[nextIndex].value)}
        className="flex items-center justify-center w-10 h-10 mx-auto rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        title={`Theme: ${current.label}`}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.value;
        return (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex items-center justify-center h-7 w-full rounded-md transition-colors text-xs gap-1.5",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            title={option.label}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
