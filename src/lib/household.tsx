"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Household } from "@/lib/db/schema";
import { useCurrentUser } from "@/lib/user-identity";

const STORAGE_KEY = "tuis-household-id";

interface HouseholdContextValue {
  currentHousehold: Household | null;
  households: Household[];
  selectHousehold: (id: number) => void;
  isSelecting: boolean;
  setIsSelecting: (v: boolean) => void;
}

const HouseholdContext = createContext<HouseholdContextValue>({
  currentHousehold: null,
  households: [],
  selectHousehold: () => {},
  isSelecting: false,
  setIsSelecting: () => {},
});

export function useCurrentHousehold() {
  return useContext(HouseholdContext);
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useCurrentUser();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [currentHousehold, setCurrentHousehold] = useState<Household | null>(
    null
  );
  const [isSelecting, setIsSelecting] = useState(false);
  const [loaded, setLoaded] = useState(!currentUser);

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;
    fetch(`/api/households?userId=${currentUser.id}`)
      .then((res) => res.json())
      .then((data: Household[]) => {
        if (cancelled) return;
        setHouseholds(data);
        const storedId = localStorage.getItem(STORAGE_KEY);
        if (storedId) {
          const match = data.find((h) => h.id === parseInt(storedId));
          if (match) {
            setCurrentHousehold(match);
          } else {
            localStorage.removeItem(STORAGE_KEY);
            if (data.length === 1) {
              setCurrentHousehold(data[0]);
              localStorage.setItem(STORAGE_KEY, String(data[0].id));
            } else if (data.length > 1) {
              setIsSelecting(true);
            }
          }
        } else if (data.length === 1) {
          // Auto-select if user belongs to only one household
          setCurrentHousehold(data[0]);
          localStorage.setItem(STORAGE_KEY, String(data[0].id));
        } else if (data.length > 1) {
          setIsSelecting(true);
        }
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch households:", err);
        setLoaded(true);
      });

    return () => { cancelled = true; };
  }, [currentUser]);

  const selectHousehold = useCallback(
    (id: number) => {
      const match = households.find((h) => h.id === id);
      if (match) {
        setCurrentHousehold(match);
        localStorage.setItem(STORAGE_KEY, String(id));
        setIsSelecting(false);
      }
    },
    [households]
  );

  if (!loaded) return <>{children}</>;

  return (
    <HouseholdContext.Provider
      value={{
        currentHousehold,
        households,
        selectHousehold,
        isSelecting,
        setIsSelecting,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}
