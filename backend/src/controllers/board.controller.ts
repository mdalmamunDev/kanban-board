import { Request, Response } from "express";
import { Role } from "@prisma/client";
import prisma from "../lib/prisma";
import { cacheGet, cacheSet, invalidateBoard } from "../lib/cache";
import { config } from "../config";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/HttpError";
import { boardMemberIds, canAdmin, canWrite, getBoardForUser } from "../utils/access";
import { BoardDTO, BoardSummaryDTO, boardInclude, toBoardDTO, toBoardSummaryDTO } from "../utils/dto";
import { deriveKeyPrefix } from "../utils/misc";

// Defaults applied to every newly created board (mirrors the frontend UX).
const DEFAULT_COLUMNS = [
  { title: "Backlog", order: 0, color: "#8F8F98" },
  { title: "In Progress", order: 1, color: "#5750F1" },
  { title: "Done", order: 2, color: "#2F9E5B" },
];

const DEFAULT_LABELS = [
  { name: "Bug", color: "#D64545" },
  { name: "Feature", color: "#2F9E5B" },
  { name: "Design", color: "#8B5CF6" },
  { name: "Improvement", color: "#3B82C4" },
];

/**
 * GET /api/boards/mine - boards owned by the current user.
 * Feeds the "Boards" sidebar list (future: GET /boards/mine).
 * Cached per-user in Redis; busted by invalidateBoard() on any mutation.
 */
export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const key = `boards:mine:${userId}`;

  const cached = await cacheGet<BoardSummaryDTO[]>(key);
  if (cached) {
    res.json({ boards: cached });
    return;
  }

  const boards = await prisma.board.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { members: true } } },
  });
  const dtos = boards.map(toBoardSummaryDTO);
  await cacheSet(key, dtos, config.REDIS_LIST_TTL);
  res.json({ boards: dtos });
});

/**
 * GET /api/boards/shared - boards the user is a member of but does not own.
 * Feeds the "Shared with me" sidebar list (future: GET /boards/shared).
 */
export const listShared = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const key = `boards:shared:${userId}`;

  const cached = await cacheGet<BoardSummaryDTO[]>(key);
  if (cached) {
    res.json({ boards: cached });
    return;
  }

  const boards = await prisma.board.findMany({
    where: { members: { some: { userId } }, ownerId: { not: userId } },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { members: true } } },
  });
  const dtos = boards.map(toBoardSummaryDTO);
  await cacheSet(key, dtos, config.REDIS_LIST_TTL);
  res.json({ boards: dtos });
});

/** POST /api/boards - create a board with owner membership + default columns/labels. */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name, description, color } = req.body as {
    name: string;
    description?: string;
    color?: string;
  };

  const board = await prisma.board.create({
    data: {
      name,
      description: description ?? null,
      color: color ?? "#5750F1",
      keyPrefix: deriveKeyPrefix(name),
      ownerId: userId,
      members: { create: { userId, role: "owner" } },
      columns: { create: DEFAULT_COLUMNS },
      labels: { create: DEFAULT_LABELS },
    },
  });

  await invalidateBoard(board.id, [userId]);
  const full = await prisma.board.findUnique({ where: { id: board.id }, include: boardInclude });
  res.status(201).json({ board: toBoardDTO(full!, "owner") });
});

/**
 * GET /api/boards/:id - full board payload (columns -> tasks -> labels/assignees).
 * Redis-cached: the heavy payload is user-independent, only "myRole" is
 * re-attached per request from the cheap membership lookup below.
 */
export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const boardId = req.params.id;
  const userId = req.user!.id;

  // Cheap composite-PK lookup - also decides 404 vs 403 without leaking existence.
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId } },
    select: { role: true },
  });
  if (!membership) {
    const exists = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true } });
    if (!exists) throw new HttpError(404, "Board not found.");
    throw new HttpError(403, "You don't have access to this board.");
  }

  const cached = await cacheGet<Omit<BoardDTO, "myRole">>(`board:${boardId}`);
  if (cached) {
    res.json({ board: { ...cached, myRole: membership.role } });
    return;
  }

  const board = await prisma.board.findUnique({ where: { id: boardId }, include: boardInclude });
  if (!board) throw new HttpError(404, "Board not found.");

  const dto = toBoardDTO(board, membership.role);
  const { myRole: _perRequest, ...cacheable } = dto;
  await cacheSet(`board:${boardId}`, cacheable, config.REDIS_CACHE_TTL);
  res.json({ board: dto });
});

/** PATCH /api/boards/:id - rename / re-describe / recolor. Editor+ required. */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const boardId = req.params.id;
  const { role } = await getBoardForUser(boardId, req.user!.id);
  if (!canWrite(role)) throw new HttpError(403, "Viewers cannot modify this board.");

  const { name, description, color } = req.body as {
    name?: string;
    description?: string;
    color?: string;
  };
  const data: { name?: string; description?: string; color?: string } = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (color !== undefined) data.color = color;
  if (Object.keys(data).length === 0) throw new HttpError(400, "Nothing to update.");

  await prisma.board.update({ where: { id: boardId }, data });
  await invalidateBoard(boardId, await boardMemberIds(boardId));
  const board = await prisma.board.findUnique({ where: { id: boardId }, include: boardInclude });
  res.json({ board: toBoardDTO(board!, role) });
});

/** DELETE /api/boards/:id - owner only. Cascades columns/tasks/members. */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  const boardId = req.params.id;
  const { role } = await getBoardForUser(boardId, req.user!.id);
  if (!canAdmin(role)) throw new HttpError(403, "Only the board owner can delete this board.");

  const memberIds = await boardMemberIds(boardId);
  await prisma.board.delete({ where: { id: boardId } });
  await invalidateBoard(boardId, memberIds);
  res.status(204).send();
});

/** POST /api/boards/:id/members - invite by email or userId. Editor+ required. */
export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const boardId = req.params.id;
  const me = req.user!.id;
  const { role: myRole } = await getBoardForUser(boardId, me);
  if (!canWrite(myRole)) throw new HttpError(403, "Viewers cannot invite members.");

  const { email, userId: targetId, role } = req.body as {
    email?: string;
    userId?: string;
    role: "editor" | "viewer";
  };

  const target = targetId
    ? await prisma.user.findUnique({ where: { id: targetId } })
    : await prisma.user.findUnique({ where: { email: (email as string).toLowerCase() } });
  if (!target) throw new HttpError(404, "No user found with that email.");

  const existing = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: target.id } },
  });
  if (existing) throw new HttpError(409, "That user is already a member of this board.");

  await prisma.boardMember.create({ data: { boardId, userId: target.id, role } });
  await invalidateBoard(boardId, [me, target.id]);
  const board = await prisma.board.findUnique({ where: { id: boardId }, include: boardInclude });
  res.status(201).json({ board: toBoardDTO(board!, myRole) });
});

/** PATCH /api/boards/:id/members/:userId - change a role. Owner only.
 *  role === "owner" performs an ownership transfer (old owner becomes editor). */
export const updateMember = asyncHandler(async (req: Request, res: Response) => {
  const boardId = req.params.id;
  const targetUserId = req.params.userId;
  const me = req.user!.id;
  const { role: myRole } = await getBoardForUser(boardId, me);
  if (!canAdmin(myRole)) throw new HttpError(403, "Only the board owner can change member roles.");
  if (targetUserId === me) throw new HttpError(400, "You cannot change your own role.");

  const { role } = req.body as { role: Role };

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: targetUserId } },
  });
  if (!membership) throw new HttpError(404, "That user is not a member of this board.");

  let myRoleAfter: Role = myRole;
  if (role === "owner") {
    await prisma.$transaction([
      prisma.boardMember.update({
        where: { boardId_userId: { boardId, userId: targetUserId } },
        data: { role: "owner" },
      }),
      prisma.boardMember.update({
        where: { boardId_userId: { boardId, userId: me } },
        data: { role: "editor" },
      }),
      prisma.board.update({ where: { id: boardId }, data: { ownerId: targetUserId } }),
    ]);
    myRoleAfter = "editor";
  } else {
    await prisma.boardMember.update({
      where: { boardId_userId: { boardId, userId: targetUserId } },
      data: { role },
    });
  }

  await invalidateBoard(boardId, await boardMemberIds(boardId));
  const board = await prisma.board.findUnique({ where: { id: boardId }, include: boardInclude });
  res.json({ board: toBoardDTO(board!, myRoleAfter) });
});

/** DELETE /api/boards/:id/members/:userId - owner removes anyone; members may leave. */
export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const boardId = req.params.id;
  const targetUserId = req.params.userId;
  const me = req.user!.id;
  const { board, role: myRole } = await getBoardForUser(boardId, me);

  if (targetUserId === board.ownerId) {
    throw new HttpError(400, "The board owner cannot be removed. Transfer ownership first.");
  }
  const isSelf = targetUserId === me;
  if (!canAdmin(myRole) && !isSelf) {
    throw new HttpError(403, "Only the board owner can remove members.");
  }

  await prisma.boardMember.delete({
    where: { boardId_userId: { boardId, userId: targetUserId } },
  });
  await invalidateBoard(boardId, [...(await boardMemberIds(boardId)), targetUserId]);
  res.status(204).send();
});

/** PATCH /api/boards/:id/columns/reorder - set column order to the given id order. */
export const reorderColumns = asyncHandler(async (req: Request, res: Response) => {
  const boardId = req.params.id;
  const { role } = await getBoardForUser(boardId, req.user!.id);
  if (!canWrite(role)) throw new HttpError(403, "Viewers cannot reorder columns.");

  const { columnIds } = req.body as { columnIds: string[] };
  const boardColumns = await prisma.column.findMany({ where: { boardId }, select: { id: true } });
  const owned = new Set(boardColumns.map((c) => c.id));
  if (columnIds.some((id) => !owned.has(id))) {
    throw new HttpError(400, "One or more columns do not belong to this board.");
  }
  if (new Set(columnIds).size !== columnIds.length) {
    throw new HttpError(400, "columnIds must not contain duplicates.");
  }

  await prisma.$transaction(
    columnIds.map((id, order) => prisma.column.update({ where: { id }, data: { order } }))
  );
  await invalidateBoard(boardId, await boardMemberIds(boardId));
  const board = await prisma.board.findUnique({ where: { id: boardId }, include: boardInclude });
  res.json({ board: toBoardDTO(board!, role) });
});
