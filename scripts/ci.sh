#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export DATABASE_URL="${DATABASE_URL:-postgresql://carelink:carelink@localhost:5432/carelink}"
export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"
export AUTH_SECRET="${AUTH_SECRET:-ci-build-secret-must-be-at-least-32-chars-long}"

npm run lint
npm run typecheck
npm run build
npm run audit

if command -v docker >/dev/null 2>&1 && docker compose ps --status running db 2>/dev/null | grep -q db; then
  export DATABASE_URL="${DATABASE_URL_TEST:-postgresql://carelink:carelink@localhost:5432/carelink_test}"
  export DIRECT_URL="$DATABASE_URL"
  export VITEST_FORCE_MIGRATE=true
  docker compose exec -T db psql -U carelink -d postgres -tc \
    "SELECT 1 FROM pg_database WHERE datname = 'carelink_test'" | grep -q 1 \
    || docker compose exec -T db psql -U carelink -d postgres -c "CREATE DATABASE carelink_test;"
  npm test
else
  echo "Skipping integration tests (Postgres not running — start with: docker compose up -d)"
  DATABASE_URL= DIRECT_URL= VITEST_FORCE_MIGRATE= npm test
fi
