"use client";

import { useEffect, useRef, useState } from "react";
import { X, Trash2, ChevronDown, Check } from "lucide-react";
import clsx from "clsx";
import { useBoardStore } from "@/lib/store";
import { Priority } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { LabelPill } from "@/components/ui/label-pill";
import { priorityMeta } from "@/components/ui/priority";

export function TaskDetailDrawer({
  taskId,
  onClose,
}: {
  taskId: string | null;
  onClose: () => void;
}) {
  const { tasks, labels, users, columns, getBoardColumns, updateTask, deleteTask, boards } =
    useBoardStore();
  const task = tasks.find((t) => t.id === taskId);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
  const [labelMenuOpen, setLabelMenuOpen] = useState(false);
  const assigneeRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) {
        setAssigneeMenuOpen(false);
      }
      if (labelRef.current && !labelRef.current.contains(e.target as Node)) {
        setLabelMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!task) return null;

  const column = columns.find((c) => c.id === task.columnId);
  const board = boards.find((b) => b.columnIds.includes(task.columnId));
  const boardColumns = board ? getBoardColumns(board.id) : [];
  const assignees = task.assigneeIds
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));
  const taskLabels = labels.filter((l) => task.labelIds.includes(l.id));

  const toggleAssignee = (userId: string) => {
    const has = task.assigneeIds.includes(userId);
    updateTask(task.id, {
      assigneeIds: has
        ? task.assigneeIds.filter((id) => id !== userId)
        : [...task.assigneeIds, userId],
    });
  };

  const toggleLabel = (labelId: string) => {
    const has = task.labelIds.includes(labelId);
    updateTask(task.id, {
      labelIds: has ? task.labelIds.filter((id) => id !== labelId) : [...task.labelIds, labelId],
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-ink/20 animate-fade-in" onClick={onClose} aria-hidden />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-lift animate-slide-in-right">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] text-ink-faint">{task.key}</span>
            {column && (
              <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-muted">
                {column.title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (confirm("Delete this task?")) {
                  deleteTask(task.id);
                  onClose();
                }
              }}
              className="flex h-7 w-7 items-center justify-center rounded text-ink-faint hover:bg-danger-soft hover:text-danger"
              aria-label="Delete task"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded text-ink-faint hover:bg-surface-2 hover:text-ink"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4">
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && updateTask(task.id, { title: title.trim() })}
            rows={2}
            className="w-full resize-none bg-transparent text-[17px] font-semibold leading-snug outline-none"
          />

          <div className="mt-4 grid grid-cols-[88px_1fr] items-start gap-y-3 text-[13px]">
            <span className="pt-1.5 text-ink-faint">Priority</span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(priorityMeta) as Priority[]).map((p) => {
                const meta = priorityMeta[p];
                const active = task.priority === p;
                return (
                  <button
                    key={p}
                    onClick={() => updateTask(task.id, { priority: p })}
                    className={clsx(
                      "flex items-center gap-1 rounded-md border px-2 py-1 text-[12px] font-medium transition-colors",
                      active
                        ? "border-transparent"
                        : "border-border text-ink-muted hover:border-border-strong"
                    )}
                    style={active ? { backgroundColor: `${meta.color}1A`, color: meta.color } : undefined}
                  >
                    <meta.icon size={12} strokeWidth={2.4} />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            <span className="pt-1.5 text-ink-faint">Assignees</span>
            <div className="relative" ref={assigneeRef}>
              <button
                onClick={() => setAssigneeMenuOpen((o) => !o)}
                className="flex flex-wrap items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-[12px] text-ink-muted hover:border-border-strong"
              >
                {assignees.length === 0 && "Unassigned"}
                {assignees.map((a) => (
                  <span key={a.id} className="flex items-center gap-1">
                    <Avatar user={a} size="xs" />
                    {a.name.split(" ")[0]}
                  </span>
                ))}
                <ChevronDown size={12} className="ml-auto text-ink-faint" />
              </button>
              {assigneeMenuOpen && (
                <div className="absolute left-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-popover animate-pop-in">
                  {users.map((u) => {
                    const active = task.assigneeIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => toggleAssignee(u.id)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] hover:bg-surface-2"
                      >
                        <Avatar user={u} size="xs" />
                        <span className="flex-1 truncate">{u.name}</span>
                        {active && <Check size={13} className="text-accent" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <span className="pt-1.5 text-ink-faint">Labels</span>
            <div className="relative" ref={labelRef}>
              <button
                onClick={() => setLabelMenuOpen((o) => !o)}
                className="flex min-h-[30px] flex-wrap items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-[12px] hover:border-border-strong"
              >
                {taskLabels.length === 0 && <span className="text-ink-muted">None</span>}
                {taskLabels.map((l) => (
                  <LabelPill key={l.id} label={l} />
                ))}
                <ChevronDown size={12} className="ml-auto text-ink-faint" />
              </button>
              {labelMenuOpen && (
                <div className="absolute left-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-popover animate-pop-in">
                  {labels.map((l) => {
                    const active = task.labelIds.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        onClick={() => toggleLabel(l.id)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] hover:bg-surface-2"
                      >
                        <span className="flex-1">
                          <LabelPill label={l} />
                        </span>
                        {active && <Check size={13} className="text-accent" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <span className="pt-1.5 text-ink-faint">Due date</span>
            <input
              type="date"
              value={task.dueDate ?? ""}
              onChange={(e) => updateTask(task.id, { dueDate: e.target.value || undefined })}
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-[12.5px] outline-none focus:border-accent"
            />

            <span className="pt-1.5 text-ink-faint">Column</span>
            <div className="relative">
              <select
                value={task.columnId}
                onChange={(e) => updateTask(task.id, { columnId: e.target.value })}
                className="w-full appearance-none rounded-md border border-border bg-surface py-1.5 pl-2 pr-7 text-[12.5px] outline-none focus:border-accent"
              >
                {boardColumns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint" />
            </div>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-1.5 text-[12px] font-medium text-ink-faint">Description</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => updateTask(task.id, { description: description.trim() || undefined })}
              placeholder="Add a more detailed description..."
              rows={5}
              className="w-full resize-none rounded-md border border-border bg-surface p-2.5 text-[13px] leading-relaxed outline-none placeholder:text-ink-faint focus:border-accent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
