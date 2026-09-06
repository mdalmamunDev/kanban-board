# Kanban Board — Frontend

A Next.js (App Router) + TypeScript kanban board UI: boards, columns, drag-and-drop
tasks, board sharing, task details, and a light/dark theme. Built with mock data so
you can explore it immediately; wire up your API next.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000. It defaults to the "Billing & Payments" board —
switch boards from the left sidebar.

## Where things live

- `lib/types.ts` — Board / Column / Task / User / Label shapes. Match your DB schema
  to these (or edit these to match your schema).
- `lib/mock-data.ts` — sample boards/columns/tasks/users/labels. Replace with data
  fetched from your API. Boards are split into `myBoards` (boards you own) and
  `sharedBoards` (boards shared with you) — same `Board` type for both; in the
  future fetch them from `GET /boards/mine` and `GET /boards/shared`.
- `lib/auth.tsx` — mock client-side auth (`login`, `register`, `logout`) persisted
  to `localStorage` (session + registered users). When you wire the backend, swap
  the bodies for `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`.
- `lib/store.tsx` — the data layer. Every mutation (`moveTask`, `createTask`,
  `updateTask`, `deleteTask`, `addColumn`, `inviteMember`, etc.) is one function with
  a comment showing the REST endpoint it should call
  (e.g. `moveTask(taskId, toColumnId, toIndex)` → `PATCH /tasks/:id/move`).
  Swap the body of each for a real `fetch`/mutation call — the components never talk
  to state directly, they only call these functions, so this is the single place to
  change.
- `components/board/` — board, column, task card, add-column/add-task, invite dialog.
- `components/task/task-detail-drawer.tsx` — the task side panel.
- `components/layout/` — sidebar and top bar.
- `app/login`, `app/register` — static auth screens (form UI only — no request is
  sent yet; each has a `TODO` comment marking where to call your auth endpoint).

## Drag and drop

Built with `@dnd-kit`. The important logic is in `components/board/board-view.tsx`:
`handleDragOver` figures out the destination column + index from whatever the
pointer is over (another task, or empty column space) and calls `moveTask` — which
recomputes sequential `order` values for the affected column(s) so ordering stays
consistent. That's the same shape your move endpoint should follow server-side
(ideally inside a transaction).

## Theme

Uses `next-themes` (class strategy). All colors are CSS variables in
`app/globals.css` (`--bg`, `--surface`, `--ink`, `--accent`, etc.) — change the
palette in one place for both light and dark mode.

## Fonts

Ships with a system-font stack (zero network dependency, no layout shift). If you'd
rather use a bundled webfont, swap in `next/font/google` (e.g. Inter) inside
`app/layout.tsx`.
