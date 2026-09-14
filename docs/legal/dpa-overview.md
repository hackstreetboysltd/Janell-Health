# Data Processing Agreement (DPA) overview

**Last updated:** 2026-09-01  
**Status:** Template for production — have qualified counsel review before signing with enterprise partners.

This document summarises how Janell Health processes personal data and what partners (hospitals, employers, subprocessors) should expect. It is **not** a signed contract; use it to align with the [subprocessor register](./subprocessors.md) and in-app [Privacy policy](/legal/privacy).

---

## Roles

| Role | Party | Responsibility |
| --- | --- | --- |
| **Data controller** | Janell Health | Determines purposes and means of processing for marketplace users |
| **Data processor** | Listed subprocessors | Process data on Janell Health's instructions (see register) |
| **Hospital / referral partner** | Institution using referral links | May be independent controller for discharge data shared with patient consent |

---

## Processing purposes

1. User authentication and account management  
2. Matching patients with verified caregivers  
3. Booking, scheduling, and visit coordination  
4. M-Pesa payment initiation and confirmation  
5. Provider verification (identity and licence documents)  
6. Safety: complaints, audit logs, rate limiting  
7. Service improvement and incident response (aggregated metrics; optional Sentry)

**Lawful basis (indicative):** contract performance, legitimate interest (marketplace safety), consent where required (OTP, optional marketing — none today).

---

## Security measures

- TLS in transit; secrets in environment / secret manager  
- Role-based access; admin actions audit-logged  
- Upload magic-byte validation and optional ClamAV scan  
- API rate limits; M-Pesa callback token in production  
- Automated retention purge (OTP, visit notes, dismissed complaints, stale verification docs) — see `src/lib/data-retention.ts`

---

## Data subject rights

Users may request access, correction, or erasure via in-app export/erase APIs and `/support`. Erasure blocked while active bookings exist.

---

## Subprocessors

See [subprocessors.md](./subprocessors.md). Janell Health will:

- Maintain an up-to-date public register  
- Use vendors with appropriate terms / DPAs where available  
- Notify material subprocessor changes via privacy policy updates

---

## International transfers

Some subprocessors (e.g. Sentry, optional Google OAuth, cloud regions outside Kenya) may process data abroad. Use EU/US regions with SCCs or equivalent where required; document the chosen region in deploy runbooks.

---

## Breach notification

Internal: log via Sentry + ops runbook. External: notify affected users and the ODPC (Kenya) as required by the Data Protection Act, 2019, without undue delay.

---

## Enterprise DPA checklist

Before a hospital or insurer signs:

- [ ] Confirm controller/processor roles in writing  
- [ ] Attach current subprocessor register  
- [ ] Define referral data shared at discharge (minimum necessary)  
- [ ] Agree breach notification contacts and timelines  
- [ ] Counsel review for Kenya DPA and sector rules (health data sensitivity)
