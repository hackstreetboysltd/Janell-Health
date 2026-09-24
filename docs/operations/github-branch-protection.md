# GitHub branch protection

Require CI before anything merges to `main`. Apply once per repository (needs **admin** on the repo).

## Required status checks

The `quality` job in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) must pass:

| Job | Purpose |
|---|---|
| `quality` | lint, typecheck, build, audit, migrate, test |

## Apply via script

```bash
# Official GitHub CLI only (https://cli.github.com/) — not the npm `gh` package.
# If both exist, prefer: export GH_BIN=~/.local/bin/gh
./scripts/setup-branch-protection.sh
./scripts/verify-branch-protection.sh   # confirm the quality check
```

The script uses the GitHub CLI (`gh`). Install the official CLI from [cli.github.com](https://cli.github.com/) — not the legacy npm `gh` package (`github-cli`), which breaks `gh auth status`.

## Apply manually (GitHub UI)

1. **Settings → Rules → Rulesets → New ruleset → Target: `main`**
2. Enable **Require status checks to pass**
3. Add the required check: `quality` (exact name from the Actions tab after the first green run)
4. Enable **Require a pull request before merging**
5. Enable **Do not allow bypassing the above settings** (including admins, when ready for team use)

## Apply via `gh api` (reference)

Replace `OWNER/REPO` with your remote (e.g. `hackstreetboysltd/Janell-Health`):

```bash
gh api repos/OWNER/REPO/branches/main/protection -X PUT \
  -f required_status_checks[strict]=true \
  -f required_status_checks[contexts][]=quality \
  -f enforce_admins=true \
  -f required_pull_request_reviews[required_approving_review_count]=0 \
  -f restrictions=
```

> Adjust `required_approving_review_count` to `1` when a second reviewer is available.

## Verify

Open a test PR with a deliberate lint failure — merge should stay blocked until checks are green.
