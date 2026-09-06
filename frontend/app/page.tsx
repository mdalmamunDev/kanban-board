"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBoardStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { BoardView } from "@/components/board/board-view";
import { NewBoardDialog } from "@/components/board/new-board-dialog";

export default function Home() {
  const router = useRouter();
  const { user, status } = useAuth();
  const { boards, boardsLoading } = useBoardStore();
  const [activeBoardId, setActiveBoardId] = useState(boards[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [newBoardOpen, setNewBoardOpen] = useState(false);

  useEffect(() => {
    if (status === "ready" && !user) {
      router.replace("/login");
    }
  }, [status, user, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (!user) {
    // Redirecting to /login (see effect above).
    return null;
  }

  const board = boards.find((b) => b.id === activeBoardId) ?? boards[0];

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar activeBoardId={board?.id ?? ""} onSelectBoard={setActiveBoardId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar board={board} search={search} onSearchChange={setSearch} />
        <main className="min-h-0 flex-1">
          {board ? (
            <BoardView board={board} search={search} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center bg-bg px-6 text-center">
              {boardsLoading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
              ) : (
                <>
                  <h1 className="text-lg font-semibold text-ink">Create your first board</h1>
                  <p className="mt-2 max-w-sm text-sm text-ink-muted">
                    Boards keep your team&apos;s work organized. Start with a board for a project,
                    product, or workflow.
                  </p>
                  <button
                    onClick={() => setNewBoardOpen(true)}
                    className="mt-5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
                  >
                    Create board
                  </button>
                </>
              )}
            </div>
          )}
        </main>
      </div>
      <NewBoardDialog
        open={newBoardOpen}
        onClose={() => setNewBoardOpen(false)}
        onCreated={(id) => {
          setActiveBoardId(id);
          setNewBoardOpen(false);
        }}
      />
    </div>
  );
}
