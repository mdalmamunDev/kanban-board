"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { useBoardStore } from "@/lib/store";

export function AddTaskInline({ columnId, onCreated }: { columnId: string; onCreated?: (taskId: string) => void }) {
  const { createTask } = useBoardStore();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  const submit = async () => {
    if (isSubmitting) return;
    const title = value.trim();
    if (!title) {
      setOpen(false);
      setValue("");
      return;
    }
    setIsSubmitting(true);
    try {
      const task = await createTask(columnId, title);
      setValue("");
      if (task) onCreated?.(task.id);
    } finally {
      setIsSubmitting(false);
    }
    ref.current?.focus();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md px-2 py-2 text-left text-[12.5px] font-medium text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <Plus size={14} />
        Add task
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-accent bg-surface p-2 shadow-card">
      <textarea
        ref={ref}
        value={value}
        disabled={isSubmitting}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
          if (e.key === "Escape") {
            setOpen(false);
            setValue("");
          }
        }}
        placeholder="Task title"
        rows={2}
        className="resize-none bg-transparent text-[13px] outline-none placeholder:text-ink-faint disabled:opacity-60"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => void submit()}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-[12px] font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
          {isSubmitting ? "Adding..." : "Add task"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setValue("");
          }}
          disabled={isSubmitting}
          className="flex h-6 w-6 items-center justify-center rounded text-ink-faint hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Cancel"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
