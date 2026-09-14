# Backup and restore

Janell Health holds two data classes that must be backed up independently:

| Data class | RPO target | RTO target | Mechanism |
|---|---|---|---|
| **Postgres** (users, bookings, payments, metadata) | 24 hours | 4 hours | Automated snapshots + optional logical dumps |
| **Object storage** (ID scans, case attachments) | 24 hours | 4 hours | Bucket versioning + cross-region or off-project copy |

> A backup you have never restored is not a backup. Run the restore drill below at least quarterly.

## Postgres

### Managed production (recommended)

Use a managed Postgres provider (Neon, Supabase, RDS, Cloud SQL) with:

- **Automated daily backups** retained ≥ 7 days
- **Point-in-time recovery (PITR)** enabled where available
- Backups stored in a **separate project/account** from the app runtime

Document your provider’s restore UI/CLI in your deployment runbook. Typical flow:

1. Create a new database instance from a snapshot or PITR timestamp
2. Update `DATABASE_URL` in the secret manager
3. Redeploy the app
4. Run `npx prisma migrate deploy` (idempotent — applies any pending migrations)
5. Verify `/api/health` returns `database: ok`

### Local / self-hosted

Create an on-demand logical dump:

```bash
./scripts/backup-db.sh
```

Writes `backups/carelink-<timestamp>.sql.gz` (gitignored, mode `600`).

Schedule with cron (example — daily at 02:00 UTC):

```cron
0 2 * * * cd /path/to/carelink && ./scripts/backup-db-offsite.sh >> ~/.local/state/carelink/backup.log 2>&1
```

Set `BACKUP_S3_URI`, `BACKUP_SCP_TARGET`, or `BACKUP_RCLONE_TARGET` for offsite copy (see [`scripts/backup-db-offsite.sh`](../../scripts/backup-db-offsite.sh)).

Copy dumps off the host (S3, another machine). A dump that only lives on the same disk as the database is not offsite.

### Restore from a logical dump

```bash
# Stop the app first to avoid writes during restore.
gunzip -c backups/carelink-YYYYMMDDTHHMMSSZ.sql.gz | \
  docker compose exec -T db psql -U carelink -d carelink

# Or with DATABASE_URL:
gunzip -c backups/carelink-YYYYMMDDTHHMMSSZ.sql.gz | psql "$DATABASE_URL"
```

After restore:

1. `npx prisma migrate deploy`
2. `curl -s http://localhost:3000/api/health | jq`
3. Spot-check a booking and a user login

## Object storage

When `STORAGE_BACKEND=s3`:

- Enable **versioning** on the bucket
- Enable **public access block** (objects served only via signed URLs through the app)
- For production, replicate or lifecycle-copy to a **second bucket in another account/region**
- Erasure (`POST /api/me/erase`) deletes objects — backups are your recovery path for accidental deletion

### Restore object

1. Identify the object key from Postgres (`CaseAttachment.storageKey`, `ProviderDocument.storageKey`)
2. Restore the version from your provider’s console or `aws s3api restore-object`
3. Confirm download via the authenticated API route

## Quarterly restore drill

Automated helper (works with `docker compose up -d db` — no host `pg_dump` required):

```bash
# Full drill: backup → scratch DB → migrate → verify
DATABASE_URL="postgresql://carelink:carelink@localhost:5432/carelink" ./scripts/restore-drill.sh

# Reuse latest ./backups/ file
SKIP_BACKUP=1 ./scripts/restore-drill.sh
```

Or run the full local gate before deploy:

```bash
npm run preflight              # typecheck, tests, backup, restore drill
npm run preflight -- --url https://staging.example.com   # + smoke + load test
```

Record the date and outcome each time:

- [ ] Restore Postgres to a **scratch** database (not production)
- [ ] Run `npm test` against the scratch DB
- [ ] Restore ≥ 1 object-storage file and verify checksum/size
- [ ] Measure wall-clock time — must meet RTO
- [ ] File result in your ops log (pass/fail, duration, issues)

## What Terraform / code does *not* back up

- In-app notification history (ephemeral)
- OTP rows (short TTL by design)
- Local `./uploads` on a developer laptop — use `STORAGE_BACKEND=s3` in any shared/staging environment

Infrastructure itself is recreated from this repository + `prisma migrate deploy`.
