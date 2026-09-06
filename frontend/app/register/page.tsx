"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trello } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { user, status, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Go straight to the boards.
  useEffect(() => {
    if (status === "ready" && user) {
      router.replace("/");
    }
  }, [status, user, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: replace with POST /auth/register, store the returned token, then redirect.
    setError(null);
    const result = register(name, email, password);
    if (result.ok) {
      router.push("/");
    } else {
      setError(result.error);
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
            <h1 className="text-[17px] font-semibold">Create your account</h1>
            <p className="text-[13px] text-ink-faint">Start organizing work with your team</p>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-6 shadow-card">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-[12.5px] font-medium text-ink-muted">
              Full name
            </label>
            <input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jordan Rivera"
              className="rounded-md border border-border bg-surface px-3 py-2 text-[13.5px] outline-none placeholder:text-ink-faint focus:border-accent"
            />
          </div>

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
            <label htmlFor="password" className="text-[12.5px] font-medium text-ink-muted">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="rounded-md border border-border bg-surface px-3 py-2 text-[13.5px] outline-none placeholder:text-ink-faint focus:border-accent"
            />
          </div>

          <button
            type="submit"
            className="mt-1.5 rounded-md bg-accent py-2 text-[13.5px] font-medium text-accent-ink transition-opacity hover:opacity-90"
          >
            Create account
          </button>
        </form>

        {error && (
          <p className="mt-3 rounded-md border border-[#D64545]/30 bg-[#D64545]/10 px-3 py-2 text-[12.5px] font-medium text-[#D64545]">
            {error}
          </p>
        )}

        <p className="mt-5 text-center text-[13px] text-ink-faint">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
