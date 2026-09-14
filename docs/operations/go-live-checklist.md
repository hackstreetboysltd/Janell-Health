# Go-live checklist (Phase 5)

Use this after Phases 1–4 are complete. Items marked **(host)** require your production account; **(repo)** artifacts are already in this repository.

**Local gate (repo):** `npm run preflight` — typecheck, tests, backup, restore drill. Add `--url https://…` for smoke + load test against a running deploy.

---

## 0. Local preflight **(repo)**

- [x] `npm run preflight` — backup + restore drill validated locally (2026-09-01, ~3s restore)
- [ ] `npm run preflight -- --url https://<staging-domain>` after staging is up

## 1. Staging **(host)**

- [ ] Deploy staging per [staging.md](./staging.md)
- [ ] End-to-end M-Pesa **sandbox** STK + callback on staging URL
- [ ] `./scripts/load-test.sh https://<staging-domain>`

## 2. Production host **(host)**

- [ ] Vercel + Neon + Upstash + R2/S3 ([vercel-neon.md](./vercel-neon.md)) **or** Railway/VPS ([deploy.md](./deploy.md))
- [ ] Domain + TLS (`AUTH_URL`, `MPESA_CALLBACK_URL`)
- [ ] `STORAGE_BACKEND=s3`, `MPESA_MOCK` unset; `CLAMAV_ENABLED=true` on Docker/Railway, **`false` on Vercel**
- [ ] Grant ops `User.role = ADMIN` in Postgres
- [ ] `./scripts/smoke-health.sh https://<prod-domain>`

## 3. M-Pesa live **(host)**

- [ ] Daraja production app approved
- [ ] `MPESA_ENV=production`, live shortcode/passkey
- [ ] Callback URL registered: `https://<prod>/api/mpesa/callback?token=<MPESA_CALLBACK_SECRET>`
- [ ] Test STK with small real amount

## 4. Observability **(host + repo)**

- [ ] `SENTRY_DSN` + alerts per [alerting.md](./alerting.md) **(host)**
- [ ] Uptime monitor on `/api/health` — see [uptime-monitors.example.json](./uptime-monitors.example.json) **(host)**
- [ ] Log drain configured on host **(host)**

## 5. Backups **(repo scripts + host schedule)**

- [ ] Managed Postgres automated backups ≥ 7 days **(host)**
- [ ] Cron: `./scripts/backup-db.sh` **(host)** — see [backups.md](./backups.md)
- [ ] Offsite: `./scripts/backup-db-offsite.sh` with `BACKUP_S3_URI` **(host)**
- [ ] `./scripts/restore-drill.sh` once — record duration **(host)**

## 6. Repo hygiene **(host)**

- [ ] `./scripts/setup-branch-protection.sh` after `gh auth login` **(host)**
- [ ] CI `quality` + `security` green on `main`

## 7. Tier 2 (after first users)

- [ ] DR game day — [dr-game-day.md](./dr-game-day.md)
- [ ] SBOM archived from CI artifact `sbom-cyclonedx.json`

---

## Rollback

Redeploy previous image/commit. If migration incompatible, restore Postgres snapshot ([backups.md](./backups.md)).
