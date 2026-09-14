# Vercel + Neon + Upstash

Step-by-step host setup for Janell Health on **Vercel** (Next.js), **Neon** (Postgres), and **Upstash Redis** (optional rate limits), with **Cloudflare R2** (or S3) for uploads.

Repo-side support is already wired:

- `output: "standalone"` is skipped on Vercel (`next.config.ts`)
- Prisma `DIRECT_URL` for Neon migrations (`prisma/schema.prisma`)
- Upstash-backed rate limits when `UPSTASH_REDIS_REST_*` are set (`src/lib/rate-limit.ts`)
- `vercel.json` build/install defaults
- `npm run db:migrate:deploy` / `scripts/migrate-deploy.sh`

> ClamAV cannot run on Vercel. Keep `CLAMAV_ENABLED=false`. Magic-byte upload checks still apply. For full malware scanning, use Railway/VPS instead.

---

## 1. Neon

1. Create a Neon project (and a second project or branch for **staging**).
2. For each environment, copy:
   - **Pooled** connection → `DATABASE_URL` (add `?sslmode=require` if missing; for Prisma + PgBouncer you may also add `&pgbouncer=true`)
   - **Direct** connection → `DIRECT_URL` (unpooled, for migrations only)
3. Enable automated backups / PITR on the paid plan before real patient data.
4. From your laptop (once per environment):

```bash
DIRECT_URL="postgresql://...neon.tech/neondb?sslmode=require" \
  npm run db:migrate:deploy
```

Optional staging seed:

```bash
DATABASE_URL="<staging pooled or direct>" DIRECT_URL="<same or direct>" npm run db:seed
```

Grant admin after first sign-in:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

---

## 2. Upstash Redis

1. Create a Redis database in the same region as Vercel/Neon when possible.
2. Copy REST credentials:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Set both on Vercel. When present, OTP/API rate limits use Redis; otherwise Postgres `RateLimitHit` is used.
4. Use a **separate** Redis DB for staging.

---

## 3. Object storage (R2 or S3) — required

Vercel has no durable disk. Set:

| Variable | Example (R2) |
|---|---|
| `STORAGE_BACKEND` | `s3` |
| `S3_BUCKET` | `janell-health-prod` |
| `S3_REGION` | `auto` |
| `S3_ENDPOINT` | `https://<accountid>.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | R2 API token |
| `S3_FORCE_PATH_STYLE` | `false` |

Create a separate bucket for staging.

---

## 4. Vercel project

1. Push this repo to GitHub.
2. Vercel → **New Project** → import the repo.
3. Framework: Next.js (see `vercel.json`).
4. Create Production + Preview env vars (Preview should use **staging** Neon/R2/Upstash).
5. Deploy.

### Environment variables (Production)

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Neon **pooled** |
| `DIRECT_URL` | Neon **direct** (needed if any migrate runs in CI against this env) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | Final public HTTPS URL |
| `STORAGE_BACKEND` | `s3` |
| `S3_*` | From step 3 |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | From step 2 |
| `ALLOW_DEV_LOGIN` | `false` |
| `MPESA_MOCK` | unset / `false` |
| `ALLOW_MPESA_MOCK` | `false` |
| `CLAMAV_ENABLED` | `false` |
| `MPESA_*` / `SMS_*` / Google / Sentry | As needed — see `.env.example` |

After custom domain: update `AUTH_URL` and `MPESA_CALLBACK_URL`, then redeploy.

---

## 5. Migrations after schema changes

Vercel does **not** auto-migrate. After merging Prisma migrations:

```bash
npm run db:migrate:deploy   # uses DIRECT_URL from .env or shell
```

Then let Vercel deploy the matching commit.

---

## 6. Smoke test

```bash
./scripts/smoke-health.sh https://<your-domain>
```

Expect `status: ok`, `checks.database: ok`, `checks.redis: ok` (if Upstash set), `checks.clamav: skipped`, `storage: s3`, `rateLimit: upstash` (or `postgres`).

---

## 7. Domain, OAuth, M-Pesa

1. Vercel → Domains → add `app.yourdomain.com`.
2. Google OAuth redirect: `https://app.yourdomain.com/api/auth/callback/google`.
3. Daraja callback: `https://app.yourdomain.com/api/mpesa/callback?token=<MPESA_CALLBACK_SECRET>`.

---

## Related

- [deploy.md](./deploy.md) — Railway / Docker options
- [staging.md](./staging.md)
- [go-live-checklist.md](./go-live-checklist.md)
- [backups.md](./backups.md)
