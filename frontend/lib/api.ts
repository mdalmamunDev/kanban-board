import { Board, Column, Label, Task, User } from "./types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");
const TOKEN_KEY = "northline:token";

export interface BoardSummary {
  id: string;
  name: string;
  description: string | null;
  color: string;
  ownerId: string;
  keyPrefix: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ApiBoard {
  id: string;
  name: string;
  description: string | null;
  color: string;
  ownerId: string;
  keyPrefix: string;
  myRole: "owner" | "editor" | "viewer";
  members: Array<{ userId: string; role: "owner" | "editor" | "viewer"; user: User }>;
  labels: Label[];
  columns: Array<Column & { tasks: Array<Task & { description: string | null; dueDate: string | null }> }>;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResultBoard {
  board: Board;
}

export interface ApiResultTask {
  task: Task;
}

export interface ApiResultColumn {
  column: Column;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed with status ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function mapBoard(board: ApiBoard): Board {
  return {
    id: board.id,
    name: board.name,
    description: board.description ?? undefined,
    color: board.color,
    ownerId: board.ownerId,
    members: board.members.map(({ userId, role }) => ({ userId, role })),
    columnIds: board.columns.map((column) => column.id),
  };
}

export function mapBoardPayload(board: ApiBoard) {
  return {
    board: mapBoard(board),
    columns: board.columns.map(({ tasks: _tasks, ...column }) => column),
    tasks: board.columns.flatMap((column) =>
      column.tasks.map((task) => ({ ...task, description: task.description ?? undefined, dueDate: task.dueDate ?? undefined, columnId: column.id }))
    ),
    labels: board.labels,
    users: board.members.map((member) => member.user),
  };
}

export async function login(email: string, password: string) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(name: string, email: string, password: string) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function me() {
  return request<{ user: User }>("/auth/me");
}

export async function logout() {
  await request<void>("/auth/logout", { method: "POST" });
}

export async function listBoards() {
  const [mine, shared] = await Promise.all([
    request<{ boards: BoardSummary[] }>("/boards/mine"),
    request<{ boards: BoardSummary[] }>("/boards/shared"),
  ]);
  return { mine: mine.boards, shared: shared.boards };
}

export async function getBoard(boardId: string) {
  return request<ApiResultBoard & { board: ApiBoard }>(`/boards/${boardId}`);
}

export async function createBoard(name: string, description: string, color: string) {
  return request<ApiResultBoard & { board: ApiBoard }>("/boards", {
    method: "POST",
    body: JSON.stringify({ name, description, color }),
  });
}

export async function createColumn(boardId: string, title: string) {
  return request<ApiResultColumn>(`/boards/${boardId}/columns`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function updateColumn(columnId: string, title: string) {
  return request<ApiResultColumn>(`/columns/${columnId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function deleteColumn(columnId: string) {
  return request<void>(`/columns/${columnId}`, { method: "DELETE" });
}

export async function reorderColumns(boardId: string, columnIds: string[]) {
  return request<ApiResultBoard & { board: ApiBoard }>(`/boards/${boardId}/columns/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ columnIds }),
  });
}

export async function createTask(columnId: string, title: string) {
  return request<ApiResultTask>(`/columns/${columnId}/tasks`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function updateTask(taskId: string, patch: Partial<Task>) {
  const { columnId: _columnId, order: _order, key: _key, id: _id, ...body } = patch;
  return request<ApiResultTask>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteTask(taskId: string) {
  return request<void>(`/tasks/${taskId}`, { method: "DELETE" });
}

export async function moveTask(taskId: string, toColumnId: string, toIndex: number) {
  return request<ApiResultTask>(`/tasks/${taskId}/move`, {
    method: "PATCH",
    body: JSON.stringify({ toColumnId, toIndex }),
  });
}

export async function inviteMember(boardId: string, email: string, role: "editor" | "viewer") {
  return request<ApiResultBoard & { board: ApiBoard }>(`/boards/${boardId}/members`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}
