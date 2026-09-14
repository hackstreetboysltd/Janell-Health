#!/usr/bin/env bash
# Lightweight capacity smoke — concurrent /api/health requests.
# Usage: ./scripts/load-test.sh [BASE_URL] [CONCURRENCY] [TOTAL_REQUESTS]
# Example: ./scripts/load-test.sh https://app.carelink.ke 20 200
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
CONCURRENCY="${2:-20}"
TOTAL="${3:-100}"
URL="${BASE_URL%/}/api/health"

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl required" >&2
  exit 1
fi

echo "Load test: $TOTAL requests @ concurrency $CONCURRENCY → $URL"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

start_ms="$(date +%s%3N)"
seq 1 "$TOTAL" | xargs -P "$CONCURRENCY" -I{} sh -c '
  code=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 15 "'"$URL"'") || code=000
  echo "$code"
' >"$tmpdir/codes"

end_ms="$(date +%s%3N)"
elapsed=$((end_ms - start_ms))

ok="$(grep -c '^200$' "$tmpdir/codes" || true)"
fail=$((TOTAL - ok))
rps="$(awk "BEGIN { printf \"%.1f\", $TOTAL / ($elapsed / 1000) }")"

echo "Results: ok=$ok fail=$fail elapsed=${elapsed}ms (~${rps} req/s)"

if [[ "$fail" -gt 0 ]]; then
  echo "FAIL — non-200 responses detected" >&2
  sort | uniq -c | sort -rn <"$tmpdir/codes" >&2
  exit 1
fi

echo "PASS"
