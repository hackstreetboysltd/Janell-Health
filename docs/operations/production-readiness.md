# Janell Health — Production readiness tracker

> **Living document.** Update this file in the **same commit** as every production-readiness step. After each step: flip the checkbox, refresh **Last updated** and **Snapshot**, and add a line to **Step log**.

**Last updated:** 2026-09-01 11:51 AM EAT  
**Current tier:** Tier 1 (MVP / early product) — approaching Tier 2  
**Origin chats:** `[fa4eef3c](fa4eef3c-a0f1-427d-861f-3324c1571d01)` (roadmap + P0 batch 1), current session (pay flow, malware scan, metrics, rate limits)

---

## Progress at a glance

| Area | Done | Open | Notes |
| --- | ---: | ---: | --- |
| **P0** (ship blockers) | 21 | **4** | All 4 open items need **your** ops action — no further in-repo work unblocks launch |
| **P1** (security depth) | 8 | 6 | API rate limits shipped this session |
| **P2 ops** | 7 | 5 | Metrics, funnel, alerting runbook done |
| **P2 frontend** | 7 | 6 | Form persistence + pay flow UX done |
| **Tests** | 95 passing | — | 23 files |

**Why P0 “Remaining” looks unchanged:** production host, GitHub ruleset apply, restore drill, and staging are **external** — artifacts exist (`deploy.md`, `setup-branch-protection.sh`, `backups.md`); they cannot be checked off from code alone.

---

## Launch gate

### Cannot launch until (operator)

- [ ] **Production host live** — Railway/VPS + domain + managed Postgres + R2/S3
- [ ] **Branch protection applied** — `./scripts/setup-branch-protection.sh` (repo admin + `gh` CLI)
- [ ] **M-Pesa callback URL live** — HTTPS domain matching `MPESA_CALLBACK_URL` (part of host step)
- [ ] **Sentry + uptime configured** — [`alerting.md`](./alerting.md) (manual; ~15 min)

### Strongly recommended before real patients

- [ ] **Staging environment** — separate DB, M-Pesa sandbox, S3 bucket, `SENTRY_ENVIRONMENT=staging`
- [ ] **Restore drill executed** — [`backups.md`](./backups.md) quarterly checklist (once)
- [x] **Form persistence** — localStorage drafts + upload retry on case/giver onboarding (`form-draft.ts`, `use-form-draft.ts`)

### Post-launch / Tier 2 polish

- P1 remainder (admin audit log, CSP nonces, retention, DPA register)
- P2 remainder (scheduled backups, SBOM, load test, DR game day)
- Frontend remainder (design pass, WCAG audit, empty states)

---

## Snapshot


| Signal                         | Status                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| CI (`quality` job)             | lint → typecheck → build → audit → migrate → test                                                         |
| CI (`security` job)            | gitleaks + semgrep                                                                                        |
| Tests                          | **95 passing** across 23 files (Vitest + Postgres `carelink_test`)                                        |
| `npm audit --audit-level=high` | Clean (`deepmerge-ts` pinned via `overrides`)                                                             |
| Deploy target                  | **Vercel + Neon + Upstash** ([vercel-neon.md](./vercel-neon.md)) or Docker + Railway/VPS ([deploy.md](./deploy.md)) |
| Real money / PII               | M-Pesa + phone OTP + ID uploads — **treat as pre-launch**                                                 |


---

## P0 — Ship blockers & quality gates

### Done

- [x] **Public routes** — `/legal/`*, `/emergency`, `/support`, `/referral/*`, `/api/referral/*` reachable without auth (`src/middleware.ts`)
- [x] **CI pipeline** — GitHub Actions + `scripts/ci.sh` + Dependabot (`.github/workflows/ci.yml`)
- [x] **Core test suite** — booking lifecycle, overlap conflicts, cross-tenant isolation, privacy erasure, health, storage, M-Pesa config
- [x] **M-Pesa hardening** — sandbox/prod URLs, callback secret, idempotent `confirmBookingPayment`, mock gated off in prod
- [x] **Object storage** — local + S3/R2 backends, signed URLs, tenant-scoped keys (`src/lib/storage*.ts`)
- [x] **Security headers** — CSP, HSTS (prod), nosniff, frame-ancestors, referrer policy (`next.config.ts`)
- [x] **Health check** — `GET /api/health` (DB + optional S3 + optional ClamAV probe)
- [x] **Structured logging** — JSON logger with secret/OTP redaction (`src/lib/logger.ts`)
- [x] **SMS** — Africa's Talking integration with stub fallback (`src/lib/sms.ts`)
- [x] **Privacy / DSAR** — `GET /api/me/export`, `POST /api/me/erase` with active-booking guard
- [x] **Sentry** — server/edge/client instrumentation, PII scrubbing, `global-error.tsx`, optional source maps (`SENTRY_AUTH_TOKEN`)
- [x] **Backup runbook** — `docs/operations/backups.md` + `scripts/backup-db.sh`
- [x] **`.env.example`** — committed template for all env vars
- [x] **Secret scan in CI** — gitleaks (full history)
- [x] **SAST in CI** — semgrep (`p/security-audit`, `p/typescript`)
- [x] **OTP rate-limit tests** — hourly cap, resend cooldown, verify lockout (`tests/otp.integration.test.ts`)
- [x] **Admin access tests** — 403 for non-admin, allowlist + `ADMIN` role (`tests/admin.integration.test.ts`)
- [x] **M-Pesa callback e2e** — duplicate POST idempotency + prod token rejection (`tests/mpesa-callback.integration.test.ts`)
- [x] **`npm audit` clean** — `deepmerge-ts` override + dependency bumps
- [x] **Production deploy target** — `Dockerfile`, `docker-compose.prod.yml`, `railway.toml`, `[deploy.md](./deploy.md)`, `scripts/smoke-health.sh`
- [x] **Branch protection (repo artifacts)** — `[github-branch-protection.md](./github-branch-protection.md)`, `scripts/setup-branch-protection.sh`, PR template

### Remaining (P0)

- [ ] **Production host live** — deploy to Railway/VPS with real domain, managed Postgres, R2/S3 (artifacts ready; hosting account + DNS pending)
- [ ] **Branch protection applied on GitHub** — run `./scripts/setup-branch-protection.sh` once (admin + official `gh` CLI)
- [ ] **Restore drill executed** — run quarterly checklist in `docs/operations/backups.md` (not just written)
- [ ] **Staging environment** — separate DB, M-Pesa sandbox, S3 bucket, `SENTRY_ENVIRONMENT=staging`

---

## P1 — Security & compliance depth

### Done

- [x] **Per-phone OTP limits** — 5/hour, 60s resend cooldown, 5 verify attempts (`src/lib/otp.ts`)
- [x] **IP-level OTP rate limiting** — 30/hour per IP via Postgres `RateLimitHit` (`src/lib/rate-limit.ts`, `/api/auth/otp/send`)
- [x] **Upload magic-byte validation** — PDF/JPEG/PNG/WebP/HEIC sniffing; rejects spoofed Content-Type (`src/lib/file-type.ts`)
- [x] **Upload malware scan** — ClamAV clamd INSTREAM on provider docs + case attachments (`src/lib/virus-scan.ts`, `upload-security.ts`)
- [x] **M-Pesa callback auth** — `?token=` secret required in production
- [x] **Account erasure guard** — blocks while active bookings exist
- [x] **Legal pages public** — terms, privacy, conduct, refunds
- [x] **Rate limiting (API)** — Postgres IP buckets (global/auth/upload/bookingCreate) + per-user booking cap; wired on all mutation routes via `api-rate-limit.ts` + `observeApiRequest` (`API_RATE_LIMIT_ENABLED` in `.env.example`)

### Remaining (P1)

- [ ] **Admin model upgrade** — DB `ADMIN` role as source of truth; retire env-only `ADMIN_EMAILS` over time
- [ ] **Admin audit log** — record verification decisions, complaint resolutions, erasure requests
- [ ] **Auth session perf** — reduce Prisma hits in JWT callback (cache role/admin flag)
- [ ] **Data retention policy** — automated TTL for visit notes, stale OTP rows, dismissed complaints, verification docs post-approval
- [ ] **DPA / subprocessor register** — document SMS, maps, M-Pesa, Sentry, storage provider in `docs/legal/` or privacy page
- [ ] **CSP tighten** — remove `'unsafe-inline'` for scripts where Next.js allows nonces

---

## P2 — Reliability, observability & ops

### Done

- [x] **Sentry error tracking** — optional via `SENTRY_DSN`
- [x] **Backup script + runbook** — on-demand dumps; managed-DB guidance documented
- [x] **RED metrics (in-process)** — 15m rolling window on instrumented API routes (`src/lib/red-metrics.ts`)
- [x] **Booking funnel snapshot** — Postgres counts + structured `booking.funnel.*` logs (`src/lib/booking-funnel.ts`)
- [x] **Correlation IDs** — `x-request-id` in middleware + logs + Sentry tag (`src/lib/request-id.ts`)
- [x] **Admin ops API** — `GET /api/admin/ops` (funnel + launch + red)
- [x] **Alerting runbook** — [`alerting.md`](./alerting.md) (Sentry + uptime on `/api/health`)

### Remaining (P2)

- [ ] **Scheduled Postgres backups** — cron or managed snapshots + offsite copy (script exists; schedule not wired)
- [ ] **Object storage replication** — cross-region or second-account copy for uploads
- [ ] **SBOM + build provenance** — CycloneDX/Syft + cosign attestation on release (Tier 2 supply chain)
- [ ] **Load / capacity test** — booking peak, map geo query, concurrent STK callbacks
- [ ] **DR game day** — timed restore against RTO/RPO targets in runbook

---

## P2 — Frontend, UX & accessibility

Per `/frontend-design` and `references/ui-design-and-accessibility.md` — Janell Health is functional MVP; launch polish is open.

### Done

- [x] **Theme system** — light/dark via `theme-provider` + toggle
- [x] **Mobile nav + portal dock** — responsive shell
- [x] **Legal + emergency + support pages** — reachable without login
- [x] **Global error page** — user-facing fallback with Sentry capture
- [x] **Find + book flow polish** — trust strip, empty state, booking steps, panel cards, map loading (`caregiver-map`, `book-form`, `booking-steps`)
- [x] **Pay flow clarity** — STK status phases, 90s countdown, cancel/retry, M-Pesa result-code messages (`pay-form`, `mpesa-pay-status`, `payment-poll`)
- [x] **Form persistence** — localStorage drafts (case, patient/giver onboarding), failed-submit retry for uploads, `FormErrorAlert` (`form-draft.ts`, `use-form-draft.ts`)

### Remaining (frontend)

- [ ] **Design pass (other surfaces)** — landing, onboarding, giver dashboard
- [ ] **WCAG 2.2 AA audit** — axe + manual keyboard + screen reader on patient + giver flows
- [ ] **Fix a11y lint warnings** — combobox `aria-selected` on location/sign-in pickers (4 ESLint warnings)
- [ ] **Touch targets** — verify ≥ 44×44px on primary actions (mobile booking/pay)
- [ ] **Loading & empty states** — skeletons/empty illustrations for find-caregiver, bookings list, earnings
- [ ] **Verified badge + plan badges** — consistent trust signals on map and profile

---

## Test inventory


| File                                       | Focus                                |
| ------------------------------------------ | ------------------------------------ |
| `tests/booking-conflicts.unit.test.ts`     | Overlap math                         |
| `tests/booking.integration.test.ts`        | Lifecycle + tenant isolation         |
| `tests/mpesa-config.unit.test.ts`          | URLs, mock gating, callback token    |
| `tests/mpesa-callback.integration.test.ts` | Callback route idempotency           |
| `tests/otp.integration.test.ts`            | OTP rate limits                      |
| `tests/admin.integration.test.ts`          | Admin 403 / allowlist                |
| `tests/admin-ops.integration.test.ts`      | Admin ops API funnel + RED           |
| `tests/red-metrics.unit.test.ts`           | RED metrics window                   |
| `tests/privacy.integration.test.ts`        | Export + erasure                     |
| `tests/storage.unit.test.ts`               | Keys, local backend, traversal block |
| `tests/health.unit.test.ts`                | Health handler                       |
| `tests/file-type.unit.test.ts`             | Magic-byte upload validation         |
| `tests/rate-limit.integration.test.ts`     | IP OTP rate limits                   |
| `tests/api-rate-limit.unit.test.ts`        | API scope resolution + enable flag   |
| `tests/api-rate-limit.integration.test.ts` | Global + user bookingCreate 429      |
| `tests/client-ip.unit.test.ts`             | Forwarded IP extraction              |
| `tests/sentry-options.unit.test.ts`        | Scrubbing + sample rate              |
| `tests/mpesa-result-messages.unit.test.ts`   | STK result-code user messages        |
| `tests/payment-poll.unit.test.ts`          | Poll outcome + timeout constants     |
| `tests/virus-scan.unit.test.ts`          | ClamAV config + response parsing     |
| `tests/upload-security.unit.test.ts`     | Magic bytes + malware gate           |
| `tests/form-draft.unit.test.ts`          | localStorage draft round-trip        |


### Test gaps (future)

- [ ] Admin verification API 403 for non-admin
- [ ] STK push route contract test (mocked Daraja) — client poll + result messages covered; route contract still open
- [x] Upload route rejects mismatched magic bytes — covered by `file-type.unit.test.ts` + route wiring
- [x] Upload route blocks malware when scanner reports infected — `upload-security.unit.test.ts`
- [ ] Referral cookie + redirect flow
- [ ] Membership billing idempotency

---

## Suggested next steps

### Blocked on you (ops — same four since deploy artifacts landed)

1. **Production host live** — Railway project + domain + managed Postgres + R2 ([`deploy.md`](./deploy.md))
2. **Apply branch protection on GitHub** — `./scripts/setup-branch-protection.sh`
3. **Configure Sentry + uptime alerts** — [`alerting.md`](./alerting.md)
4. **Restore drill** (once) + **staging env** when host exists

### Next in-repo (agent can continue without host)

1. **Fix a11y lint warnings** — combobox `aria-selected` on location/sign-in pickers
2. **Admin audit log** — verification decisions, complaint resolutions, erasure requests
3. **Data retention policy** — TTL for OTP rows, visit notes, dismissed complaints

---

## Step log


| Date       | Step                        | Notes                                                                                                                  |
| ---------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 2026-09-01 | Tracker created             | Consolidated done/remaining from chats `fa4eef3c` + continuation session                                               |
| 2026-09-01 | P0 batch 1                  | Public routes, CI, tests, M-Pesa, storage, headers, logging, health, SMS, privacy                                      |
| 2026-09-01 | P0 batch 2                  | Sentry, backups, `.env.example`, gitleaks, semgrep, OTP/admin/callback tests, audit override                           |
| 2026-09-01 | Production deploy artifacts | Dockerfile (standalone), compose prod, Railway config, deploy runbook, smoke-health script, `AUTH_URL` in env template |
| 2026-09-01 | Upload + IP OTP hardening | Magic-byte validation (`file-type.ts`), Postgres IP rate limits (`RateLimitHit`), 11 new tests (56 total) |
| 2026-09-01 | Branch protection + find/book UI | Protection runbook/script, PR template; trust strip, booking steps, panel cards on find + book flows |
| 2026-09-01 | Metrics + alerting | RED metrics, funnel logs, x-request-id, GET /api/admin/ops, alerting runbook (62 tests) |
| 2026-09-01 | Pay flow UX | STK status panel, countdown, cancel/retry, result-code messages, booking poll API field (69 tests) |
| 2026-09-01 | Upload malware scan | ClamAV clamd INSTREAM, upload-security gate, compose sidecar, health check (81 tests) |
| 2026-09-01 | Tracker clarity | Progress summary + launch gate; split ops vs in-repo next steps (P0 open unchanged — external) |
| 2026-09-01 | Form persistence | localStorage drafts, upload retry paths, FormErrorAlert (84 tests) |
| 2026-09-01 | API rate limiting | Postgres IP/user buckets, all mutation routes, Retry-After 429 (95 tests) |


---

## How to update this doc

After completing any item above:

1. Change `[ ]` → `[x]` (or add a new row if the scope was not listed).
2. Refresh **Last updated**, **Snapshot** test count, and **Step log**.
3. If priority shifts, reorder **Suggested next steps** — do not delete completed history from the log.

