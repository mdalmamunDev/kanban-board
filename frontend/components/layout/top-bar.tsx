"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogOut, Search, UserPlus } from "lucide-react";
import { Board } from "@/lib/types";
import { useBoardStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { InviteDialog } from "@/components/board/invite-dialog";

export function TopBar({ board, search, onSearchChange }: { board?: Board; search: string; onSearchChange: (v: string) => void }) {
  const router = useRouter();
  const { getUser, currentUserId } = useBoardStore();
  const { user, logout } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    function onClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    router.push("/login");
  };

  const memberUsers = board
    ? board.members
        .map((m) => getUser(m.userId))
        .filter((u): u is NonNullable<typeof u> => Boolean(u))
    : [];

  const myRole = board?.members.find((m) => m.userId === currentUserId)?.role ?? "viewer";

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-5">
      <div className="flex min-w-0 flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <h1 className="truncate text-[14px] font-semibold leading-tight">{board?.name ?? "Your workspace"}</h1>
          {board && myRole === "viewer" && (
            <span title="You have view-only access" className="text-ink-faint">
              <Lock size={11} />
            </span>
          )}
        </div>
        {board?.description && (
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
          disabled={!board}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12.5px] font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
        >
          <UserPlus size={13} />
          Invite
        </button>

        <AvatarStack users={memberUsers} max={4} />

        <div className="h-5 w-px bg-border" />

        <ThemeToggle />

        {user && (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((o) => !o)}
              aria-label="Open profile menu"
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            >
              <Avatar user={user} size="sm" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 rounded-lg border border-border bg-surface p-1.5 shadow-popover animate-pop-in">
                <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
                  <Avatar user={user} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium leading-tight">{user.name}</p>
                    <p className="truncate text-[11.5px] leading-tight text-ink-faint">{user.email}</p>
                  </div>
                </div>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] font-medium text-ink-muted hover:bg-surface-2 hover:text-ink"
                >
                  <LogOut size={13} />
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {board && <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} board={board} />}
    </header>
  );
}
