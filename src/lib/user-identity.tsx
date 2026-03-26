"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "@/lib/db/schema";

const STORAGE_KEY = "chore-calendar-user-id";

interface UserIdentityContextValue {
  currentUser: User | null;
  users: User[];
  selectUser: (id: number) => void;
  isSelecting: boolean;
  setIsSelecting: (v: boolean) => void;
}

const UserIdentityContext = createContext<UserIdentityContextValue>({
  currentUser: null,
  users: [],
  selectUser: () => {},
  isSelecting: false,
  setIsSelecting: () => {},
});

export function useCurrentUser() {
  return useContext(UserIdentityContext);
}

export function UserIdentityProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data: User[]) => {
        setUsers(data);
        const storedId = localStorage.getItem(STORAGE_KEY);
        if (storedId) {
          const match = data.find((u) => u.id === parseInt(storedId));
          if (match) {
            setCurrentUser(match);
          } else {
            localStorage.removeItem(STORAGE_KEY);
            if (data.length > 0) setIsSelecting(true);
          }
        } else if (data.length > 0) {
          setIsSelecting(true);
        }
        setLoaded(true);
      })
      .catch(console.error);
  }, []);

  const selectUser = useCallback(
    (id: number) => {
      const match = users.find((u) => u.id === id);
      if (match) {
        setCurrentUser(match);
        localStorage.setItem(STORAGE_KEY, String(id));
        setIsSelecting(false);
      }
    },
    [users]
  );

  if (!loaded) return <>{children}</>;

  return (
    <UserIdentityContext.Provider
      value={{ currentUser, users, selectUser, isSelecting, setIsSelecting }}
    >
      {children}
    </UserIdentityContext.Provider>
  );
}
