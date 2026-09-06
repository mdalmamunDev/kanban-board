import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { invalidateBoard } from "../lib/cache";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/HttpError";
import { boardMemberIds, canWrite, getBoardForUser } from "../utils/access";
import { toTaskDTO } from "../utils/dto";

/** POST /api/columns/:id/tasks - create a task at the bottom of a column. */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const columnId = req.params.id;
  const { title } = req.body as { title: string };

  const column = await prisma.column.findUnique({ where: { id: columnId } });
  if (!column) throw new HttpError(404, "Column not found.");
  const { role } = await getBoardForUser(column.boardId, req.user!.id);
  if (!canWrite(role)) throw new HttpError(403, "Viewers cannot create tasks.");

  const max = await prisma.task.aggregate({ where: { columnId }, _max: { order: true } });
  const nextOrder = (max._max.order ?? -1) + 1;

  const task = await prisma.$transaction(async (tx) => {
    // Atomic per-board counter -> human-friendly keys like "BIL-152".
    const board = await tx.board.update({
      where: { id: column.boardId },
      data: { keySequence: { increment: 1 } },
    });
    return tx.task.create({
      data: {
        key: `${board.keyPrefix}-${board.keySequence}`,
        boardId: column.boardId,
        columnId,
        title,
        order: nextOrder,
      },
      include: { labels: true, assignees: true },
    });
  });

  await invalidateBoard(column.boardId, await boardMemberIds(column.boardId));
  res.status(201).json({ task: toTaskDTO(task) });
});

/** PATCH /api/tasks/:id - edit fields, labels and assignees. */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) throw new HttpError(404, "Task not found.");
  const { role } = await getBoardForUser(task.boardId, req.user!.id);
  if (!canWrite(role)) throw new HttpError(403, "Viewers cannot edit tasks.");

  const body = req.body as {
    title?: string;
    description?: string | null;
    priority?: "low" | "medium" | "high" | "urgent";
    dueDate?: string | null;
    labelIds?: string[];
    assigneeIds?: string[];
    subtasksDone?: number;
    subtasksTotal?: number;
    commentCount?: number;
  };

  const data: Prisma.TaskUpdateInput = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.subtasksDone !== undefined) data.subtasksDone = body.subtasksDone;
  if (body.subtasksTotal !== undefined) data.subtasksTotal = body.subtasksTotal;
  if (body.commentCount !== undefined) data.commentCount = body.commentCount;
  if (body.labelIds !== undefined) {
    const valid = await prisma.label.count({
      where: { boardId: task.boardId, id: { in: body.labelIds } },
    });
    if (valid !== new Set(body.labelIds).size) {
      throw new HttpError(400, "One or more labels do not belong to this board.");
    }
    data.labels = {
      set: body.labelIds.map(
        (labelId) => ({ taskId_labelId: { taskId: task.id, labelId } })
      ),
    };
  }
  if (body.assigneeIds !== undefined) {
    const valid = await prisma.boardMember.count({
      where: { boardId: task.boardId, userId: { in: body.assigneeIds } },
    });
    if (valid !== new Set(body.assigneeIds).size) {
      throw new HttpError(400, "Assignees must be members of this board.");
    }
    data.assignees = {
      set: body.assigneeIds.map(
        (userId) => ({ taskId_userId: { taskId: task.id, userId } })
      ),
    };
  }
  if (Object.keys(data).length === 0) throw new HttpError(400, "Nothing to update.");

  const updated = await prisma.task.update({
    where: { id: task.id },
    data,
    include: { labels: true, assignees: true },
  });
  await invalidateBoard(task.boardId, await boardMemberIds(task.boardId));
  res.json({ task: toTaskDTO(updated) });
});

/** DELETE /api/tasks/:id */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) throw new HttpError(404, "Task not found.");
  const { role } = await getBoardForUser(task.boardId, req.user!.id);
  if (!canWrite(role)) throw new HttpError(403, "Viewers cannot delete tasks.");

  await prisma.task.delete({ where: { id: task.id } });
  await invalidateBoard(task.boardId, await boardMemberIds(task.boardId));
  res.status(204).send();
});

/**
 * PATCH /api/tasks/:id/move - body: { toColumnId, toIndex }.
 * Re-orders the task within/across columns in a single transaction, re-flowing
 * the `order` of every affected sibling (matches the frontend moveTask contract).
 */
export const move = asyncHandler(async (req: Request, res: Response) => {
  const taskId = req.params.id;
  const { toColumnId, toIndex } = req.body as { toColumnId: string; toIndex: number };

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new HttpError(404, "Task not found.");

  const targetColumn = await prisma.column.findUnique({ where: { id: toColumnId } });
  if (!targetColumn || targetColumn.boardId !== task.boardId) {
    throw new HttpError(400, "Target column does not belong to this board.");
  }

  const { role } = await getBoardForUser(task.boardId, req.user!.id);
  if (!canWrite(role)) throw new HttpError(403, "Viewers cannot move tasks.");

  const updated = await prisma.$transaction(async (tx) => {
    if (task.columnId === toColumnId) {
      // Reorder within the same column.
      const siblings = await tx.task.findMany({
        where: { columnId: toColumnId },
        orderBy: { order: "asc" },
      });
      const ordered = siblings.filter((t) => t.id !== taskId);
      ordered.splice(toIndex, 0, task);
      for (let i = 0; i < ordered.length; i++) {
        if (ordered[i].order !== i) {
          await tx.task.update({ where: { id: ordered[i].id }, data: { order: i } });
        }
      }
    } else {
      // Close the gap in the source column...
      const source = await tx.task.findMany({
        where: { columnId: task.columnId },
        orderBy: { order: "asc" },
      });
      const remaining = source.filter((t) => t.id !== taskId);
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].order !== i) {
          await tx.task.update({ where: { id: remaining[i].id }, data: { order: i } });
        }
      }
      // ...then insert into the target column at toIndex and re-flow it.
      const target = await tx.task.findMany({
        where: { columnId: toColumnId },
        orderBy: { order: "asc" },
      });
      target.splice(toIndex, 0, task);
      for (let i = 0; i < target.length; i++) {
        const t = target[i];
        if (t.id === taskId) {
          if (t.order !== i || t.columnId !== toColumnId) {
            await tx.task.update({
              where: { id: t.id },
              data: { order: i, columnId: toColumnId },
            });
          }
        } else if (t.order !== i) {
          await tx.task.update({ where: { id: t.id }, data: { order: i } });
        }
      }
    }
    return tx.task.findUnique({
      where: { id: taskId },
      include: { labels: true, assignees: true },
    });
  });

  await invalidateBoard(task.boardId, await boardMemberIds(task.boardId));
  res.json({ task: toTaskDTO(updated!) });
});
