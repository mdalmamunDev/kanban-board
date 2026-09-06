"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as api from "./api";
import { useAuth } from "./auth";
import { Board, Column, Label, Priority, Task, User } from "./types";

/**
 * ---------------------------------------------------------------------------
 * DATA LAYER
 * ---------------------------------------------------------------------------
 * The server owns persistence and ordering. The local state is hydrated from
 * full board responses and mutations use optimistic updates where the UI
 * already expects immediate drag-and-drop feedback.
 * ---------------------------------------------------------------------------
 */

interface BoardStoreValue {
  // Boards you own -> maps to future GET /boards/mine
  myBoards: Board[];
  // Boards shared with you -> maps to future GET /boards/shared
  sharedBoards: Board[];
  // Combined convenience list (my + shared) so existing consumers keep working.
  boards: Board[];
  columns: Column[];
  tasks: Task[];
  labels: Label[];
  users: User[];
  currentUserId: string;
  boardsLoading: boolean;

  getBoardColumns: (boardId: string) => Column[];
  getColumnTasks: (columnId: string) => Task[];
  getUser: (userId: string) => User | undefined;

  moveTask: (taskId: string, toColumnId: string, toIndex: number) => void;
  createTask: (columnId: string, title: string) => Promise<Task | undefined>;
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;

  addColumn: (boardId: string, title: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  renameColumn: (columnId: string, title: string) => void;
  deleteColumn: (columnId: string) => void;
  reorderColumns: (boardId: string, orderedColumnIds: string[]) => void;

  createBoard: (name: string, description: string, color: string) => Promise<Board | undefined>;
  inviteMember: (boardId: string, email: string, role: "editor" | "viewer") => Promise<{ ok: true } | { ok: false; error: string }>;
}

const BoardStoreContext = createContext<BoardStoreValue | null>(null);

export function BoardStoreProvider({ children }: { children: React.ReactNode }) {
  const { user: currentUser, status } = useAuth();
  const currentUserId = currentUser?.id ?? "";

  const [myBoards, setMyBoards] = useState<Board[]>([]);
  const [sharedBoards, setSharedBoards] = useState<Board[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(false);

  const boards = useMemo(() => [...myBoards, ...sharedBoards], [myBoards, sharedBoards]);

  const applyBoardPayload = useCallback((payload: ReturnType<typeof api.mapBoardPayload>) => {
    const { board, columns: nextColumns, tasks: nextTasks, labels: nextLabels, users: nextUsers } = payload;
    setMyBoards((prev) => prev.some((item) => item.id === board.id) ? prev.map((item) => item.id === board.id ? board : item) : prev);
    setSharedBoards((prev) => prev.some((item) => item.id === board.id) ? prev.map((item) => item.id === board.id ? board : item) : prev);
    setColumns((prev) => [...prev.filter((item) => !nextColumns.some((next) => next.id === item.id)), ...nextColumns]);
    setTasks((prev) => [...prev.filter((item) => !nextTasks.some((next) => next.id === item.id)), ...nextTasks]);
    setLabels((prev) => [...prev.filter((item) => !nextLabels.some((next) => next.id === item.id)), ...nextLabels]);
    setUsers((prev) => {
      const merged = new Map(prev.map((item) => [item.id, item]));
      nextUsers.forEach((item) => merged.set(item.id, item));
      return [...merged.values()];
    });
  }, []);

  const refreshBoard = useCallback(async (boardId: string) => {
    const response = await api.getBoard(boardId);
    applyBoardPayload(api.mapBoardPayload(response.board));
  }, [applyBoardPayload]);

  useEffect(() => {
    if (status !== "ready" || !currentUser) {
      setBoardsLoading(false);
      return;
    }
    setBoardsLoading(true);
    let cancelled = false;
    const load = async () => {
      try {
        const lists = await api.listBoards();
        if (cancelled) return;
        setMyBoards(lists.mine.map((board) => ({ ...board, description: board.description ?? undefined, members: [], columnIds: [] })));
        setSharedBoards(lists.shared.map((board) => ({ ...board, description: board.description ?? undefined, members: [], columnIds: [] })));
        await Promise.all([...lists.mine, ...lists.shared].map(async (summary) => {
          const response = await api.getBoard(summary.id);
          if (!cancelled) applyBoardPayload(api.mapBoardPayload(response.board));
        }));
      } catch (error) {
        console.error("Unable to load boards", error);
      } finally {
        if (!cancelled) setBoardsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [applyBoardPayload, currentUser, status]);

  // Patch a board in whichever list it lives in (my or shared).
  const updateBoard = useCallback(
    (boardId: string, updater: (board: Board) => Board) => {
      setMyBoards((prev) => prev.map((b) => (b.id === boardId ? updater(b) : b)));
      setSharedBoards((prev) => prev.map((b) => (b.id === boardId ? updater(b) : b)));
    },
    []
  );

  const getBoardColumns = useCallback(
    (boardId: string) => {
      const board = boards.find((b) => b.id === boardId);
      if (!board) return [];
      return board.columnIds
        .map((id) => columns.find((c) => c.id === id))
        .filter((c): c is Column => Boolean(c))
        .sort((a, b) => a.order - b.order);
    },
    [boards, columns]
  );

  const getColumnTasks = useCallback(
    (columnId: string) =>
      tasks
        .filter((t) => t.columnId === columnId)
        .sort((a, b) => a.order - b.order),
    [tasks]
  );

  const getUser = useCallback(
    (userId: string) => users.find((u) => u.id === userId),
    [users]
  );

  // Reordering within a column, or moving across columns to a target index.
  // Re-derives sequential `order` values for every affected column so
  // ordering stays stable and conflict-free (mirrors what the move endpoint
  // should guarantee server-side, e.g. inside a transaction).
  const moveTask = useCallback(
    (taskId: string, toColumnId: string, toIndex: number) => {
      setTasks((prev) => {
        const task = prev.find((t) => t.id === taskId);
        if (!task) return prev;
        const fromColumnId = task.columnId;

        const without = prev.filter((t) => t.id !== taskId);

        const destList = without
          .filter((t) => t.columnId === toColumnId)
          .sort((a, b) => a.order - b.order);

        const clampedIndex = Math.max(0, Math.min(toIndex, destList.length));
        destList.splice(clampedIndex, 0, { ...task, columnId: toColumnId });

        const reindexedDest = destList.map((t, i) => ({ ...t, order: i }));

        let reindexedSource: Task[] = [];
        if (fromColumnId !== toColumnId) {
          const sourceList = without
            .filter((t) => t.columnId === fromColumnId)
            .sort((a, b) => a.order - b.order);
          reindexedSource = sourceList.map((t, i) => ({ ...t, order: i }));
        }

        const untouched = without.filter(
          (t) => t.columnId !== toColumnId && t.columnId !== fromColumnId
        );

        return [...untouched, ...reindexedSource, ...reindexedDest];
      });
      void api.moveTask(taskId, toColumnId, toIndex).catch(() => undefined);
    },
    []
  );

  const createTask = useCallback(async (columnId: string, title: string) => {
    try {
      const response = await api.createTask(columnId, title);
      const task = { ...response.task, columnId, description: response.task.description ?? undefined, dueDate: response.task.dueDate ?? undefined };
      setTasks((prev) => [...prev, task]);
      return task;
    } catch (error) {
      console.error("Unable to create task", error);
      return undefined;
    }
  }, []);

  const updateTask = useCallback((taskId: string, patch: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
    );
    if (patch.columnId !== undefined) {
      void api.moveTask(taskId, patch.columnId, 0).catch(() => undefined);
      return;
    }
    void api.updateTask(taskId, patch).then(({ task }) => {
      setTasks((prev) => prev.map((item) => item.id === taskId ? { ...item, ...task, description: task.description ?? undefined, dueDate: task.dueDate ?? undefined } : item));
    }).catch(() => undefined);
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (!task) return prev;
      const remaining = prev.filter((t) => t.id !== taskId);
      const reindexed = remaining
        .filter((t) => t.columnId === task.columnId)
        .sort((a, b) => a.order - b.order)
        .map((t, i) => ({ ...t, order: i }));
      const others = remaining.filter((t) => t.columnId !== task.columnId);
      return [...others, ...reindexed];
    });
    void api.deleteTask(taskId).catch(() => undefined);
  }, []);

  const addColumn = useCallback(
    async (boardId: string, title: string) => {
      try {
        await api.createColumn(boardId, title);
        await refreshBoard(boardId);
        return { ok: true } as const;
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Unable to add column." } as const;
      }
    },
    [refreshBoard]
  );

  const renameColumn = useCallback((columnId: string, title: string) => {
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, title } : c)));
    void api.updateColumn(columnId, title).catch(() => undefined);
  }, []);

  const deleteColumn = useCallback((columnId: string) => {
    const board = boards.find((item) => item.columnIds.includes(columnId));
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
    setMyBoards((prev) =>
      prev.map((b) => ({ ...b, columnIds: b.columnIds.filter((id) => id !== columnId) }))
    );
    setSharedBoards((prev) =>
      prev.map((b) => ({ ...b, columnIds: b.columnIds.filter((id) => id !== columnId) }))
    );
    setTasks((prev) => prev.filter((t) => t.columnId !== columnId));
    void api.deleteColumn(columnId).catch(() => board && refreshBoard(board.id));
  }, [boards, refreshBoard]);

  const reorderColumns = useCallback((boardId: string, orderedColumnIds: string[]) => {
    setColumns((prev) =>
      prev.map((c) => {
        const idx = orderedColumnIds.indexOf(c.id);
        return idx === -1 ? c : { ...c, order: idx };
      })
    );
    updateBoard(boardId, (b) => ({ ...b, columnIds: orderedColumnIds }));
    void api.reorderColumns(boardId, orderedColumnIds).catch(() => refreshBoard(boardId));
  }, [refreshBoard]);

  const createBoard = useCallback(
    async (name: string, description: string, color: string) => {
      const response = await api.createBoard(name, description, color);
      const payload = api.mapBoardPayload(response.board);
      applyBoardPayload(payload);
      setMyBoards((prev) => [...prev.filter((item) => item.id !== payload.board.id), payload.board]);
      return payload.board;
    },
    [applyBoardPayload]
  );

  const inviteMember = useCallback(
    async (boardId: string, email: string, role: "editor" | "viewer") => {
      try {
        await api.inviteMember(boardId, email, role);
        await refreshBoard(boardId);
        return { ok: true } as const;
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Unable to add member." } as const;
      }
    },
    [refreshBoard]
  );

  const value = useMemo<BoardStoreValue>(
    () => ({
      myBoards,
      sharedBoards,
      boards,
      columns,
      tasks,
      labels,
      users,
      currentUserId,
      boardsLoading,
      getBoardColumns,
      getColumnTasks,
      getUser,
      moveTask,
      createTask,
      updateTask,
      deleteTask,
      addColumn,
      renameColumn,
      deleteColumn,
      reorderColumns,
      createBoard,
      inviteMember,
    }),
    [
      myBoards,
      sharedBoards,
      boards,
      columns,
      tasks,
      labels,
      users,
      boardsLoading,
      getBoardColumns,
      getColumnTasks,
      getUser,
      moveTask,
      createTask,
      updateTask,
      deleteTask,
      addColumn,
      renameColumn,
      deleteColumn,
      reorderColumns,
      createBoard,
      inviteMember,
    ]
  );

  return <BoardStoreContext.Provider value={value}>{children}</BoardStoreContext.Provider>;
}

export function useBoardStore() {
  const ctx = useContext(BoardStoreContext);
  if (!ctx) throw new Error("useBoardStore must be used within BoardStoreProvider");
  return ctx;
}
