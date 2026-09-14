#!/usr/bin/env bash
# Local go-live readiness checks — run before staging/prod deploy.
# Usage: ./scripts/go-live-preflight.sh [--skip-tests] [--skip-build] [--url BASE_URL]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SKIP_TESTS=0
SKIP_BUILD=0
BASE_URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-tests) SKIP_TESTS=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --url)
      shift
      BASE_URL="${1:-}"
      ;;
    -h | --help)
      echo "Usage: $0 [--skip-tests] [--skip-build] [--url BASE_URL]" >&2
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
  shift
done

failures=0
warns=0

pass() { echo "PASS: $*"; }
warn() { echo "WARN: $*"; warns=$((warns + 1)); }
fail() { echo "FAIL: $*" >&2; failures=$((failures + 1)); }

section() {
  echo
  echo "== $* =="
}

section "Quality gates"
if npm run typecheck >/dev/null; then
  pass "typecheck"
else
  fail "typecheck"
fi

if [[ "$SKIP_TESTS" -eq 0 ]]; then
  if npm test >/dev/null; then
    pass "tests"
  else
    fail "tests"
  fi
else
  warn "tests skipped (--skip-tests)"
fi

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  if npm run build >/dev/null; then
    pass "production build"
  else
    fail "production build"
  fi
else
  warn "build skipped (--skip-build)"
fi

section "Database backup + restore drill"
if ./scripts/backup-db.sh >/tmp/carelink-backup.log 2>&1; then
  pass "backup-db.sh ($(awk '/Backup written:/ {print $3, $4}' /tmp/carelink-backup.log))"
else
  fail "backup-db.sh — see /tmp/carelink-backup.log"
fi

if SKIP_BACKUP=1 ./scripts/restore-drill.sh >/tmp/carelink-restore.log 2>&1; then
  ms="$(awk '/Restore drill PASS in/ {print $5}' /tmp/carelink-restore.log)"
  pass "restore-drill.sh (${ms})"
else
  fail "restore-drill.sh — see /tmp/carelink-restore.log"
fi

section "Host prerequisites (manual)"
if [[ -f "$ROOT/.env" ]]; then
  pass ".env present"
  for key in AUTH_SECRET AUTH_URL DATABASE_URL DIRECT_URL MPESA_CALLBACK_SECRET; do
    if grep -qE "^${key}=" "$ROOT/.env"; then
      pass "env var set: $key"
    else
      warn "env var missing in .env: $key"
    fi
  done
else
  warn ".env missing — copy from .env.example"
fi

if GH_BIN="${GH_BIN:-$HOME/.local/bin/gh}" "$ROOT/scripts/verify-branch-protection.sh" >/dev/null 2>&1; then
  pass "GitHub branch protection on main"
else
  warn "branch protection not applied — run: GH_BIN=~/.local/bin/gh auth login && ./scripts/setup-branch-protection.sh"
fi

if [[ -n "$BASE_URL" ]]; then
  section "Live smoke ($BASE_URL)"
  if ./scripts/smoke-health.sh "$BASE_URL"; then
    pass "smoke-health"
  else
    fail "smoke-health"
  fi
  if ./scripts/load-test.sh "$BASE_URL" 10 50; then
    pass "load-test (50 req @ 10 concurrent)"
  else
    fail "load-test"
  fi
fi

section "Summary"
echo "Failures: $failures | Warnings: $warns"
if [[ "$failures" -gt 0 ]]; then
  echo "Preflight FAIL — fix failures before deploy." >&2
  exit 1
fi

echo "Preflight PASS (resolve warnings on host before production)."
exit 0
