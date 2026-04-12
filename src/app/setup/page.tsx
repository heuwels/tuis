"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Home,
  Users,
  Sparkles,
  PartyPopper,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";

const COLORS: Array<{ hex: string; label: string }> = [
  { hex: "#3b82f6", label: "Blue" },
  { hex: "#ef4444", label: "Red" },
  { hex: "#22c55e", label: "Green" },
  { hex: "#f59e0b", label: "Amber" },
  { hex: "#8b5cf6", label: "Violet" },
  { hex: "#ec4899", label: "Pink" },
  { hex: "#06b6d4", label: "Cyan" },
  { hex: "#f97316", label: "Orange" },
];

interface Member {
  name: string;
  color: string;
}

const STEPS = [
  { label: "Welcome", icon: Home },
  { label: "Members", icon: Users },
  { label: "Quick Start", icon: Sparkles },
  { label: "Done", icon: PartyPopper },
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [members, setMembers] = useState<Member[]>([
    { name: "", color: COLORS[0].hex },
  ]);
  const [seedChores, setSeedChores] = useState(true);
  const [seedShopping, setSeedShopping] = useState(true);
  const [seedRecipes, setSeedRecipes] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);

  // Redirect away if setup is already complete
  useEffect(() => {
    fetch("/api/setup")
      .then((res) => res.json())
      .then((data) => {
        if (!data.needsSetup) {
          router.replace("/");
        } else {
          setIsCheckingSetup(false);
        }
      })
      .catch(() => setIsCheckingSetup(false));
  }, [router]);

  const addMember = () => {
    setMembers([
      ...members,
      { name: "", color: COLORS[members.length % COLORS.length].hex },
    ]);
  };

  const removeMember = (index: number) => {
    if (members.length <= 1) return;
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (
    index: number,
    field: keyof Member,
    value: string
  ) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const validMembers = members.filter((m) => m.name.trim().length > 0);

  const canProceedFromMembers = validMembers.length >= 1;

  const handleFinish = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Create all members
      for (const member of validMembers) {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: member.name.trim(), color: member.color }),
        });
        if (!res.ok) {
          throw new Error(`Failed to create member: ${member.name}`);
        }
      }

      // Seed starter data if any selected
      if (seedChores || seedShopping || seedRecipes) {
        const res = await fetch("/api/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seedChores, seedShopping, seedRecipes }),
        });
        if (!res.ok) {
          throw new Error("Failed to seed starter data");
        }
      }

      setStep(3);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const goToDashboard = () => {
    router.push("/");
    router.refresh();
  };

  if (isCheckingSetup) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
                    i <= step
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-zinc-700 text-gray-400 dark:text-zinc-500"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-8 h-0.5 transition-colors ${
                      i < step ? "bg-blue-600" : "bg-gray-200 dark:bg-zinc-700"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Home className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
                  Welcome to Tuis
                </h1>
                <p className="text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
                  Your household companion for managing chores, meals, shopping,
                  and more. Let&apos;s get you set up in a few quick steps.
                </p>
              </div>
              <Button onClick={() => setStep(1)} size="lg" className="gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Household Members */}
        {step === 1 && (
          <Card>
            <CardContent className="pt-6 pb-6 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
                  Who lives here?
                </h2>
                <p className="text-gray-500 dark:text-zinc-400 text-sm">
                  Add the people in your household. You can always add more
                  later in Settings.
                </p>
              </div>

              <div className="space-y-4">
                {members.map((member, index) => (
                  <div key={index} className="space-y-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`name-${index}`} className="sr-only">
                          Name
                        </Label>
                        <Input
                          id={`name-${index}`}
                          value={member.name}
                          onChange={(e) =>
                            updateMember(index, "name", e.target.value)
                          }
                          placeholder="Name"
                          autoFocus={index === 0}
                        />
                      </div>
                      {members.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 shrink-0"
                          onClick={() => removeMember(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 dark:text-zinc-400 mb-1.5 block">
                        Colour
                      </Label>
                      <div className="flex gap-2 flex-wrap">
                        {COLORS.map(({ hex, label }) => (
                          <button
                            key={hex}
                            type="button"
                            aria-label={`Select ${label}`}
                            className={`w-7 h-7 rounded-full transition-transform ${
                              member.color === hex
                                ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-zinc-500 dark:ring-offset-zinc-800 scale-110"
                                : ""
                            }`}
                            style={{ backgroundColor: hex }}
                            onClick={() =>
                              updateMember(index, "color", hex)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={addMember}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Another Person
              </Button>

              {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(0)}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => { setError(null); setStep(2); }}
                  disabled={!canProceedFromMembers}
                  className="flex-1 gap-2"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Quick Start */}
        {step === 2 && (
          <Card>
            <CardContent className="pt-6 pb-6 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
                  Quick Start
                </h2>
                <p className="text-gray-500 dark:text-zinc-400 text-sm">
                  Want some starter data to get going? You can skip this and
                  add everything yourself.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
                  <Checkbox
                    checked={seedChores}
                    onCheckedChange={(checked) =>
                      setSeedChores(checked === true)
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-zinc-100">
                      Common household chores
                    </div>
                    <div className="text-sm text-gray-500 dark:text-zinc-400">
                      Kitchen, bathroom, bedroom, living room, outdoor, and
                      laundry tasks with suggested frequencies
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
                  <Checkbox
                    checked={seedShopping}
                    onCheckedChange={(checked) =>
                      setSeedShopping(checked === true)
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-zinc-100">
                      Sample shopping list
                    </div>
                    <div className="text-sm text-gray-500 dark:text-zinc-400">
                      A &quot;Groceries&quot; list with common pantry staples
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
                  <Checkbox
                    checked={seedRecipes}
                    onCheckedChange={(checked) =>
                      setSeedRecipes(checked === true)
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-zinc-100">
                      Sample recipes
                    </div>
                    <div className="text-sm text-gray-500 dark:text-zinc-400">
                      A few simple recipes to get your meal planning started
                    </div>
                  </div>
                </label>
              </div>

              {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="gap-2"
                  disabled={isSaving}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={isSaving}
                  className="flex-1 gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Finish Setup
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <PartyPopper className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
                  You&apos;re all set!
                </h1>
                <p className="text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
                  Your household is ready to go. Head to the dashboard to start
                  managing your home.
                </p>
              </div>
              <Button onClick={goToDashboard} size="lg" className="gap-2">
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
