# Janell Health — Roadmap (handoff)

**Last updated:** 2026-09-01 04:00 PM EAT  
**Use this file** to continue work in a new chat. Detailed history lives in [`production-readiness.md`](./production-readiness.md) — ignore that for day-to-day; follow the phases below.

---

## Project

- **What:** Kenya healthcare/caregiver marketplace — Next.js 16, Prisma/Postgres, Auth.js, M-Pesa STK, phone OTP.
- **Tier:** Tier 1 MVP (approaching Tier 2).
- **Repo:** `hackstreetboysltd/Janell-Health`
- **Tests:** 104 passing / 28 files (`npm test`, `npm run typecheck`)
- **Rule:** Do not commit unless explicitly asked.

---

## Already shipped (do not redo)

Core app flows, CI (lint → typecheck → build → audit → test), gitleaks + semgrep, M-Pesa hardening, object storage (local + S3/R2), upload magic-bytes + ClamAV scan, API rate limits, OTP limits, privacy export/erase, Sentry instrumentation, RED metrics + admin ops API, pay-flow UX, form persistence (localStorage drafts), Docker/deploy **artifacts** (not live host).

Key paths:

| Area | Location |
| --- | --- |
| Rate limits | `src/lib/api-rate-limit.ts` |
| Upload security | `src/lib/upload-security.ts`, `src/lib/virus-scan.ts` |
| M-Pesa | `src/lib/mpesa.ts`, `src/app/api/mpesa/` |
| Tracker (verbose) | `docs/operations/production-readiness.md` |
| Deploy runbook | `docs/operations/deploy.md` |

---

## What’s left — phased

**Phases 1–4 are in-repo only.**  
**Phase 5 scripts/runbooks are in-repo; live host/DNS/M-Pesa need your accounts.**

### Phase 1 — Quick fixes

- [x] Fix a11y lint — combobox `aria-selected` on location/sign-in pickers (4 ESLint warnings)
- [x] Test gaps:
  - [x] Admin verification API returns 403 for non-admin
  - [x] STK push route contract test (mocked Daraja)
  - [x] Referral cookie + redirect flow
  - [x] Membership billing idempotency

### Phase 2 — Admin & security

- [x] Admin audit log — verification decisions, complaint resolutions, erasure requests
- [x] Admin model — DB `ADMIN` role as source of truth; retire env-only `ADMIN_EMAILS`
- [x] Auth session perf — cache role/admin flag in JWT callback (fewer Prisma hits)
- [x] Data retention — automated TTL for OTP rows, visit notes, dismissed complaints, old verification docs
- [x] CSP tighten — remove `'unsafe-inline'` for scripts where Next.js allows nonces

### Phase 3 — Frontend polish

- [x] Design pass — landing, onboarding, giver dashboard
- [x] WCAG 2.2 AA audit — axe + keyboard + screen reader on patient/giver flows
- [x] Touch targets — ≥ 44×44px on primary actions (booking/pay)
- [x] Loading & empty states — find-caregiver, bookings list, earnings
- [x] Verified + plan badges — consistent on map and profile

### Phase 4 — Compliance & repo hygiene

- [x] DPA / subprocessor register — SMS, maps, M-Pesa, Sentry, storage (`docs/legal/` or privacy page)
- [ ] Apply GitHub branch protection — `./scripts/setup-branch-protection.sh` (repo admin; run after `gh auth login`)

### Phase 5 — Deployment & go-live *(host actions)*

| Item | In-repo | Host action |
| --- | --- | --- |
| Production host | [deploy.md](./deploy.md), Docker, Railway | Deploy + domain + Postgres + R2 |
| Staging | [staging.md](./staging.md), `.env.staging.example` | Second Railway project / VPS |
| M-Pesa callback live | [go-live-checklist.md](./go-live-checklist.md) | Register HTTPS URL in Daraja |
| Sentry + uptime | [alerting.md](./alerting.md), `uptime-monitors.example.json` | Create monitors + alert rules |
| Backups + offsite | `backup-db-offsite.sh`, [backups.md](./backups.md) | Cron + `BACKUP_S3_URI` |
| Restore drill | `restore-drill.sh`, `npm run preflight` | Run once on host DB, log duration |
| Load test | `load-test.sh`, `npm run load-test` | Run against staging/prod URL |
| DR + SBOM | [dr-game-day.md](./dr-game-day.md), CI `sbom` job | Game day after first users |

**Master checklist:** [go-live-checklist.md](./go-live-checklist.md)

---

## How to pick up in a new chat

Paste something like:

> Continue Janell Health from `docs/operations/roadmap.md`. Work Phase 1 next (or Phase N). Update roadmap checkboxes and step log when done. Do not commit unless I ask.

**Suggested next task:** [go-live-checklist.md](./go-live-checklist.md) — deploy staging, then production on Railway/VPS.

---

## Verify before claiming done

```bash
npm test
npm run typecheck
npm run lint   # if touching UI
```

After each completed item: check the box above, bump **Last updated**, add one line to the step log below.

---

## Step log

| Date | Phase | Done |
| --- | --- | --- |
| 2026-09-01 | — | Roadmap file created; baseline 95 tests |
| 2026-09-01 | 1 | a11y `aria-selected` on combobox pickers; admin verification 403, STK Daraja contract, referral cookie/redirect, membership idempotency tests (100 tests) |
| 2026-09-01 | 2 | AdminAuditLog, DB ADMIN role, JWT cache, data retention API, CSP nonces (104 tests) |
| 2026-09-01 | 3 | Design pass, WCAG audit doc, 44px CTAs, empty/loading states, CaregiverBadgeRow |
| 2026-09-01 | 4 | Subprocessor register + DPA (`docs/legal/`, `/legal/subprocessors`, `/legal/dpa`); branch protection scripts hardened + verify helper |
| 2026-09-01 | 5 | Go-live pack: staging env, load/restore/backup scripts, SBOM CI, uptime template, go-live checklist |
| 2026-09-01 | 5 | Restore drill Docker path; `go-live-preflight.sh` + `npm run preflight`; local backup/restore/load validated |
