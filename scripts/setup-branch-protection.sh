#!/usr/bin/env bash
# Configure branch protection on main (requires GitHub admin + official gh CLI).
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
  if command -v gh >/dev/null 2>&1; then
    local resolved
    resolved="$(command -v gh)"
    # Reject legacy npm `gh` (github-cli) — it breaks `gh auth status`.
    if gh --version 2>&1 | grep -qE 'gh version [0-9]+\.'; then
      echo "$resolved"
      return 0
    fi
  fi
  return 1
}

GH="$(find_gh)" || {
  echo "Error: install the official GitHub CLI from https://cli.github.com/" >&2
  echo "  (The npm 'gh' package is not compatible — use ~/.local/bin/gh or package manager.)" >&2
  exit 1
}

if ! "$GH" auth status >/dev/null 2>&1; then
  echo "Error: run '$GH auth login' first." >&2
  exit 1
fi

REMOTE="$(git remote get-url origin 2>/dev/null || true)"
if [[ -z "$REMOTE" ]]; then
  echo "Error: no git remote 'origin'." >&2
  exit 1
fi

# git@github.com:org/repo.git → org/repo
REPO="${REMOTE#git@github.com:}"
REPO="${REPO#https://github.com/}"
REPO="${REPO%.git}"

echo "Applying branch protection to ${REPO} (branch: main) using ${GH}..."

"$GH" api "repos/${REPO}/branches/main/protection" -X PUT \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      { "context": "quality" },
      { "context": "security" }
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

echo "Done. Verify with: ./scripts/verify-branch-protection.sh"
