"use client";

import { useState } from "react";
import { useBoardStore } from "@/lib/store";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { BoardView } from "@/components/board/board-view";

export default function Home() {
  const { boards } = useBoardStore();
  const [activeBoardId, setActiveBoardId] = useState(boards[0]?.id ?? "");
  const [search, setSearch] = useState("");

  const board = boards.find((b) => b.id === activeBoardId) ?? boards[0];

  if (!board) {
    return (
      <div className="flex h-screen items-center justify-center text-ink-muted">
        No boards yet.
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar activeBoardId={board.id} onSelectBoard={setActiveBoardId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar board={board} search={search} onSearchChange={setSearch} />
        <main className="min-h-0 flex-1">
          <BoardView board={board} search={search} />
        </main>
      </div>
    </div>
  );
}
