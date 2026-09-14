# Production deployment

Janell Health ships as a **Docker image** (Next.js standalone). Postgres and object storage are **external services** in production — do not rely on local disk for uploads or a single-server Postgres without backups.

**Recommended stack (MVP / Tier 1):**

| Layer | Choice | Why |
|---|---|---|
| **App host** | [Vercel](https://vercel.com) **or** [Railway](https://railway.app) / Docker | Vercel fits Next.js; Railway fits Docker + ClamAV sidecar |
| **Database** | [Neon](https://neon.tech) (or Railway Postgres / Supabase) | Automated backups, PITR where available |
| **Rate limits** | [Upstash Redis](https://upstash.com) (optional) or Postgres | Upstash preferred on serverless; Postgres works without Redis |
| **File storage** | Cloudflare R2 or AWS S3 (`STORAGE_BACKEND=s3`) | Multi-instance safe; never `local` in prod |
| **Secrets** | Host secret manager (Vercel / Railway variables, Doppler, 1Password) | No `.env` on disk in prod |

> M-Pesa Daraja requires a **stable HTTPS callback URL**. Set `MPESA_CALLBACK_URL` to your public domain before going live.

**Full Vercel + Neon + Upstash walkthrough:** [`vercel-neon.md`](./vercel-neon.md)

---

## Prerequisites

1. Domain pointed at your app host (e.g. `app.carelink.ke`).
2. Postgres database created; connection string ready.
3. R2/S3 bucket for uploads (if using object storage — **required** for multi-instance deploys).
4. Secrets generated: `AUTH_SECRET` (≥32 chars), `MPESA_CALLBACK_SECRET`, Daraja keys, SMS keys.

Copy [`.env.example`](../../.env.example) as a checklist — set every value in the host's secret UI, not in git.

### Before deploy (local)

```bash
npm run preflight                                    # typecheck, tests, backup, restore drill
npm run preflight -- --url https://staging.example.com   # + smoke + load test
```

Resolve any `WARN` lines (branch protection, missing prod secrets) before pointing DNS at production.

### Required production env vars

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Managed Postgres connection string (Neon: **pooled**) |
| `DIRECT_URL` | Unpooled Postgres URL for `prisma migrate deploy` (local: same as `DATABASE_URL`) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | Public app URL, e.g. `https://app.carelink.ke` (Auth.js) |
| `NODE_ENV` | `production` |
| `STORAGE_BACKEND` | `s3` |
| `S3_*` | Bucket, keys, endpoint (R2: `S3_REGION=auto`) |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Optional; when set, rate limits use Upstash |
| `MPESA_ENV` | `production` when live |
| `MPESA_CALLBACK_URL` | `https://app.carelink.ke/api/mpesa/callback?token=<secret>` |
| `MPESA_CALLBACK_SECRET` | Same token as in callback URL |
| `MPESA_MOCK` | **unset** or `false` |
| `ALLOW_DEV_LOGIN` | `false` |
| Admin access | Set `User.role = ADMIN` in Postgres for ops accounts |
| `SENTRY_DSN` | Recommended |
| `SENTRY_ENVIRONMENT` | `production` |
| `CLAMAV_ENABLED` | `true` on Docker/Railway; **`false` on Vercel** |
| `CLAMD_HOST` | Hostname of clamd (compose: `clamav`; Railway: private service) |

See `.env.example` for the full list (SMS, Google OAuth, feature flags).

### Upload malware scanning (ClamAV)

Provider ID documents and case attachments are scanned via **clamd INSTREAM** when `CLAMAV_ENABLED=true`. In production, scanning is **required by default** (`CLAMAV_REQUIRED` unset → fail closed if clamd is down).

**Docker Compose (VPS):** `docker-compose.prod.yml` includes a `clamav` sidecar. First boot may take ~2 minutes while virus definitions download; `/api/health` reports `checks.clamav`.

**Railway:** add a second service from `clamav/clamav:1.4`, set `CLAMD_HOST` to its private hostname on the app service, and enable `CLAMAV_ENABLED=true`.

**Local dev:** leave `CLAMAV_ENABLED=false` (default). To test scanning locally, run clamd and set `CLAMAV_ENABLED=true` + `CLAMAV_REQUIRED=false`.

---

## Option A — Vercel + Neon + Upstash (serverless)

See the full procedure: [`vercel-neon.md`](./vercel-neon.md).

Summary:

1. Create Neon project → set `DATABASE_URL` (pooled) + `DIRECT_URL` (direct).
2. Create Upstash Redis → set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.
3. Create R2/S3 bucket → `STORAGE_BACKEND=s3` + `S3_*`.
4. Import repo on Vercel → paste env vars → deploy.
5. Run migrations from your laptop: `npm run db:migrate:deploy`.
6. Custom domain → update `AUTH_URL` / `MPESA_CALLBACK_URL` → smoke test.

Keep `CLAMAV_ENABLED=false` on Vercel.

---

## Option B — Railway (Docker + ClamAV)

1. **Create project** → New → GitHub repo → Janell Health.
2. **Add Postgres** plugin → copy `DATABASE_URL` into service variables (set `DIRECT_URL` to the same value).
3. **Set variables** from the table above (Railway → Variables).
4. **Deploy** — Railway builds `Dockerfile` (see [`railway.toml`](../../railway.toml)).
5. **Run migrations** (first deploy or after schema changes):
   ```bash
   railway run npx prisma migrate deploy
   ```
   Or set `RUN_MIGRATIONS=true` once on the web service, redeploy, then remove it.
6. **Custom domain** → Railway Settings → Networking → add domain → update `AUTH_URL` and `MPESA_CALLBACK_URL`.
7. **Smoke test:**
   ```bash
   ./scripts/smoke-health.sh https://app.carelink.ke
   ```

Railway health checks use `/api/health` (configured in `railway.toml`).

---

## Option C — Docker on a VPS

For a single server you control (e.g. Hetzner, DigitalOcean):

```bash
# On the server — clone repo, configure .env (never commit)
cp .env.example .env
# Edit .env: AUTH_URL, AUTH_SECRET, POSTGRES_PASSWORD, S3_*, MPESA_*, etc.

docker compose -f docker-compose.prod.yml up -d --build
./scripts/smoke-health.sh http://localhost:3000
```

Put **Caddy** or **nginx** in front for TLS:

```text
app.carelink.ke  →  reverse proxy  →  localhost:3000
```

Schedule `./scripts/backup-db.sh` via cron (see [backups.md](./backups.md)). Prefer migrating Postgres to a managed provider before handling real patient data.

---

## Option D — Build and push image manually

```bash
docker build -t janell-health:latest .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e AUTH_SECRET="..." \
  -e AUTH_URL="https://app.carelink.ke" \
  -e NODE_ENV=production \
  -e RUN_MIGRATIONS=true \
  janell-health:latest
./scripts/smoke-health.sh http://localhost:3000
```

The image runs as non-root user `nextjs`, exposes port `3000`, and includes a Docker `HEALTHCHECK` on `/api/health`.

---

## Release checklist

Use this on every production deploy:

- [ ] CI green on the commit being deployed (`quality` + `security` jobs)
- [ ] `npx prisma migrate deploy` applied against production DB
- [ ] Secrets updated in host UI (no drift from `.env.example`)
- [ ] `MPESA_CALLBACK_URL` matches live domain + token
- [ ] `STORAGE_BACKEND=s3` and bucket reachable
- [ ] `CLAMAV_ENABLED=true` and `/api/health` shows `checks.clamav: ok` (when scanning enabled)
- [ ] `./scripts/smoke-health.sh https://<your-domain>` returns `status: ok`
- [ ] Sign-in flow works (OTP or Google) on production URL
- [ ] Sentry receiving events (optional test error)

---

## Rollback

1. Redeploy the previous image/commit from your host's rollback UI.
2. If a migration was applied and is incompatible, restore Postgres from snapshot (see [backups.md](./backups.md)) — **migrations are forward-only**; plan breaking migrations carefully.

---

## Monitoring

- **Uptime:** ping `GET /api/health` every 1–5 minutes (UptimeRobot, Better Stack, Railway health).
- **Errors:** Sentry (`SENTRY_DSN`).
- **Logs:** JSON stdout from the container — ship to your host's log drain.

---

## Related docs

- [Vercel + Neon + Upstash](./vercel-neon.md)
- [Go-live checklist](./go-live-checklist.md)
- [Staging environment](./staging.md)
- [Production readiness tracker](./production-readiness.md)
- [Backups & restore](./backups.md)
- [README — Environment](../../README.md#environment)
