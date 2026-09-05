export type Priority = "low" | "medium" | "high" | "urgent";

export type Role = "owner" | "editor" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string;
  color: string; // used for avatar background
  initials: string;
}

export interface Label {
  id: string;
  name: string;
  color: string; // hex, used for the pill
}

export interface Task {
  id: string;
  key: string; // short human id, e.g. "ENG-142"
  title: string;
  description?: string;
  columnId: string;
  order: number;
  priority: Priority;
  labelIds: string[];
  assigneeIds: string[];
  dueDate?: string; // ISO date
  subtasksDone?: number;
  subtasksTotal?: number;
  commentCount?: number;
}

export interface Column {
  id: string;
  title: string;
  order: number;
  color: string; // accent stripe on the column header
  wipLimit?: number;
}

export interface BoardMember {
  userId: string;
  role: Role;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  color: string;
  ownerId: string;
  members: BoardMember[];
  columnIds: string[];
}
