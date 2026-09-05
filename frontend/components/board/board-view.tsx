"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useBoardStore } from "@/lib/store";
import { Board, Task } from "@/lib/types";
import { ColumnView } from "./column-view";
import { AddColumn } from "./add-column";
import { TaskCardOverlay } from "./task-card";
import { TaskDetailDrawer } from "@/components/task/task-detail-drawer";

export function BoardView({ board, search }: { board: Board; search: string }) {
  const { getBoardColumns, tasks, moveTask } = useBoardStore();
  const columns = useMemo(() => getBoardColumns(board.id), [getBoardColumns, board.id]);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Unfiltered, canonically ordered lists — used for drag math so reordering
  // stays correct even while a search filter hides some cards.
  const tasksByColumn = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const col of columns) {
      map.set(
        col.id,
        tasks.filter((t) => t.columnId === col.id).sort((a, b) => a.order - b.order)
      );
    }
    return map;
  }, [columns, tasks]);

  const query = search.trim().toLowerCase();
  const visibleTasksByColumn = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const [colId, list] of tasksByColumn) {
      map.set(
        colId,
        query
          ? list.filter(
              (t) => t.title.toLowerCase().includes(query) || t.key.toLowerCase().includes(query)
            )
          : list
      );
    }
    return map;
  }, [tasksByColumn, query]);

  function findTask(id: string): Task | null {
    return tasks.find((t) => t.id === id) ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(findTask(String(event.active.id)));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeTaskItem = findTask(activeId);
    if (!activeTaskItem) return;

    const overIsColumn = columns.some((c) => c.id === overId);
    const overTask = overIsColumn ? null : findTask(overId);

    let targetColumnId: string;
    let targetIndex: number;

    if (overIsColumn) {
      targetColumnId = overId;
      targetIndex = (tasksByColumn.get(overId) ?? []).length;
    } else if (overTask) {
      targetColumnId = overTask.columnId;
      const list = tasksByColumn.get(targetColumnId) ?? [];
      const overIndex = list.findIndex((t) => t.id === overId);
      targetIndex = overIndex === -1 ? list.length : overIndex;
    } else {
      return;
    }

    if (activeTaskItem.columnId === targetColumnId) {
      const list = tasksByColumn.get(targetColumnId) ?? [];
      const currentIndex = list.findIndex((t) => t.id === activeId);
      if (currentIndex === targetIndex) return;
    }

    moveTask(activeId, targetColumnId, targetIndex);
  }

  function handleDragEnd(_event: DragEndEvent) {
    setActiveTask(null);
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="flex h-full items-start gap-3 overflow-x-auto scroll-thin px-5 py-4">
          {columns.map((column) => (
            <ColumnView
              key={column.id}
              column={column}
              tasks={visibleTasksByColumn.get(column.id) ?? []}
              onOpenTask={setOpenTaskId}
            />
          ))}
          <AddColumn boardId={board.id} />
        </div>

        <DragOverlay>{activeTask ? <TaskCardOverlay task={activeTask} /> : null}</DragOverlay>
      </DndContext>

      <TaskDetailDrawer taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </>
  );
}
