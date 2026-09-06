"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { User } from "./types";
import { users as seedUsers } from "./mock-data";

/**
 * ---------------------------------------------------------------------------
 * AUTH LAYER NOTES (read this when wiring the real backend)
 * ---------------------------------------------------------------------------
 * This is a mock, client-side auth store. The session persists to localStorage
 * so it survives refreshes. Everything is shaped like the real API:
 *
 *   register(name, email, password) -> POST /auth/register
 *   login(email, password)          -> POST /auth/login
 *   logout()                        -> POST /auth/logout
 *
 * Registered users (and their plaintext passwords) live in localStorage as a
 * stand-in for the database. Swap the bodies below for fetch/mutation calls;
 * ideally login/register also return a token that you persist.
 *
 * Seed users have no passwords in this mock, so any password is accepted for
 * them. Registered users are validated against their stored password.
 * ---------------------------------------------------------------------------
 */

const SESSION_KEY = "northline:session";
const USERS_KEY = "northline:registered-users";
const CREDENTIALS_KEY = "northline:credentials";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

interface StoredCredential {
  userId: string;
  email: string;
  password: string;
}

function readJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = ["#5750F1", "#3B82C4", "#2F9E5B", "#C97B1D", "#D64545", "#8B5CF6"];

interface AuthStoreValue {
  user: User | null;
  users: User[]; // seed users + registered users (used in member lists / invites)
  registeredUsers: User[];
  status: "loading" | "ready";
  login: (email: string, password: string) => Result<User>;
  register: (name: string, email: string, password: string) => Result<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthStoreValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [credentials, setCredentials] = useState<StoredCredential[]>([]);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  // Restore the session on mount (skip on SSR -> avoids hydration mismatch).
  useEffect(() => {
    const storedUsers = readJSON<User[]>(USERS_KEY) ?? [];
    const storedCredentials = readJSON<StoredCredential[]>(CREDENTIALS_KEY) ?? [];
    setRegisteredUsers(storedUsers);
    setCredentials(storedCredentials);
    const sessionId =
      typeof window === "undefined" ? null : window.localStorage.getItem(SESSION_KEY);
    if (sessionId) {
      const found = [...seedUsers, ...storedUsers].find((u) => u.id === sessionId);
      if (found) setUser(found);
    }
    setStatus("ready");
  }, []);

  // Persist registered users + credentials whenever they change.
  useEffect(() => {
    if (status !== "ready") return;
    writeJSON(USERS_KEY, registeredUsers);
    writeJSON(CREDENTIALS_KEY, credentials);
  }, [registeredUsers, credentials, status]);

  const users = useMemo(() => [...seedUsers, ...registeredUsers], [registeredUsers]);

  const login = useCallback<AuthStoreValue["login"]>(
    (email, password) => {
      const normalized = email.trim().toLowerCase();
      const registered = registeredUsers.find(
        (u) => u.email.toLowerCase() === normalized
      );
      const seed = seedUsers.find((u) => u.email.toLowerCase() === normalized);
      const found = registered ?? seed;
      if (!found) {
        return { ok: false, error: "No account found for that email." };
      }
      if (registered) {
        const cred = credentials.find((c) => c.userId === registered.id);
        if (!cred || cred.password !== password) {
          return { ok: false, error: "Incorrect password." };
        }
      }
      setUser(found);
      if (typeof window !== "undefined") window.localStorage.setItem(SESSION_KEY, found.id);
      return { ok: true, data: found };
    },
    [registeredUsers, credentials]
  );

  const register = useCallback<AuthStoreValue["register"]>(
    (name, email, password) => {
      const normalized = email.trim().toLowerCase();
      const exists = [...seedUsers, ...registeredUsers].some(
        (u) => u.email.toLowerCase() === normalized
      );
      if (exists) {
        return { ok: false, error: "An account with that email already exists." };
      }
      if (password.length < 8) {
        return { ok: false, error: "Password must be at least 8 characters." };
      }
      const user: User = {
        id: `ur-${registeredUsers.length + seedUsers.length + 1}`,
        name: name.trim(),
        email: normalized,
        color: AVATAR_COLORS[registeredUsers.length % AVATAR_COLORS.length],
        initials: initialsFor(name),
      };
      setRegisteredUsers((prev) => [...prev, user]);
      setCredentials((prev) => [
        ...prev,
        { userId: user.id, email: normalized, password },
      ]);
      setUser(user);
      if (typeof window !== "undefined") window.localStorage.setItem(SESSION_KEY, user.id);
      return { ok: true, data: user };
    },
    [registeredUsers]
  );

  const logout = useCallback(() => {
    setUser(null);
    if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
  }, []);

  const value = useMemo<AuthStoreValue>(
    () => ({ user, users, registeredUsers, status, login, register, logout }),
    [user, users, registeredUsers, status, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}