"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, CheckSquare, MessageSquare } from "lucide-react";
import clsx from "clsx";
import { Task } from "@/lib/types";
import { useBoardStore } from "@/lib/store";
import { LabelPill } from "@/components/ui/label-pill";
import { AvatarStack } from "@/components/ui/avatar";
import { PriorityIcon } from "@/components/ui/priority";

function formatDueDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isOverdue(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function TaskCardBody({
  task,
  dragging = false,
}: {
  task: Task;
  dragging?: boolean;
}) {
  const { labels, getUser } = useBoardStore();
  const taskLabels = labels.filter((l) => task.labelIds.includes(l.id));
  const assignees = task.assigneeIds
    .map((id) => getUser(id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));

  const overdue = task.dueDate ? isOverdue(task.dueDate) : false;
  const hasFooter =
    taskLabels.length > 0 ||
    Boolean(task.dueDate) ||
    Boolean(task.subtasksTotal) ||
    Boolean(task.commentCount) ||
    assignees.length > 0;

  return (
    <div
      className={clsx(
        "flex flex-col gap-2 rounded-md border border-border bg-surface p-3 text-left shadow-card transition-shadow",
        dragging ? "rotate-[1.5deg] shadow-lift" : "hover:shadow-card-hover"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] text-ink-faint">{task.key}</span>
        <PriorityIcon priority={task.priority} />
      </div>

      <p className="text-[13px] font-medium leading-snug text-ink">{task.title}</p>

      {taskLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {taskLabels.map((l) => (
            <LabelPill key={l.id} label={l} />
          ))}
        </div>
      )}

      {hasFooter && (
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-ink-faint">
            {task.dueDate && (
              <span
                className={clsx(
                  "flex items-center gap-1 text-[11px]",
                  overdue && "font-medium text-danger"
                )}
              >
                <CalendarDays size={12} />
                {formatDueDate(task.dueDate)}
              </span>
            )}
            {Boolean(task.subtasksTotal) && (
              <span className="flex items-center gap-1 text-[11px]">
                <CheckSquare size={12} />
                {task.subtasksDone ?? 0}/{task.subtasksTotal}
              </span>
            )}
            {Boolean(task.commentCount) && (
              <span className="flex items-center gap-1 text-[11px]">
                <MessageSquare size={12} />
                {task.commentCount}
              </span>
            )}
          </div>
          {assignees.length > 0 && <AvatarStack users={assignees} max={3} />}
        </div>
      )}
    </div>
  );
}

export function TaskCard({ task, onOpen }: { task: Task; onOpen?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={clsx("cursor-pointer", isDragging && "opacity-0")}
    >
      <TaskCardBody task={task} />
    </div>
  );
}

export function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <div className="w-[276px] cursor-grabbing">
      <TaskCardBody task={task} dragging />
    </div>
  );
}
