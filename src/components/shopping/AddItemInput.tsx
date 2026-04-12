"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface AddItemInputProps {
  onAdd: (name: string, quantity?: string) => void;
  disabled?: boolean;
}

export function AddItemInput({ onAdd, disabled }: AddItemInputProps) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (value.length < 1) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch(
          `/api/shopping/suggestions?q=${encodeURIComponent(value)}`
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 150);
    return () => clearTimeout(debounce);
  }, [value]);

  const handleSubmit = (itemName?: string) => {
    const name = itemName || value.trim();
    if (!name) return;

    // Parse quantity if present (e.g., "2 milk" or "milk x3")
    const quantityMatch = name.match(/^(\d+)\s+(.+)$/) || name.match(/^(.+)\s+x(\d+)$/i);
    if (quantityMatch) {
      const [, first, second] = quantityMatch;
      if (/^\d+$/.test(first)) {
        onAdd(second, first);
      } else {
        onAdd(first, second);
      }
    } else {
      onAdd(name);
    }

    setValue("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSubmit(suggestions[selectedIndex]);
      } else {
        handleSubmit();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Add item... (e.g., '2 milk' or 'eggs')"
          disabled={disabled}
          className="flex-1"
        />
        <Button
          onClick={() => handleSubmit()}
          disabled={disabled || !value.trim()}
          size="icon"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 border rounded-md shadow-lg max-h-48 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 ${
                index === selectedIndex ? "bg-gray-100 dark:bg-zinc-800" : ""
              }`}
              onClick={() => handleSubmit(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
