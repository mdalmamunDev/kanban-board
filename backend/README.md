# Kanban Backend

Express + TypeScript API backed by PostgreSQL, Redis, and Prisma.

## Requirements

Install the following before starting the backend locally:

- Node.js 20 or newer
- npm
- Docker Desktop with Docker Compose, if you want to run PostgreSQL and Redis in containers

The backend listens on port `4000` by default. The health endpoint is:

```text
http://localhost:4000/api/health
```

## Environment variables

Create `backend/.env` for local Node development:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://kanban:kanban@localhost:5433/kanban?schema=public
REDIS_URL=redis://localhost:6380
JWT_SECRET=replace-this-with-a-long-random-development-secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
REDIS_CACHE_TTL=60
REDIS_LIST_TTL=30
```

`DATABASE_URL` and `JWT_SECRET` are required. The other values have defaults in `src/config.ts`.

The Docker Compose file deliberately uses host ports `5433` and `6380` to avoid conflicts with PostgreSQL on `5432` and Redis on `6379`. If those ports are unavailable, add these overrides to `.env` and update the local connection URLs accordingly:

```env
POSTGRES_PORT=5434
REDIS_PORT=6381
API_PORT=4001
```

For a local Node process with those overrides, use:

```env
DATABASE_URL=postgresql://kanban:kanban@localhost:5434/kanban?schema=public
REDIS_URL=redis://localhost:6381
PORT=4001
```

## Option A: Run PostgreSQL and Redis with Docker

This is the recommended development setup when Node runs directly on the host.

From the `backend` directory:

```bash
npm install
npm run docker:up
```

The database and Redis containers start in the background. Start the API in a second terminal:

```bash
npm run dev
```

The API is now available at `http://localhost:4000`.

Stop only the infrastructure containers with:

```bash
npm run docker:down
```

The named Docker volumes are preserved, so database data remains available after stopping the containers.

## Option B: Run the entire backend stack with Docker

The initial Prisma migration is committed under `prisma/migrations`, so the `api` image builds are self-contained. Start the complete stack:

```bash
npm install
npm run docker:up
```

The `api` container will:

1. Wait for healthy PostgreSQL and Redis containers.
2. Apply committed migrations with `prisma migrate deploy`.
3. Run the idempotent seed script.
4. Start the compiled API on port `4000` inside the container.

The API is available from the host at `http://localhost:4000` unless `API_PORT` is overridden.

To view service logs:

```bash
docker compose logs -f api
docker compose logs -f db redis
```

To stop the complete stack:

```bash
npm run docker:down
```

To stop the stack and delete all database and Redis data, use this destructive command:

```bash
docker compose down -v
```

## Local development commands

Run these commands from `backend`:

```bash
# Install dependencies
npm install

# Generate the Prisma client after schema or dependency changes
npm run db:generate

# Create a development migration and apply it
npm run db:migrate -- --name init

# Apply existing migrations without creating a new one
npm run db:deploy

# Push the schema without creating migration files (local-only shortcut)
npm run db:push

# Populate the database with demo users, boards, columns, labels, and tasks
npm run db:seed

# Open Prisma Studio
npm run db:studio

# Start the API with automatic TypeScript reloads
npm run dev

# Type-check without emitting files
npm run typecheck

# Compile to dist/
npm run build

# Run the compiled API
npm start
```

Use `db:migrate` for normal development because it keeps the database schema represented by migration files. Use `db:push` only when a disposable local database is sufficient.

## Verify that the server is running

PowerShell:

```powershell
Invoke-RestMethod http://localhost:4000/api/health
```

Command Prompt, Git Bash, or a Unix-like shell:

```bash
curl http://localhost:4000/api/health
```

A healthy response has HTTP status `200` and looks similar to:

```json
{
  "status": "ok",
  "services": {
    "db": true,
    "cache": true
  }
}
```

If PostgreSQL is unavailable, the endpoint returns HTTP `503` and reports `db: false` or `status: "degraded"`.

## API overview

All routes live under `/api`. Everything except the auth endpoints requires `Authorization: Bearer <jwt>`.

### Auth

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | `{ name, email, password }` | Returns `{ token, user }` |
| POST | `/api/auth/login` | `{ email, password }` | Returns `{ token, user }` |
| POST | `/api/auth/logout` | — | 204 |
| GET | `/api/auth/me` | — | Current user |

### Boards

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/boards/mine` | Owned boards → sidebar "Boards" list (Redis-cached) |
| GET | `/api/boards/shared` | Member-but-not-owner → "Shared with me" list (Redis-cached) |
| POST | `/api/boards` | Creates board + default columns/labels + owner membership |
| GET | `/api/boards/:id` | Full board incl. `myRole` (Redis-cached) |
| PATCH | `/api/boards/:id` | Rename/re-describe/recolor (editor+) |
| DELETE | `/api/boards/:id` | Owner only, cascades |
| POST | `/api/boards/:id/members` | Invite by `email` or `userId`, role `editor`/`viewer` |
| PATCH | `/api/boards/:id/members/:userId` | Change role; `role: "owner"` transfers ownership |
| DELETE | `/api/boards/:id/members/:userId` | Owner removes anyone; members may remove themselves |
| PATCH | `/api/boards/:id/columns/reorder` | `{ columnIds: [...] }` in the desired order |

### Columns

`POST /api/boards/:id/columns` · `PATCH /api/columns/:id` · `DELETE /api/columns/:id`

### Tasks

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/columns/:id/tasks` | `{ title }` — key auto-generated (e.g. `BIL-152`) |
| PATCH | `/api/tasks/:id` | Fields plus `labelIds` and `assigneeIds` |
| DELETE | `/api/tasks/:id` | — |
| PATCH | `/api/tasks/:id/move` | `{ toColumnId, toIndex }` — transactional reorder |

### Roles

`owner` (full control, delete/transfer) → `editor` (content and invites) → `viewer` (read-only). Viewers receive `403` on any write.

## Seeded demo accounts

The seed script creates these users. Every seeded account uses the password `password123`:

| Email | Name |
| --- | --- |
| `mamun@company.io` | Mamun Rashid |
| `priya@company.io` | Priya Nair |
| `diego@company.io` | Diego Ferreira |
| `amina@company.io` | Amina Yusuf |
| `sora@company.io` | Sora Kim |

These credentials are for local development only. Do not use them in a deployed environment.

## Connecting the frontend

The default CORS origin is `http://localhost:3000`, which matches the Next.js frontend in this workspace. Start the frontend separately and point its API requests to:

```text
http://localhost:4000/api
```

If the frontend runs on another origin, set `CORS_ORIGIN` to that origin. Multiple origins can be supplied as a comma-separated value.

## Troubleshooting

### `invalid environment variables`

Check that `backend/.env` exists and contains both `DATABASE_URL` and `JWT_SECRET`. Confirm that the database URL uses the host port (`5433` by default) when Node runs on the host. Containers use service names and internal port `5432` instead.

### `P1001: Can't reach database server`

Confirm the database container is running and healthy:

```bash
docker compose ps
docker compose logs db
```

If the API runs on the host, use `localhost:5433`. If the API runs in Docker, the Compose configuration uses `db:5432` automatically.

### Redis connection errors

Confirm Redis is running with:

```bash
docker compose ps redis
docker compose logs redis
```

A host-running API should use `redis://localhost:6380`; the Docker API uses `redis://redis:6379`.

### Docker API exits during `prisma migrate deploy`

Make sure a migration has been created under `prisma/migrations`:

```bash
npm run db:migrate -- --name init
```

Then rebuild and restart the stack:

```bash
npm run docker:down
npm run docker:up
```

### Port already in use

Set `POSTGRES_PORT`, `REDIS_PORT`, or `API_PORT` in `.env`. For local Node development, also update `DATABASE_URL`, `REDIS_URL`, and `PORT` to match the selected host ports.

### Reset local database data

To remove the Docker database and Redis volumes and recreate everything:

```bash
docker compose down -v
npm run docker:up
```

This deletes all data stored in those volumes.

## Production notes

- Set a strong unique `JWT_SECRET`.
- Set `NODE_ENV=production`.
- Set `CORS_ORIGIN` to the deployed frontend origin.
- Use `prisma migrate deploy`, not `prisma migrate dev`, during deployment.
- Do not use the seeded demo passwords in production.
- Put PostgreSQL and Redis behind the appropriate network and access controls rather than exposing their host ports publicly.
