## Backend API

The frontend uses the real backend API by default at `http://localhost:4000/api`.
Create `frontend/.env.local` only when the API runs at another URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Start the backend first, then run the frontend:

```bash
cd ../backend
npm run docker:up
npm run dev

cd ../frontend
npm install
npm run dev
```

Authentication stores the backend JWT in browser local storage. Boards, columns,
tasks, invites, and drag-and-drop updates are persisted through the API.
# Kanban Board — Frontend

A Next.js (App Router) + TypeScript kanban board UI: boards, columns, drag-and-drop
tasks, board sharing, task details, and a light/dark theme. The frontend is integrated
with the Express backend in `../backend`.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000. The backend must be running at
`http://localhost:4000/api` or be configured with `NEXT_PUBLIC_API_URL`.

## Where things live

- `lib/types.ts` — Board / Column / Task / User / Label shapes. Match your DB schema
  to these (or edit these to match your schema).
- `lib/api.ts` — typed API client, JWT storage, response mapping, and REST calls.
- `lib/auth.tsx` — backend authentication via `POST /auth/login`,
  `POST /auth/register`, `GET /auth/me`, and `POST /auth/logout`.
- `lib/store.tsx` — backend-hydrated board data layer. Mutations call the API while
  preserving optimistic drag-and-drop behavior.
- `lib/mock-data.ts` — retained as reference/demo data; it is no longer used by the
  live board or authentication providers.
- `components/board/` — board, column, task card, add-column/add-task, invite dialog.
- `components/task/task-detail-drawer.tsx` — the task side panel.
- `components/layout/` — sidebar and top bar.
- `app/login`, `app/register` — authentication forms connected to the backend.

## Drag and drop

Built with `@dnd-kit`. The important logic is in `components/board/board-view.tsx`:
`handleDragOver` figures out the destination column + index from whatever the
pointer is over (another task, or empty column space) and calls `moveTask`. The
frontend updates immediately and persists the move with `PATCH /api/tasks/:id/move`;
the backend performs the authoritative transactional reordering.

## Theme

Uses `next-themes` (class strategy). All colors are CSS variables in
`app/globals.css` (`--bg`, `--surface`, `--ink`, `--accent`, etc.) — change the
palette in one place for both light and dark mode.

## Fonts

Ships with a system-font stack (zero network dependency, no layout shift). If you'd
rather use a bundled webfont, swap in `next/font/google` (e.g. Inter) inside
`app/layout.tsx`.
