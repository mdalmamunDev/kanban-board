"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trello } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: replace with POST /auth/login, store the returned token, then redirect.
    router.push("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[360px]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-ink">
            <Trello size={18} strokeWidth={2.2} />
          </div>
          <div className="text-center">
            <h1 className="text-[17px] font-semibold">Welcome back</h1>
            <p className="text-[13px] text-ink-faint">Sign in to Northline to see your boards</p>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-6 shadow-card">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[12.5px] font-medium text-ink-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="rounded-md border border-border bg-surface px-3 py-2 text-[13.5px] outline-none placeholder:text-ink-faint focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-[12.5px] font-medium text-ink-muted">
                Password
              </label>
              <a href="#" className="text-[12px] text-accent hover:underline">
                Forgot?
              </a>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="rounded-md border border-border bg-surface px-3 py-2 text-[13.5px] outline-none placeholder:text-ink-faint focus:border-accent"
            />
          </div>

          <button
            type="submit"
            className="mt-1.5 rounded-md bg-accent py-2 text-[13.5px] font-medium text-accent-ink transition-opacity hover:opacity-90"
          >
            Sign in
          </button>
        </form>

        <p className="mt-5 text-center text-[13px] text-ink-faint">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
