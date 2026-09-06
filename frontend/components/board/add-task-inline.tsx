"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useBoardStore } from "@/lib/store";

export function AddTaskInline({ columnId, onCreated }: { columnId: string; onCreated?: (taskId: string) => void }) {
  const { createTask } = useBoardStore();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  const submit = async () => {
    const title = value.trim();
    if (!title) {
      setOpen(false);
      setValue("");
      return;
    }
    const task = await createTask(columnId, title);
    setValue("");
    if (task) onCreated?.(task.id);
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
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            setOpen(false);
            setValue("");
          }
        }}
        placeholder="Task title"
        rows={2}
        className="resize-none bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          className="rounded-md bg-accent px-2.5 py-1 text-[12px] font-medium text-accent-ink hover:opacity-90"
        >
          Add task
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setValue("");
          }}
          className="flex h-6 w-6 items-center justify-center rounded text-ink-faint hover:bg-surface-2 hover:text-ink"
          aria-label="Cancel"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
