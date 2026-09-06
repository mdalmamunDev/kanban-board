"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Trello } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { user, status, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already signed in? Go straight to the boards.
  useEffect(() => {
    if (status === "ready" && user) {
      router.replace("/");
    }
  }, [status, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.ok) {
        router.push("/");
      } else {
        setError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
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
            disabled={isSubmitting}
            className="mt-1.5 flex items-center justify-center gap-2 rounded-md bg-accent py-2 text-[13.5px] font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {error && (
          <p className="mt-3 rounded-md border border-[#D64545]/30 bg-[#D64545]/10 px-3 py-2 text-[12.5px] font-medium text-[#D64545]">
            {error}
          </p>
        )}

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
