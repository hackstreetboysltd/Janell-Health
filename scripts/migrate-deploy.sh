#!/usr/bin/env bash
# Apply Prisma migrations against Neon (or any Postgres).
# Prefer DIRECT_URL (unpooled) for migrate; fall back to DATABASE_URL.
#
# Usage:
#   ./scripts/migrate-deploy.sh
#   DIRECT_URL="postgresql://..." ./scripts/migrate-deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

MIGRATE_URL="${DIRECT_URL:-${DATABASE_URL:-}}"
if [[ -z "$MIGRATE_URL" ]]; then
  echo "Error: set DIRECT_URL (preferred) or DATABASE_URL." >&2
  exit 1
fi

echo '{"level":"info","message":"prisma.migrate.deploy.start"}'
DATABASE_URL="$MIGRATE_URL" DIRECT_URL="$MIGRATE_URL" npx prisma migrate deploy
echo '{"level":"info","message":"prisma.migrate.deploy.done"}'
