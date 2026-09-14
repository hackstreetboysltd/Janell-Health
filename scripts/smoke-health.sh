#!/usr/bin/env bash
# Post-deploy smoke test — exits non-zero unless /api/health returns status ok.
# Usage: ./scripts/smoke-health.sh [BASE_URL]
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
URL="${BASE_URL%/}/api/health"

echo "Smoke test: GET $URL"

body="$(curl -sf --max-time 15 "$URL")"
status="$(node -e "const b=JSON.parse(process.argv[1]); process.stdout.write(b.status||'');" "$body")"

if [ "$status" != "ok" ]; then
  echo "FAIL — health status is '$status' (expected ok)" >&2
  echo "$body" >&2
  exit 1
fi

echo "OK — $body"
