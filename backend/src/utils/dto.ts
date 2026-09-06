import { Prisma, Role, User } from "@prisma/client";

// Relation include used for every full-board fetch (get / create / update).
export const boardInclude = {
  members: { include: { user: true } },
  labels: { orderBy: { name: "asc" as const } },
  columns: {
    orderBy: { order: "asc" as const },
    include: {
      tasks: {
        orderBy: { order: "asc" as const },
        include: { labels: true, assignees: true },
      },
    },
  },
} satisfies Prisma.BoardInclude;

export type BoardWithRelations = Prisma.BoardGetPayload<{ include: typeof boardInclude }>;

export function toUserDTO(user: User) {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

export interface BoardSummaryDTO {
  id: string;
  name: string;
  description: string | null;
  color: string;
  ownerId: string;
  keyPrefix: string;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toBoardSummaryDTO(
  board: Prisma.BoardGetPayload<{ include: { _count: { select: { members: boolean } } } }>
): BoardSummaryDTO {
  return {
    id: board.id,
    name: board.name,
    description: board.description,
    color: board.color,
    ownerId: board.ownerId,
    keyPrefix: board.keyPrefix,
    memberCount: board._count.members,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };
}

export interface BoardDTO {
  id: string;
  name: string;
  description: string | null;
  color: string;
  ownerId: string;
  keyPrefix: string;
  myRole: Role;
  createdAt: Date;
  updatedAt: Date;
  members: Array<{
    userId: string;
    role: Role;
    user: { id: string; name: string; email: string; color: string; initials: string };
  }>;
  labels: Array<{ id: string; name: string; color: string }>;
  columns: Array<{
    id: string;
    title: string;
    order: number;
    color: string;
    wipLimit: number | null;
    tasks: Array<{
      id: string;
      key: string;
      title: string;
      description: string | null;
      order: number;
      priority: string;
      dueDate: string | null;
      subtasksDone: number;
      subtasksTotal: number;
      commentCount: number;
      labelIds: string[];
      assigneeIds: string[];
    }>;
  }>;
}

export function toBoardDTO(board: BoardWithRelations, myRole: Role): BoardDTO {
  return {
    id: board.id,
    name: board.name,
    description: board.description,
    color: board.color,
    ownerId: board.ownerId,
    keyPrefix: board.keyPrefix,
    myRole,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
    members: board.members.map((m) => ({
      userId: m.userId,
      role: m.role,
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        color: m.user.color,
        initials: m.user.initials,
      },
    })),
    labels: board.labels.map((l) => ({ id: l.id, name: l.name, color: l.color })),
    columns: board.columns.map((c) => ({
      id: c.id,
      title: c.title,
      order: c.order,
      color: c.color,
      wipLimit: c.wipLimit,
      tasks: c.tasks.map((t) => ({
        id: t.id,
        key: t.key,
        title: t.title,
        description: t.description,
        order: t.order,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        subtasksDone: t.subtasksDone,
        subtasksTotal: t.subtasksTotal,
        commentCount: t.commentCount,
        labelIds: t.labels.map((l) => l.labelId),
        assigneeIds: t.assignees.map((a) => a.userId),
      })),
    })),
  };
}

export type TaskWithRelations = Prisma.TaskGetPayload<{ include: { labels: true; assignees: true } }>;

export interface TaskDTO {
  id: string;
  key: string;
  title: string;
  description: string | null;
  order: number;
  priority: string;
  dueDate: string | null;
  subtasksDone: number;
  subtasksTotal: number;
  commentCount: number;
  labelIds: string[];
  assigneeIds: string[];
}

export function toTaskDTO(t: TaskWithRelations): TaskDTO {
  return {
    id: t.id,
    key: t.key,
    title: t.title,
    description: t.description,
    order: t.order,
    priority: t.priority,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    subtasksDone: t.subtasksDone,
    subtasksTotal: t.subtasksTotal,
    commentCount: t.commentCount,
    labelIds: t.labels.map((l) => l.labelId),
    assigneeIds: t.assignees.map((a) => a.userId),
  };
}