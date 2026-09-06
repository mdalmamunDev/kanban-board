"use client";

import { useState } from "react";
import clsx from "clsx";
import { ChevronsLeft, ChevronsRight, Plus, Trello, Users } from "lucide-react";
import { useBoardStore } from "@/lib/store";
import { NewBoardDialog } from "@/components/board/new-board-dialog";

export function Sidebar({
  activeBoardId,
  onSelectBoard,
}: {
  activeBoardId: string;
  onSelectBoard: (id: string) => void;
}) {
  const { myBoards, sharedBoards } = useBoardStore();
  const [collapsed, setCollapsed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <aside
      className={clsx(
        "flex h-full shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200",
        collapsed ? "w-[64px]" : "w-[248px]"
      )}
    >
      <div className={clsx("flex h-14 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-ink">
          <Trello size={15} strokeWidth={2.2} />
        </div>
        {!collapsed && <span className="text-[14px] font-semibold tracking-tight">Northline</span>}
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin px-2 pt-2">
        {!collapsed && (
          <div className="flex items-center justify-between px-2 pb-1.5 pt-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
              Boards
            </span>
            <button
              onClick={() => setDialogOpen(true)}
              className="flex h-5 w-5 items-center justify-center rounded text-ink-faint hover:bg-surface-2 hover:text-ink"
              aria-label="Create board"
            >
              <Plus size={13} strokeWidth={2.4} />
            </button>
          </div>
        )}

        <nav className="flex flex-col gap-0.5">
          {myBoards.map((board) => {
            const active = board.id === activeBoardId;
            return (
              <button
                key={board.id}
                onClick={() => onSelectBoard(board.id)}
                title={board.name}
                className={clsx(
                  "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
                  collapsed && "justify-center px-0 py-2",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                )}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: board.color }}
                />
                {!collapsed && <span className="truncate font-medium">{board.name}</span>}
              </button>
            );
          })}
        </nav>

        {sharedBoards.length > 0 && (
          <>
            {!collapsed && (
              <div className="flex items-center gap-1.5 px-2 pb-1.5 pt-3">
                <Users size={12} strokeWidth={2.2} className="text-ink-faint" />
                <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  Shared with me
                </span>
              </div>
            )}
            <nav className="flex flex-col gap-0.5">
              {sharedBoards.map((board) => {
                const active = board.id === activeBoardId;
                return (
                  <button
                    key={board.id}
                    onClick={() => onSelectBoard(board.id)}
                    title={board.name}
                    className={clsx(
                      "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
                      collapsed && "justify-center px-0 py-2",
                      active
                        ? "bg-accent-soft text-accent"
                        : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                    )}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: board.color }}
                    />
                    {!collapsed && <span className="truncate font-medium">{board.name}</span>}
                  </button>
                );
              })}
            </nav>
          </>
        )}

        {collapsed && (
          <button
            onClick={() => setDialogOpen(true)}
            className="mt-2 flex h-8 w-8 items-center justify-center self-center rounded-md text-ink-faint hover:bg-surface-2 hover:text-ink"
            aria-label="Create board"
          >
            <Plus size={15} />
          </button>
        )}
      </div>

      <div className="border-t border-border p-2">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={clsx(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-ink-faint hover:bg-surface-2 hover:text-ink",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
          {!collapsed && "Collapse"}
        </button>
      </div>

      <NewBoardDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(id) => onSelectBoard(id)}
      />
    </aside>
  );
}
