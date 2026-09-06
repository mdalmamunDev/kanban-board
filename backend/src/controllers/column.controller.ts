import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { invalidateBoard } from "../lib/cache";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/HttpError";
import { boardMemberIds, canWrite, getBoardForUser } from "../utils/access";

/** POST /api/boards/:id/columns - append a column at the end of the board. */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const boardId = req.params.id;
  const { title } = req.body as { title: string };
  const { role } = await getBoardForUser(boardId, req.user!.id);
  if (!canWrite(role)) throw new HttpError(403, "Viewers cannot add columns.");

  const max = await prisma.column.aggregate({ where: { boardId }, _max: { order: true } });
  const column = await prisma.column.create({
    data: { boardId, title, order: (max._max.order ?? -1) + 1 },
  });

  await invalidateBoard(boardId, await boardMemberIds(boardId));
  res.status(201).json({
    column: {
      id: column.id,
      title: column.title,
      order: column.order,
      color: column.color,
      wipLimit: column.wipLimit,
      tasks: [],
    },
  });
});

/** PATCH /api/columns/:id - rename / recolor / set WIP limit. */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const column = await prisma.column.findUnique({ where: { id: req.params.id } });
  if (!column) throw new HttpError(404, "Column not found.");
  const { role } = await getBoardForUser(column.boardId, req.user!.id);
  if (!canWrite(role)) throw new HttpError(403, "Viewers cannot modify columns.");

  const { title, color, wipLimit } = req.body as {
    title?: string;
    color?: string;
    wipLimit?: number | null;
  };
  const data: { title?: string; color?: string; wipLimit?: number | null } = {};
  if (title !== undefined) data.title = title;
  if (color !== undefined) data.color = color;
  if (wipLimit !== undefined) data.wipLimit = wipLimit;
  if (Object.keys(data).length === 0) throw new HttpError(400, "Nothing to update.");

  const updated = await prisma.column.update({ where: { id: column.id }, data });
  await invalidateBoard(column.boardId, await boardMemberIds(column.boardId));
  res.json({
    column: {
      id: updated.id,
      title: updated.title,
      order: updated.order,
      color: updated.color,
      wipLimit: updated.wipLimit,
    },
  });
});

/** DELETE /api/columns/:id - cascades its tasks. Keeps the last column alive. */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  const column = await prisma.column.findUnique({ where: { id: req.params.id } });
  if (!column) throw new HttpError(404, "Column not found.");
  const { role } = await getBoardForUser(column.boardId, req.user!.id);
  if (!canWrite(role)) throw new HttpError(403, "Viewers cannot delete columns.");

  const count = await prisma.column.count({ where: { boardId: column.boardId } });
  if (count <= 1) throw new HttpError(400, "A board must keep at least one column.");

  await prisma.column.delete({ where: { id: column.id } });
  await invalidateBoard(column.boardId, await boardMemberIds(column.boardId));
  res.status(204).send();
});