"use client";

import { useState } from "react";
import { Search, UserPlus, Lock } from "lucide-react";
import { Board } from "@/lib/types";
import { useBoardStore } from "@/lib/store";
import { AvatarStack } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { InviteDialog } from "@/components/board/invite-dialog";

export function TopBar({ board, search, onSearchChange }: { board: Board; search: string; onSearchChange: (v: string) => void }) {
  const { getUser, currentUserId } = useBoardStore();
  const [inviteOpen, setInviteOpen] = useState(false);

  const memberUsers = board.members
    .map((m) => getUser(m.userId))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));

  const myRole = board.members.find((m) => m.userId === currentUserId)?.role ?? "viewer";

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-5">
      <div className="flex min-w-0 flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <h1 className="truncate text-[14px] font-semibold leading-tight">{board.name}</h1>
          {myRole === "viewer" && (
            <span title="You have view-only access" className="text-ink-faint">
              <Lock size={11} />
            </span>
          )}
        </div>
        {board.description && (
          <p className="truncate text-[12px] leading-tight text-ink-faint">{board.description}</p>
        )}
      </div>

      <div className="relative ml-2 hidden max-w-xs flex-1 sm:block">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search this board"
          className="w-full rounded-md border border-border bg-surface-2 py-1.5 pl-8 pr-3 text-[12.5px] outline-none placeholder:text-ink-faint focus:border-accent focus:bg-surface"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12.5px] font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
        >
          <UserPlus size={13} />
          Invite
        </button>

        <AvatarStack users={memberUsers} max={4} />

        <div className="h-5 w-px bg-border" />

        <ThemeToggle />
      </div>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} board={board} />
    </header>
  );
}
