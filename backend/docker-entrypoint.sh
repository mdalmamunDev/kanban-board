#!/bin/sh
# Runs inside the container before the app starts.
set -e

echo "[entrypoint] applying database migrations..."
npx prisma migrate deploy

echo "[entrypoint] seeding database (idempotent)..."
npx prisma db seed

echo "[entrypoint] starting application..."
exec "$@"