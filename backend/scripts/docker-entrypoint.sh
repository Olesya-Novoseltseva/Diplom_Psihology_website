#!/bin/sh
set -eu

MAX_ATTEMPTS="${DB_MIGRATE_MAX_ATTEMPTS:-30}"
SLEEP_SECONDS="${DB_MIGRATE_SLEEP_SECONDS:-2}"
ATTEMPT=1

echo "[entrypoint] Running prisma migrate deploy"
while [ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]; do
  if npm exec --workspace=backend -- prisma migrate deploy; then
    echo "[entrypoint] Migrations applied"
    break
  fi

  if [ "$ATTEMPT" -eq "$MAX_ATTEMPTS" ]; then
    echo "[entrypoint] Migration failed after ${MAX_ATTEMPTS} attempts"
    exit 1
  fi

  echo "[entrypoint] Migration attempt ${ATTEMPT}/${MAX_ATTEMPTS} failed, retrying in ${SLEEP_SECONDS}s"
  ATTEMPT=$((ATTEMPT + 1))
  sleep "$SLEEP_SECONDS"
done

if [ "${RUN_DB_SEED:-false}" = "true" ]; then
  echo "[entrypoint] Running prisma db seed"
  npm exec --workspace=backend -- prisma db seed
fi

echo "[entrypoint] Starting backend"
exec node backend/dist/server.js
