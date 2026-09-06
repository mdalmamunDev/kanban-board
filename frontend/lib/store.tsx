"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  myBoards as initialMyBoards,
  sharedBoards as initialSharedBoards,
  columns as initialColumns,
  labels as initialLabels,
  tasks as initialTasks,
  users as initialUsers,
} from "./mock-data";
import { useAuth } from "./auth";
import { Board, Column, Label, Priority, Task, User } from "./types";

/**
 * ---------------------------------------------------------------------------
 * DATA LAYER NOTES (read this when wiring the real backend)
 * ---------------------------------------------------------------------------
 * Every mutator below (moveTask, createTask, etc.) currently updates local
 * React state directly. Each one is written as a single function with a
 * narrow signature so it maps cleanly onto one API call:
 *
 *   moveTask(taskId, toColumnId, toIndex)  ->  PATCH /tasks/:id/move
 *   createTask(columnId, title)            ->  POST  /columns/:id/tasks
 *   updateTask(taskId, patch)              ->  PATCH /tasks/:id
 *   deleteTask(taskId)                     ->  DELETE /tasks/:id
 *   addColumn(boardId, title)              ->  POST  /boards/:id/columns
 *   renameColumn / deleteColumn            ->  PATCH / DELETE /columns/:id
 *   reorderColumns(boardId, orderedIds)    ->  PATCH /boards/:id/columns/reorder
 *   inviteMember(boardId, email, role)     ->  POST  /boards/:id/members
 *
 * Swap the body of each function for a fetch/mutation call (optimistic
 * update + rollback on failure is the recommended pattern given the optimistic
 * drag-and-drop UX already built into the board).
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

  getBoardColumns: (boardId: string) => Column[];
  getColumnTasks: (columnId: string) => Task[];
  getUser: (userId: string) => User | undefined;

  moveTask: (taskId: string, toColumnId: string, toIndex: number) => void;
  createTask: (columnId: string, title: string) => Task;
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;

  addColumn: (boardId: string, title: string) => void;
  renameColumn: (columnId: string, title: string) => void;
  deleteColumn: (columnId: string) => void;
  reorderColumns: (boardId: string, orderedColumnIds: string[]) => void;

  createBoard: (name: string, description: string, color: string) => Board;
  inviteMember: (boardId: string, email: string, role: "editor" | "viewer") => void;
}

const BoardStoreContext = createContext<BoardStoreValue | null>(null);

let idCounter = 100;
const nextId = (prefix: string) => `${prefix}${idCounter++}`;

export function BoardStoreProvider({ children }: { children: React.ReactNode }) {
  const { user: currentUser, registeredUsers } = useAuth();
  const currentUserId = currentUser?.id ?? "";

  const [myBoards, setMyBoards] = useState<Board[]>(initialMyBoards);
  const [sharedBoards, setSharedBoards] = useState<Board[]>(initialSharedBoards);
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [labels] = useState<Label[]>(initialLabels);
  const [baseUsers] = useState<User[]>(initialUsers);

  const users = useMemo(
    () => [...baseUsers, ...registeredUsers],
    [baseUsers, registeredUsers]
  );

  const boards = useMemo(() => [...myBoards, ...sharedBoards], [myBoards, sharedBoards]);

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
    },
    []
  );

  const createTask = useCallback(
    (columnId: string, title: string) => {
      const columnTasks = tasks.filter((t) => t.columnId === columnId);
      const created: Task = {
        id: nextId("t"),
        key: `NEW-${idCounter}`,
        title,
        columnId,
        order: columnTasks.length,
        priority: "medium" as Priority,
        labelIds: [],
        assigneeIds: [],
      };
      setTasks((prev) => [...prev, created]);
      return created;
    },
    [tasks]
  );

  const updateTask = useCallback((taskId: string, patch: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
    );
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
  }, []);

  const addColumn = useCallback(
    (boardId: string, title: string) => {
      const newColumn: Column = {
        id: nextId("c"),
        title,
        order: 999,
        color: "#8F8F98",
      };
      const board = boards.find((b) => b.id === boardId);
      setColumns((prev) => [
        ...prev,
        { ...newColumn, order: board?.columnIds.length ?? 0 },
      ]);
      updateBoard(boardId, (b) => ({
        ...b,
        columnIds: [...b.columnIds, newColumn.id],
      }));
    },
    [boards, updateBoard]
  );

  const renameColumn = useCallback((columnId: string, title: string) => {
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, title } : c)));
  }, []);

  const deleteColumn = useCallback((columnId: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
    setMyBoards((prev) =>
      prev.map((b) => ({ ...b, columnIds: b.columnIds.filter((id) => id !== columnId) }))
    );
    setSharedBoards((prev) =>
      prev.map((b) => ({ ...b, columnIds: b.columnIds.filter((id) => id !== columnId) }))
    );
    setTasks((prev) => prev.filter((t) => t.columnId !== columnId));
  }, []);

  const reorderColumns = useCallback((boardId: string, orderedColumnIds: string[]) => {
    setColumns((prev) =>
      prev.map((c) => {
        const idx = orderedColumnIds.indexOf(c.id);
        return idx === -1 ? c : { ...c, order: idx };
      })
    );
    updateBoard(boardId, (b) => ({ ...b, columnIds: orderedColumnIds }));
  }, [updateBoard]);

  const createBoard = useCallback(
    (name: string, description: string, color: string) => {
      const backlog: Column = { id: nextId("c"), title: "Backlog", order: 0, color: "#8F8F98" };
      const doing: Column = { id: nextId("c"), title: "In Progress", order: 1, color: "#5750F1" };
      const done: Column = { id: nextId("c"), title: "Done", order: 2, color: "#2F9E5B" };
      const board: Board = {
        id: nextId("b"),
        name,
        description,
        color,
        ownerId: currentUserId,
        members: [{ userId: currentUserId, role: "owner" }],
        columnIds: [backlog.id, doing.id, done.id],
      };
      setColumns((prev) => [...prev, backlog, doing, done]);
      setMyBoards((prev) => [...prev, board]);
      return board;
    },
    [currentUserId]
  );

  const inviteMember = useCallback(
    (boardId: string, email: string, role: "editor" | "viewer") => {
      const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return;
      updateBoard(boardId, (b) =>
        b.members.some((m) => m.userId === user.id)
          ? b
          : { ...b, members: [...b.members, { userId: user.id, role }] }
      );
    },
    [users, updateBoard]
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
