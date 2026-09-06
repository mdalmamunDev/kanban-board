"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { User } from "./types";
import * as api from "./api";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

interface AuthStoreValue {
  user: User | null;
  users: User[];
  registeredUsers: User[];
  status: "loading" | "ready";
  login: (email: string, password: string) => Promise<Result<User>>;
  register: (name: string, email: string, password: string) => Promise<Result<User>>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthStoreValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    if (!api.getToken()) {
      setStatus("ready");
      return;
    }
    api.me()
      .then(({ user: found }) => setUser(found))
      .catch(() => api.setToken(null))
      .finally(() => setStatus("ready"));
  }, []);

  const login: AuthStoreValue["login"] = async (email, password) => {
    try {
      const response = await api.login(email, password);
      api.setToken(response.token);
      setUser(response.user);
      return { ok: true, data: response.user };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Unable to sign in." };
    }
  };

  const register: AuthStoreValue["register"] = async (name, email, password) => {
    try {
      const response = await api.register(name, email, password);
      api.setToken(response.token);
      setUser(response.user);
      return { ok: true, data: response.user };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Unable to register." };
    }
  };

  const logout = async () => {
    try {
      if (api.getToken()) await api.logout();
    } finally {
      api.setToken(null);
      setUser(null);
    }
  };

  const value = useMemo<AuthStoreValue>(
    () => ({ user, users, registeredUsers: users, status, login, register, logout }),
    [user, users, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}