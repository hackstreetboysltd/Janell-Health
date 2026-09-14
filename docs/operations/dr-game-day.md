# DR game day (Tier 2)

Run **after** production has real users and backups are scheduled. Goal: prove RTO/RPO from [backups.md](./backups.md).

## Scenario

Primary Postgres is unavailable. Restore from last night's backup to a scratch instance and bring the app back online.

## Steps (timed)

| Step | Action | Target |
| --- | --- | --- |
| 1 | Announce game day window | — |
| 2 | Restore Postgres to scratch DB from latest backup | ≤ 4 h RTO |
| 3 | Point staging app at scratch `DATABASE_URL` | — |
| 4 | `npx prisma migrate deploy` | — |
| 5 | `./scripts/smoke-health.sh` + login + one booking read | — |
| 6 | Restore one S3 object from versioning | — |
| 7 | Record wall-clock times in ops log | — |

## Pass criteria

- Scratch app serves `/api/health` with `database: ok`
- At least one booking row readable
- Total elapsed ≤ documented RTO (4 h)

## Fail actions

- Update [backups.md](./backups.md) with blockers
- Fix backup/offsite script gaps before next quarter
