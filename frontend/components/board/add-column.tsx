"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useBoardStore } from "@/lib/store";

export function AddColumn({ boardId }: { boardId: string }) {
  const { addColumn } = useBoardStore();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  const submit = () => {
    const title = value.trim();
    if (title) addColumn(boardId, title);
    setValue("");
    setOpen(false);
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
    <div className="flex h-11 w-[280px] shrink-0 items-center gap-1.5 rounded-lg border border-accent bg-surface px-2 shadow-card">
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setValue("");
            setOpen(false);
          }
        }}
        placeholder="Column name"
        className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
      />
      <button
        onClick={submit}
        className="rounded-md bg-accent px-2 py-1 text-[12px] font-medium text-accent-ink hover:opacity-90"
      >
        Add
      </button>
      <button
        onClick={() => {
          setValue("");
          setOpen(false);
        }}
        className="flex h-6 w-6 items-center justify-center rounded text-ink-faint hover:bg-surface-2 hover:text-ink"
        aria-label="Cancel"
      >
        <X size={14} />
      </button>
    </div>
  );
}
