"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useBoardStore } from "@/lib/store";
import { Column } from "@/lib/types";

export function ColumnMenu({ column, onRename }: { column: Column; onRename: () => void }) {
  const { deleteColumn, getColumnTasks } = useBoardStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const taskCount = getColumnTasks(column.id).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-6 w-6 items-center justify-center rounded text-ink-faint hover:bg-surface-2 hover:text-ink"
        aria-label="Column options"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 w-44 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-popover animate-pop-in">
          <button
            onClick={() => {
              onRename();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-ink hover:bg-surface-2"
          >
            <Pencil size={13} />
            Rename column
          </button>
          <button
            onClick={() => {
              if (taskCount === 0 || confirm(`Delete "${column.title}" and its ${taskCount} task(s)?`)) {
                deleteColumn(column.id);
              }
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-danger hover:bg-danger-soft"
          >
            <Trash2 size={13} />
            Delete column
          </button>
        </div>
      )}
    </div>
  );
}
