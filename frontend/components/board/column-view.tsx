"use client";

import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import clsx from "clsx";
import { Column, Task } from "@/lib/types";
import { useBoardStore } from "@/lib/store";
import { TaskCard } from "./task-card";
import { AddTaskInline } from "./add-task-inline";
import { ColumnMenu } from "./column-menu";

export function ColumnView({
  column,
  tasks,
  onOpenTask,
}: {
  column: Column;
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
}) {
  const { renameColumn } = useBoardStore();
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: "column", columnId: column.id } });

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(column.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== column.title) renameColumn(column.id, trimmed);
    else setTitle(column.title);
    setEditing(false);
  };

  const overLimit = Boolean(column.wipLimit) && tasks.length > (column.wipLimit ?? Infinity);

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col rounded-lg bg-surface-2">
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
        {editing ? (
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setTitle(column.title);
                setEditing(false);
              }
            }}
            className="min-w-0 flex-1 rounded bg-surface px-1.5 py-0.5 text-[13px] font-semibold outline-none ring-1 ring-accent"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold text-ink"
          >
            {column.title}
          </button>
        )}
        <span
          className={clsx(
            "rounded-sm px-1.5 py-0.5 font-mono text-[11px] leading-none",
            overLimit ? "bg-danger-soft text-danger" : "bg-surface-3 text-ink-faint"
          )}
        >
          {tasks.length}
          {column.wipLimit ? `/${column.wipLimit}` : ""}
        </span>
        <ColumnMenu column={column} onRename={() => setEditing(true)} />
      </div>

      <div
        ref={setNodeRef}
        className={clsx(
          "flex min-h-[80px] flex-1 flex-col gap-2 overflow-y-auto scroll-thin rounded-md px-2 pb-1 transition-colors",
          isOver && "dnd-column-over"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={() => onOpenTask(task.id)} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border p-4 text-center text-[12px] text-ink-faint">
            No tasks yet
          </div>
        )}
      </div>

      <div className="px-2 pb-2.5 pt-1">
        <AddTaskInline columnId={column.id} />
      </div>
    </div>
  );
}
