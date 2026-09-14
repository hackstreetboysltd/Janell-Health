# Subprocessor register

**Controller:** Janell Health (operated by the entity named in Terms of Service)  
**Last updated:** 2026-09-01  
**Purpose:** Transparency for patients, caregivers, and partners under the Kenya Data Protection Act, 2019.

Janell Health uses the following subprocessors to run the platform. Each receives only the personal data needed for its function. Contracts or standard terms requiring appropriate safeguards should be in place before production go-live.

| Subprocessor | Service | Data processed | Location | Notes |
| --- | --- | --- | --- | --- |
| **Safaricom (M-Pesa Daraja)** | STK push, payment callbacks | Phone number, payment amount, transaction references | Kenya | No card data stored |
| **Africa's Talking** | SMS OTP delivery | Phone number, OTP message content | Kenya / EU (verify AT DPA) | Stub mode when `SMS_ENABLED=false` |
| **Google** *(optional)* | OAuth sign-in | Name, email, profile image | US / global | Only when `AUTH_GOOGLE_ID` configured |
| **Sentry** *(optional)* | Error monitoring | IP (scrubbed), request path, user id (hashed tags), stack traces | US / EU (project region) | PII scrubbed in `src/lib/sentry-options.ts`; off when `SENTRY_DSN` unset |
| **Cloud object storage** | Case attachments, provider documents | Files uploaded by users, metadata | Configurable (`S3_*` / Cloudflare R2) | Local `./uploads` in dev |
| **PostgreSQL host** | Primary database | All account, booking, and profile data | Set at deploy (e.g. Railway EU/US) | Managed Postgres recommended |
| **Photon (Komoot)** | Address geocoding | Search query text | EU | Open geocoding API |
| **OpenStreetMap / Nominatim** | Geocoding fallback, map tiles | Search query, map tile requests | Global / community | [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/) |
| **Hosting provider** | App runtime, TLS | HTTP logs, session cookies | Set at deploy | Railway, VPS, or equivalent |

## Data not sent to subprocessors by default

- Full medical records or clinical diagnoses beyond the care summary entered by the patient
- National ID document images (stored in configured object storage only, not sent to maps/SMS/Sentry content)

## Changes

When adding or replacing a subprocessor, update this register, the public page at `/legal/subprocessors`, and notify users if the change is material (privacy policy revision).

## Related

- [DPA overview](./dpa-overview.md)
- [Privacy policy](/legal/privacy) (in-app)
