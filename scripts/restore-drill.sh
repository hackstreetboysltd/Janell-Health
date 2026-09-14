#!/usr/bin/env bash
# Restore drill — backup prod/staging DB, restore to scratch DB, verify health logic.
# Usage: DATABASE_URL=<source> ./scripts/restore-drill.sh
# Env:   SCRATCH_DATABASE_URL (default: same host, db name carelink_restore_drill)
#        SKIP_BACKUP=1 to use latest file in ./backups/
# Uses docker compose exec when the local db service is running (no host pg_dump required).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

docker_db_running() {
  command -v docker >/dev/null 2>&1 &&
    docker compose ps --status running db 2>/dev/null | grep -q db
}

USE_DOCKER=0
if docker_db_running; then
  USE_DOCKER=1
elif [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: set DATABASE_URL or start Postgres (docker compose up -d db)." >&2
  exit 1
elif ! command -v psql >/dev/null 2>&1 || ! command -v pg_dump >/dev/null 2>&1; then
  echo "Error: psql and pg_dump required (or start docker compose db)." >&2
  exit 1
fi

SCRATCH_URL="${SCRATCH_DATABASE_URL:-}"
if [[ -z "$SCRATCH_URL" ]]; then
  if [[ "$USE_DOCKER" -eq 1 ]]; then
    SCRATCH_URL="postgresql://carelink:carelink@localhost:5432/carelink_restore_drill"
  else
    base="${DATABASE_URL%/*}"
    SCRATCH_URL="${base}/carelink_restore_drill"
  fi
fi

scratch_db="${SCRATCH_URL##*/}"

BACKUP_FILE=""
if [[ "${SKIP_BACKUP:-}" != "1" ]]; then
  echo "Creating backup..."
  BACKUP_FILE="$("$ROOT/scripts/backup-db.sh" | awk '/Backup written:/ {print $3}')"
else
  BACKUP_FILE="$(ls -t "$ROOT/backups"/carelink-*.sql.gz 2>/dev/null | head -1 || true)"
  if [[ -z "$BACKUP_FILE" ]]; then
    echo "Error: no backup in ./backups — run backup-db.sh first." >&2
    exit 1
  fi
  echo "Using existing backup: $BACKUP_FILE"
fi

echo "Recreating scratch database: $scratch_db"
start_ms="$(date +%s%3N)"

if [[ "$USE_DOCKER" -eq 1 ]]; then
  docker compose exec -T db psql -U carelink -d postgres -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${scratch_db}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "${scratch_db}";
CREATE DATABASE "${scratch_db}";
SQL
else
  admin_url="${DATABASE_URL%/*}/postgres"
  psql "$admin_url" -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${scratch_db}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "${scratch_db}";
CREATE DATABASE "${scratch_db}";
SQL
fi

echo "Restoring..."
if [[ "$USE_DOCKER" -eq 1 ]]; then
  gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U carelink -d "$scratch_db" -v ON_ERROR_STOP=1 -q
else
  gunzip -c "$BACKUP_FILE" | psql "$SCRATCH_URL" -v ON_ERROR_STOP=1 -q
fi

echo "Running migrations on scratch..."
DATABASE_URL="$SCRATCH_URL" npx prisma migrate deploy >/dev/null

echo "Verifying connectivity..."
if [[ "$USE_DOCKER" -eq 1 ]]; then
  docker compose exec -T db psql -U carelink -d "$scratch_db" -v ON_ERROR_STOP=1 \
    -c 'SELECT COUNT(*) AS users FROM "User";' >/dev/null
else
  psql "$SCRATCH_URL" -v ON_ERROR_STOP=1 -c 'SELECT COUNT(*) AS users FROM "User";' >/dev/null
fi

end_ms="$(date +%s%3N)"
elapsed=$((end_ms - start_ms))

echo "Restore drill PASS in ${elapsed}ms"
echo "Scratch DB: $SCRATCH_URL (drop manually when done)"
