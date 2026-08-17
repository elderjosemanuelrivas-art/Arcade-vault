"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";

export type User = { name: string };
export type ScoreEntry = { game: string; score: number; name: string; at: number };

type SessionContextValue = {
  user: User | null;
  signIn: (user: User | null) => void;
  signOut: () => void;
  saveScore: (entry: Omit<ScoreEntry, "at">) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

type Listener = () => void;
let listeners: Listener[] = [];
let cachedRaw: string | null = null;
let cachedUser: User | null = null;

function readUser(): User | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(USER_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedUser = raw ? JSON.parse(raw) : null;
    } catch {
      cachedUser = null;
    }
  }
  return cachedUser;
}

function getServerUser(): User | null {
  return null;
}

function subscribe(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notifyListeners() {
  for (const listener of listeners) listener();
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(subscribe, readUser, getServerUser);

  const signIn = useCallback((nextUser: User | null) => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    } catch {
      // localStorage inaccesible (modo privado, cuota agotada): la sesión no persiste
    }
    notifyListeners();
  }, []);

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      // localStorage inaccesible
    }
    notifyListeners();
  }, []);

  const saveScore = useCallback((entry: Omit<ScoreEntry, "at">) => {
    try {
      const all: ScoreEntry[] = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
      all.push({ ...entry, at: Date.now() });
      localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    } catch {
      // localStorage inaccesible: la puntuación no persiste en esta sesión
    }
  }, []);

  return (
    <SessionContext.Provider value={{ user, signIn, signOut, saveScore }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de un SessionProvider");
  return ctx;
}
