#!/usr/bin/env bash
# Create a compressed Postgres dump of the Janell Health database.
# Usage: ./scripts/backup-db.sh
# Env:   DATABASE_URL (optional if Docker Compose db is running)
#        BACKUP_DIR (default: ./backups)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTFILE="$BACKUP_DIR/carelink-${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

dump_via_docker() {
  docker compose exec -T db pg_dump -U carelink -d carelink --no-owner --no-acl
}

dump_via_url() {
  pg_dump "$DATABASE_URL" --no-owner --no-acl
}

if command -v docker >/dev/null 2>&1 && docker compose ps --status running db 2>/dev/null | grep -q db; then
  dump_via_docker | gzip -9 >"$OUTFILE"
elif [[ -n "${DATABASE_URL:-}" ]] && command -v pg_dump >/dev/null 2>&1; then
  dump_via_url | gzip -9 >"$OUTFILE"
else
  echo "Error: start Postgres (docker compose up -d) or set DATABASE_URL with pg_dump installed." >&2
  exit 1
fi

chmod 600 "$OUTFILE"
echo "Backup written: $OUTFILE ($(du -h "$OUTFILE" | cut -f1))"
