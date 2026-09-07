"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { useBoardStore } from "@/lib/store";

export function AddColumn({ boardId }: { boardId: string }) {
  const { addColumn } = useBoardStore();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  const submit = async () => {
    const title = value.trim();
    if (!title || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await addColumn(boardId, title);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setValue("");
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 w-[280px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-[13px] font-medium text-ink-faint transition-colors hover:border-border-strong hover:bg-surface-2 hover:text-ink"
      >
        <Plus size={15} />
        Add column
      </button>
    );
  }

  return (
    <div className="flex h-auto min-h-11 w-[280px] shrink-0 flex-col gap-1.5 rounded-lg border border-accent bg-surface px-2 py-2 shadow-card">
      <div className="flex items-center gap-1.5">
        <input
          ref={ref}
          value={value}
          disabled={isSubmitting}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
            if (e.key === "Escape") {
              setValue("");
              setError(null);
              setOpen(false);
            }
          }}
          placeholder="Column name"
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-faint disabled:opacity-60"
        />
        <button
          onClick={() => void submit()}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-md bg-accent px-2 py-1 text-[12px] font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
          {isSubmitting ? "Adding..." : "Add"}
        </button>
        <button
          onClick={() => {
            setValue("");
            setError(null);
            setOpen(false);
          }}
          disabled={isSubmitting}
          className="flex h-6 w-6 items-center justify-center rounded text-ink-faint hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Cancel"
        >
          <X size={14} />
        </button>
      </div>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}
