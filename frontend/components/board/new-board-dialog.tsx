"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import clsx from "clsx";
import { useBoardStore } from "@/lib/store";

const COLORS = ["#5750F1", "#3B82C4", "#2F9E5B", "#C97B1D", "#D64545", "#8B5CF6"];

export function NewBoardDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (boardId: string) => void;
}) {
  const { createBoard } = useBoardStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const board = await createBoard(name.trim(), description.trim(), color);
      if (!board) return;
      setName("");
      setDescription("");
      setColor(COLORS[0]);
      onClose();
      onCreated(board.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create board.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 animate-fade-in">
      <div
        className="absolute inset-0"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-popover animate-pop-in">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">New board</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-6 w-6 items-center justify-center rounded text-ink-faint hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-ink-muted" htmlFor="board-name">
              Board name
            </label>
            <input
              id="board-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mobile App Redesign"
              className="rounded-md border border-border bg-surface px-3 py-2 text-[13px] outline-none placeholder:text-ink-faint focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-ink-muted" htmlFor="board-desc">
              Description
            </label>
            <textarea
              id="board-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this board for?"
              rows={2}
              className="resize-none rounded-md border border-border bg-surface px-3 py-2 text-[13px] outline-none placeholder:text-ink-faint focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-ink-muted">Color</span>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`Choose color ${c}`}
                  className={clsx(
                    "h-6 w-6 rounded-full transition-transform",
                    color === c && "ring-2 ring-offset-2 ring-offset-surface"
                  )}
                  style={{ backgroundColor: c, ...(color === c ? { boxShadow: `0 0 0 2px rgb(var(--surface)), 0 0 0 4px ${c}` } : {}) }}
                />
              ))}
            </div>
          </div>

          <div className="mt-1.5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md px-3 py-1.5 text-[13px] font-medium text-ink-muted hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Creating..." : "Create board"}
            </button>
          </div>
        </form>

        {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
      </div>
    </div>
  );
}
