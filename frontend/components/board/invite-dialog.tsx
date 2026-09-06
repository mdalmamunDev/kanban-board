"use client";

import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { Board, Role } from "@/lib/types";
import { useBoardStore } from "@/lib/store";
import { Avatar } from "@/components/ui/avatar";

const roleLabel: Record<Role, string> = {
  owner: "Owner",
  editor: "Can edit",
  viewer: "Can view",
};

export function InviteDialog({
  open,
  onClose,
  board,
}: {
  open: boolean;
  onClose: () => void;
  board: Board;
}) {
  const { getUser, inviteMember } = useBoardStore();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setFeedback(null);
    setError(null);
    const result = await inviteMember(board.id, email.trim(), role);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFeedback(`${email.trim()} now has access to this board.`);
    setEmail("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-popover animate-pop-in">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Share &ldquo;{board.name}&rdquo;</h2>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-ink-faint hover:bg-surface-2 hover:text-ink"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={submit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Invite by email"
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-[13px] outline-none placeholder:text-ink-faint focus:border-accent"
          />
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
              className="h-full appearance-none rounded-md border border-border bg-surface py-2 pl-3 pr-7 text-[13px] outline-none focus:border-accent"
            >
              <option value="editor">Can edit</option>
              <option value="viewer">Can view</option>
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint" />
          </div>
          <button
            type="submit"
            disabled={!email.trim()}
            className="rounded-md bg-accent px-3.5 py-2 text-[13px] font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Invite
          </button>
        </form>
        {feedback && <p className="mt-2 text-[12px] text-ink-faint">{feedback}</p>}
        {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}

        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-2.5 text-[12px] font-medium uppercase tracking-wide text-ink-faint">
            People with access
          </p>
          <ul className="flex max-h-52 flex-col gap-2.5 overflow-y-auto scroll-thin pr-1">
            {board.members.map((m) => {
              const user = getUser(m.userId);
              if (!user) return null;
              return (
                <li key={m.userId} className="flex items-center gap-2.5">
                  <Avatar user={user} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium leading-tight">{user.name}</p>
                    <p className="truncate text-[11.5px] leading-tight text-ink-faint">{user.email}</p>
                  </div>
                  <span className="text-[12px] text-ink-faint">{roleLabel[m.role]}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
