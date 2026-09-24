# Janell Health

Mobile-first Next.js app connecting patients in Nairobi with **verified** nurses and caregivers for home visits.

**Tagline:** Trusted care. Right at home.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Auth.js Google sign-in (`prompt=select_account`); local email continue when Google keys are unset
- Prisma + PostgreSQL
- Leaflet map (region-based pins)
- TipTap rich text
- M-Pesa STK Push (Daraja) with `MPESA_MOCK=true` for local success flow
- 10% platform commission on confirmed bookings
- Provider verification workflow + admin operations dashboard

## Quick start

```bash
# Start Postgres
docker compose up -d

# Install & migrate
npm install
npx prisma migrate dev
npm run db:seed   # linked patients, givers, bookings, partners
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts (after `npm run db:seed`)

Use **demo login** (email + any name) on the matching portal when Google OAuth keys are unset, or set `ALLOW_DEV_LOGIN=true`.

| Email | Portal | What you get |
|-------|--------|----------------|
| `patient@gmail.com` | Patient | Amina — wound care + nursing bookings with Jane |
| `family@gmail.com` | Patient | Grace booking elderly care with Peter |
| `nurse@gmail.com` | Caregiver | Approved RN (Pro + Featured), live bookings |
| `caregiver@gmail.com` | Caregiver | Approved caregiver, elderly visits |
| `doctor@gmail.com` | Caregiver | Approved GP home visits |
| `pending.nurse@gmail.com` | Caregiver | Under review (shows in admin queue) |
| `admin@gmail.com` | Admin | Ops dashboard |

Seed is idempotent — re-run anytime to refresh demo rows without wiping unrelated users.

1. Choose **Patient**, **Caregiver**, or **Admin** portal  
2. Continue with Google (or enter a demo email above if OAuth keys are empty)  
3. Complete onboarding (patient / caregiver) — skipped for seeded accounts  
4. **Giver:** upload ID + license → submit for verification  
5. **Admin:** open [/admin](http://localhost:3000/admin) with `admin@gmail.com`  
6. **Patient:** open seeded bookings, or create a new care request → map → book → accept → M-Pesa (mock)  

## Patient booking flow

1. **New care request** — pick category, visit address, date/time, duration  
2. **Map** — verified professionals filtered by care type, distance from visit, and availability  
3. **Request booking** — professional receives the request (no payment yet)  
4. **Accept** — professional accepts; patient pays via M-Pesa  
5. **Confirmed** — both sides receive contact details  
6. **Mark complete** → leave a review  

## Phase 3 features

- Star ratings and reviews after completed visits  
- Repeat booking (prefill from prior visit)  
- Emergency banner on patient flows  
- Report provider + customer support → admin complaints queue  
- Legal pages: `/legal/terms`, `/legal/privacy`, `/legal/conduct`, `/legal/refunds`  
- SMS notifications stub (`SMS_ENABLED=true` + `SMS_API_KEY` when ready)  

## Phase 4 features

- Full **service taxonomy** (nursing vs caregiving) — providers tick offerings; patients optionally filter  
- **Earnings dashboard** at `/giver/earnings` (total, this month, per visit)  
- **Availability calendar** at `/giver/availability` — week view + manual time-off blocks  
- **Double-booking prevention** — overlapping visits blocked at request and accept  

## Phase 5 features

- **Phone + OTP** sign-in (Kenyan numbers) — primary login; Google optional  
- **Brand landing** — hero, tagline, verified-professional messaging  
- **Dark mode** — light / dark / system (toggle in header)  
- **Demo login hidden in production** — set `ALLOW_DEV_LOGIN=true` to override  
- **Launch metrics** on `/admin` — bookings/week, repeat rate, CSAT, acceptance time  

## Phase 6 features

- **Provider membership** — Basic (free), Professional (KSh 500/mo), Featured boost (KSh 1,000/mo) at `/giver/membership`  
- **Featured search ranking** — boosted providers appear first on the map  
- **Hospital referrals** — `/referral/knh`, `/referral/nairobi-hospital` set partner cookie on care requests  
- **Ambulance liaison** — paid listings on `/emergency` (linked from patient emergency banner)  
- **Visit notes** — professionals record brief visit notes; patients see them on the booking  

## Environment

Copy `.env.example` to `.env`. Important vars:

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Postgres connection (Neon: pooled) |
| `DIRECT_URL` | Unpooled URL for migrations (local: same as `DATABASE_URL`) |
| `AUTH_SECRET` | Random secret |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth web client; omit for local email continue |
| Admin access | Set `User.role = ADMIN` in Postgres for ops accounts |
| `VERIFICATION_REQUIRED` | Set `false` to show all active providers without verification (dev only) |
| `SMS_ENABLED` | `true` to send SMS alongside in-app notifications |
| `SMS_API_KEY` | Africa's Talking API key when SMS is enabled |
| `AT_USERNAME` | Africa's Talking username (use `sandbox` for sandbox) |
| `AT_ENV` | `sandbox` (default) or `production` for Africa's Talking API host |
| `SMS_SENDER_ID` | Optional sender ID / short code |
| `SMS_PROVIDER` | `africastalking` (default) |
| `PHONE_OTP_ENABLED` | Set `false` to disable phone OTP login |
| `ALLOW_DEV_LOGIN` | `true` to allow email/name demo login in production |
| `MPESA_MOCK` | `true` for local PIN simulation (ignored in production unless `ALLOW_MPESA_MOCK=true`) |
| `MPESA_ENV` | `sandbox` (default) or `production` — Daraja API host |
| `MPESA_CALLBACK_SECRET` | Required in production; append `?token=<secret>` to `MPESA_CALLBACK_URL` |
| `MPESA_CALLBACK_URL` | Public STK callback URL registered in Daraja |
| `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` | Daraja app credentials |
| `MPESA_SHORTCODE` / `MPESA_PASSKEY` | Paybill / till STK credentials |
| `ALLOW_MPESA_MOCK` | `true` to allow mock billing routes in production (dev/staging only) |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Optional; when both set, rate limits use Upstash Redis |

### File storage

| Variable | Notes |
|----------|--------|
| `STORAGE_BACKEND` | `local` (default) or `s3` for S3-compatible object storage (AWS S3, Cloudflare R2, MinIO) |
| `UPLOAD_DIR` | Local upload root when `STORAGE_BACKEND=local` (default: `./uploads`) |
| `S3_BUCKET` | Bucket name (required for `s3`) |
| `S3_REGION` | AWS/R2 region (R2: `auto`) |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Object storage credentials |
| `S3_ENDPOINT` | Custom endpoint for R2/MinIO (e.g. `https://<account>.r2.cloudflarestorage.com`) |
| `S3_FORCE_PATH_STYLE` | `true` for MinIO and some S3-compatible providers |

Authenticated download routes redirect to **5-minute signed URLs** when using S3; local dev streams files from disk.

## Privacy (DSAR)

- `GET /api/me/export` — download a JSON export of your account data (auth required)
- `POST /api/me/erase` — delete your account and stored files; body `{ "confirm": "DELETE MY ACCOUNT" }`. Blocked while you have active bookings.

## Operations

- `GET /api/health` — liveness probe (`database`, `storage` checks). Public for load balancers.
- Application logs are structured JSON lines via `src/lib/logger.ts` (secrets redacted).

Google Cloud OAuth redirect URI: `http://localhost:3000/api/auth/callback/google`

## Verification flow

1. Provider completes onboarding with national ID, license documents, experience, and rates  
2. Application enters **Under review** — hidden from patient search  
3. Admin reviews documents at `/admin` and **Approves** or **Rejects**  
4. Approved providers show a **Janell Health verified** badge and appear on the map  

## Scripts

- `npm run dev` — development server  
- `npm run build` / `npm start` — production  
- `npm run lint` — ESLint  
- `npm run typecheck` — TypeScript (`tsc --noEmit`)  
- `npm run audit` — dependency audit (fails on high+ severity)  
- `npm run test` — Vitest (unit always; integration when `DATABASE_URL` points at Postgres)  
- `npm run test:watch` — Vitest watch mode  
- `npm run ci` — lint, typecheck, build, audit, and tests (when Postgres is up)  
- `npx prisma studio` — browse data  

## CI

GitHub Actions runs on every push/PR to `main`: **lint → typecheck → build → audit → migrate → test**. Run the same gates locally with `npm run ci` (starts Postgres via Docker when available). Dependabot opens weekly npm and Actions update PRs.

**Production readiness progress:** see [`docs/operations/production-readiness.md`](docs/operations/production-readiness.md) (update after each step).

## Production deploy

**Vercel + Neon + Upstash:** [`docs/operations/vercel-neon.md`](docs/operations/vercel-neon.md)

Docker / Railway:

```bash
docker build -t janell-health .
./scripts/smoke-health.sh http://localhost:3000   # after app is running
```

Full checklist, env vars, and release steps: [`docs/operations/deploy.md`](docs/operations/deploy.md). Alerting: [`docs/operations/alerting.md`](docs/operations/alerting.md).

Integration tests use database `carelink_test` (never your dev `carelink` DB). With Docker running: `docker compose up -d`, then `DATABASE_URL=postgresql://carelink:carelink@localhost:5432/carelink_test npm test`.

> **Note:** Prisma’s transitive `deepmerge-ts` dependency is pinned via `overrides` in `package.json` so `npm audit --audit-level=high` stays clean.
