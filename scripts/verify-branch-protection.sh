#!/usr/bin/env bash
# Verify main branch protection (requires official gh CLI + auth).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

find_gh() {
  local candidate
  for candidate in \
    "${GH_BIN:-}" \
    "${HOME}/.local/bin/gh" \
    "/usr/bin/gh" \
    "/usr/local/bin/gh"; do
    if [[ -n "$candidate" && -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  if command -v gh >/dev/null 2>&1 && gh --version 2>&1 | grep -qE 'gh version [0-9]+\.'; then
    command -v gh
    return 0
  fi
  return 1
}

GH="$(find_gh)" || {
  echo "FAIL: official GitHub CLI not found" >&2
  exit 1
}

if ! "$GH" auth status >/dev/null 2>&1; then
  echo "FAIL: not authenticated — run '$GH auth login'" >&2
  exit 1
fi

REMOTE="$(git remote get-url origin 2>/dev/null || true)"
REPO="${REMOTE#git@github.com:}"
REPO="${REPO#https://github.com/}"
REPO="${REPO%.git}"

if [[ -z "$REPO" || "$REPO" == "$REMOTE" ]]; then
  echo "FAIL: could not parse origin remote" >&2
  exit 1
fi

PROTECTION="$("$GH" api "repos/${REPO}/branches/main/protection" 2>/dev/null || true)"
if [[ -z "$PROTECTION" ]]; then
  echo "FAIL: no branch protection on main (run ./scripts/setup-branch-protection.sh)" >&2
  exit 1
fi

missing=0
for check in quality security; do
  if ! echo "$PROTECTION" | grep -q "\"context\": \"${check}\""; then
    echo "FAIL: required check '${check}' not configured" >&2
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "OK: main is protected with quality + security checks (${REPO})"
