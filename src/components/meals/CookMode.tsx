"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Timer,
  Pause,
  Play,
  ChefHat,
} from "lucide-react";
import {
  IngredientUnit,
  scaleAmount,
  formatIngredient,
} from "@/lib/ingredients";

interface RecipeIngredient {
  id: number;
  recipeId: number;
  name: string;
  quantity: string | null;
  amount: number | null;
  unit: string | null;
  section: string | null;
  sortOrder: number;
}

interface CookModeProps {
  recipeName: string;
  instructions: string;
  ingredients?: RecipeIngredient[];
  multiplier: number;
  onClose: () => void;
}

interface ParsedTimer {
  seconds: number;
  label: string;
}

/** Parse time references from step text, e.g. "simmer for 20 minutes" */
function parseTimers(text: string): ParsedTimer[] {
  const pattern = /(\d+)\s*(minutes?|mins?|hours?|hrs?|seconds?|secs?)/gi;
  const timers: ParsedTimer[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const value = parseInt(match[1], 10);
    const unitRaw = match[2].toLowerCase();
    let seconds: number;

    if (unitRaw.startsWith("h")) {
      seconds = value * 3600;
    } else if (unitRaw.startsWith("s")) {
      seconds = value;
    } else {
      seconds = value * 60;
    }

    timers.push({ seconds, label: `${match[1]} ${match[2]}` });
  }

  return timers;
}

function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StepTimer({ timer }: { timer: ParsedTimer }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setRemaining(timer.seconds);
    setRunning(true);
  }, [timer.seconds]);

  const togglePause = useCallback(() => {
    setRunning((prev) => !prev);
  }, []);

  const reset = useCallback(() => {
    setRemaining(null);
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (running && remaining !== null && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev === null || prev <= 1) {
            setRunning(false);
            // Vibrate on completion
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate([200, 100, 200, 100, 200]);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, remaining]);

  if (remaining === null) {
    return (
      <Button
        variant="outline"
        size="touch"
        className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 dark:border-amber-500/50 dark:text-amber-400 dark:hover:bg-amber-500/20"
        onClick={start}
        data-testid="start-timer"
      >
        <Timer className="h-5 w-5 mr-2" />
        Start {timer.label} timer
      </Button>
    );
  }

  const done = remaining === 0;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
        done
          ? "bg-green-500/20 border border-green-500/50"
          : "bg-amber-500/10 border border-amber-500/30"
      }`}
    >
      <span
        className={`font-mono text-2xl font-bold ${
          done ? "text-green-400" : "text-amber-400"
        }`}
      >
        {done ? "Done!" : formatCountdown(remaining)}
      </span>
      {!done && (
        <Button
          variant="ghost"
          size="icon"
          className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/20"
          onClick={togglePause}
        >
          {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700"
        onClick={reset}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function CookMode({
  recipeName,
  instructions,
  ingredients,
  multiplier,
  onClose,
}: CookModeProps) {
  const steps = instructions.split("\n").filter((l) => l.trim());
  const [currentStep, setCurrentStep] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // Wake Lock
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;

    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          sentinel = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Wake Lock not available or denied — no-op
      }
    }

    requestWakeLock();

    return () => {
      if (sentinel) {
        sentinel.release().catch(() => {});
      }
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrentStep((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [steps.length, onClose]);

  // Touch/swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const threshold = 50;

      if (deltaX < -threshold) {
        // Swipe left — next
        setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      } else if (deltaX > threshold) {
        // Swipe right — previous
        setCurrentStep((prev) => Math.max(prev - 1, 0));
      }
      touchStartX.current = null;
    },
    [steps.length]
  );

  const stepText = steps[currentStep] || "";
  const timers = parseTimers(stepText);

  // Match ingredients to current step
  const matchedIngredients = (ingredients || []).filter((ing) =>
    stepText.toLowerCase().includes(ing.name.toLowerCase())
  );

  const renderIngredientQty = (ing: RecipeIngredient) => {
    if (ing.amount != null && ing.unit) {
      const scaled = scaleAmount(
        ing.amount,
        ing.unit as IngredientUnit,
        multiplier
      );
      return formatIngredient(scaled.amount, scaled.unit);
    }
    return ing.quantity || "";
  };

  const progressPercent = steps.length > 1
    ? ((currentStep) / (steps.length - 1)) * 100
    : 100;

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-900 text-zinc-100 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      data-testid="cook-mode"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700/50">
        <div className="flex items-center gap-2 min-w-0">
          <ChefHat className="h-5 w-5 text-amber-400 shrink-0" />
          <h2 className="text-lg font-semibold truncate">{recipeName}</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 shrink-0"
          onClick={onClose}
          data-testid="cook-mode-close"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-zinc-800">
        <div
          className="h-full bg-amber-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step counter */}
      <div className="text-center py-3 text-zinc-400 text-sm" data-testid="step-counter">
        Step {currentStep + 1} of {steps.length}
      </div>

      {/* Step content — scrollable center area */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col items-center justify-center">
        <p className="text-2xl sm:text-3xl md:text-4xl leading-relaxed text-center max-w-2xl" data-testid="step-text">
          {stepText}
        </p>

        {/* Matched ingredients for this step */}
        {matchedIngredients.length > 0 && (
          <div className="mt-8 w-full max-w-md">
            <h3 className="text-sm font-medium text-zinc-400 mb-2 text-center">
              Ingredients for this step
            </h3>
            <ul className="space-y-1">
              {matchedIngredients.map((ing) => {
                const qty = renderIngredientQty(ing);
                return (
                  <li
                    key={ing.id}
                    className="flex items-center justify-center gap-2 text-lg text-zinc-300"
                  >
                    {qty && (
                      <span className="font-semibold text-amber-400">
                        {qty}
                      </span>
                    )}
                    <span>{ing.name}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Timers */}
        {timers.length > 0 && (
          <div className="mt-8 flex flex-col gap-3 items-center">
            {timers.map((timer, i) => (
              <StepTimer key={`${currentStep}-${i}`} timer={timer} />
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-4 border-t border-zinc-700/50">
        <Button
          variant="outline"
          size="touch"
          className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
          onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
          disabled={currentStep === 0}
          data-testid="cook-mode-prev"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Previous
        </Button>

        <Button
          variant="outline"
          size="touch"
          className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
          onClick={() =>
            setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
          }
          disabled={currentStep === steps.length - 1}
          data-testid="cook-mode-next"
        >
          Next
          <ChevronRight className="h-5 w-5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
