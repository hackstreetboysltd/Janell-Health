# Carelink KE

Mobile-first Next.js app connecting patients in Nairobi with caregivers, nurses, and doctors for home visits.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Auth.js Google sign-in (`prompt=select_account`); local email continue when Google keys are unset
- Prisma + PostgreSQL
- Leaflet map (region-based pins)
- TipTap rich text
- M-Pesa STK Push (Daraja) with `MPESA_MOCK=true` for local success flow
- 10% platform commission on confirmed bookings

## Quick start

```bash
# Start Postgres
docker compose up -d

# Install & migrate
npm install
npx prisma migrate dev --name init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. Choose **Patient** or **Healthcare giver** portal  
2. Continue with Google (or enter email if OAuth keys are empty)  
3. Complete onboarding  
4. Patient: create a case → map → book → M-Pesa (mock) → both see phone numbers  

## Environment

Copy `.env.example` to `.env`. Important vars:

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Postgres connection |
| `AUTH_SECRET` | Random secret |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth web client; omit for local email continue |
| `MPESA_MOCK` | `true` for local PIN simulation |
| `MPESA_*` | Daraja sandbox credentials when mock is off |

Google Cloud OAuth redirect URI: `http://localhost:3000/api/auth/callback/google`

## Scripts

- `npm run dev` — development server  
- `npm run build` / `npm start` — production  
- `npx prisma studio` — browse data  
