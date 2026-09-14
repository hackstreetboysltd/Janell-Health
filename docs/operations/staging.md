# Staging environment

Run a **separate** Janell Health stack before production go-live. Staging uses Daraja **sandbox**, a **dedicated Postgres**, an **isolated S3/R2 bucket**, and `SENTRY_ENVIRONMENT=staging`.

---

## Checklist

| Item | Staging value |
| --- | --- |
| App URL | e.g. `https://staging.carelink.ke` |
| `AUTH_URL` | Same as public staging URL |
| Postgres | New database (not prod) |
| `S3_BUCKET` | e.g. `carelink-staging-uploads` |
| `MPESA_ENV` | `sandbox` |
| `MPESA_CALLBACK_URL` | `https://staging…/api/mpesa/callback?token=<secret>` |
| `SENTRY_ENVIRONMENT` | `staging` |
| Admin user | `UPDATE "User" SET role = 'ADMIN' WHERE email = '…'` |

Copy [`.env.staging.example`](../../.env.staging.example) into your host secret manager.

---

## Vercel + Neon (serverless)

1. Create a **staging** Neon branch/project + R2 bucket + Upstash Redis DB.
2. Import the same GitHub repo on Vercel (Preview env → staging secrets).
3. Set variables from [`.env.staging.example`](../../.env.staging.example).
4. Run migrations: `DIRECT_URL=<neon-direct> npm run db:migrate:deploy`
5. Deploy Preview or a staging domain → update `AUTH_URL` / `MPESA_CALLBACK_URL`.
6. Smoke: `./scripts/smoke-health.sh https://staging.carelink.ke`

Full guide: [vercel-neon.md](./vercel-neon.md).

---

## Railway (recommended for ClamAV)

1. Create a **second Railway project** (or environment) named `carelink-staging`.
2. Attach a **new Postgres** plugin → set `DATABASE_URL`.
3. Set variables from `.env.staging.example`.
4. Deploy from the same Dockerfile / [`railway.toml`](../../railway.toml).
5. Add staging domain → update `AUTH_URL` and `MPESA_CALLBACK_URL`.
6. Register the callback URL in [Daraja sandbox](https://developer.safaricom.co.ke/).
7. Run migrations:
   ```bash
   railway run npx prisma migrate deploy
   ```
8. Smoke test:
   ```bash
   ./scripts/smoke-health.sh https://staging.carelink.ke
   ```

---

## Docker Compose (VPS)

Use production compose with a separate `.env.staging` file:

```bash
cp .env.staging.example .env.staging
# Edit secrets, AUTH_URL, DATABASE_URL if using external Postgres

docker compose -f docker-compose.prod.yml --env-file .env.staging up -d --build
./scripts/smoke-health.sh http://localhost:3000
```

Prefer managed Postgres even for staging so backups behave like production.

---

## Validation on staging

- [ ] Phone OTP (Africa's Talking sandbox)
- [ ] Full booking flow: request → accept → M-Pesa sandbox STK → callback
- [ ] Upload provider document (ClamAV + S3)
- [ ] Admin verification queue (`role = ADMIN`)
- [ ] Sentry events tagged `environment: staging`
- [ ] `./scripts/load-test.sh https://staging.carelink.ke`

---

## Related

- [Production deploy](./deploy.md)
- [Go-live checklist](./go-live-checklist.md)
- [Alerting](./alerting.md)
