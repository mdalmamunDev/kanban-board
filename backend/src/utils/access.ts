import prisma from "../lib/prisma";
import { Board, Role } from "@prisma/client";
import { HttpError } from "./HttpError";

export interface BoardAccess {
  board: Board;
  role: Role;
}

/**
 * Fetch a board and verify the user is a member. Returns the board + the
 * user's role, or throws a 404/403 (no existence leak).
 */
export async function getBoardForUser(boardId: string, userId: string): Promise<BoardAccess> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { members: { select: { userId: true, role: true } } },
  });
  if (!board) throw new HttpError(404, "Board not found.");
  const member = board.members.find((m) => m.userId === userId);
  if (!member) throw new HttpError(403, "You don't have access to this board.");
  return { board, role: member.role };
}

export const canWrite = (role: Role): boolean => role === "owner" || role === "editor";
export const canAdmin = (role: Role): boolean => role === "owner";

/** All user ids that can currently see a board - used for cache invalidation. */
export async function boardMemberIds(boardId: string): Promise<string[]> {
  const rows = await prisma.boardMember.findMany({ where: { boardId }, select: { userId: true } });
  return rows.map((r) => r.userId);
}