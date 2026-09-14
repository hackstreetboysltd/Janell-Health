# Alerting & on-call

Janell Health uses **Sentry** for errors and **structured JSON logs** for request/funnel events. Uptime should be monitored separately on `/api/health`.

---

## Uptime (required)

Monitor `GET /api/health` every **1–5 minutes** from outside your host:

| Provider | What to watch |
|---|---|
| [UptimeRobot](https://uptimerobot.com) | HTTP 200 + body `"status":"ok"` |
| Better Stack / Pingdom | Same |
| Railway health check | Configured in `railway.toml` → `/api/health` |

**Alert when:** status ≠ 200 or `checks.database` ≠ `ok` for **2 consecutive checks**.

After deploy:

```bash
./scripts/smoke-health.sh https://your-domain.com
```

---

## Sentry alerts (recommended)

With `SENTRY_DSN` set in production:

### 1. Error rate

- **Alert:** Issues → spike in `unhandled` or `http.request.error` events  
- **Threshold:** e.g. >10 events in 1 hour (tune after baseline)

### 2. M-Pesa / payment failures

Create a **custom filter** on log messages or issues containing:

- `mpesa.callback.forbidden`
- `booking.funnel.payment_failed`

Notify via email or Slack integration in Sentry.

### 3. Performance (optional)

With `SENTRY_TRACES_SAMPLE_RATE=0.1`, alert on p95 transaction duration > 3s on:

- `/api/bookings`
- `/api/mpesa/callback`

---

## Operational metrics dashboard

Admins can query live ops data (no PII):

```http
GET /api/admin/ops
```

Requires admin session. Returns:

- **`red`** — 15-minute rolling request count, error rate, latency p50/p95 (in-process; per-instance)
- **`funnel`** — booking counts by status + payment outcomes (Postgres)
- **`launch`** — weekly business metrics (same as `/admin` dashboard)

Use this after incidents to see funnel blockage (e.g. many `pendingPayment`, rising `paymentsFailed`).

---

## Log queries (JSON stdout)

Ship container logs to your host drain, then query:

| Goal | Filter |
|---|---|
| Trace one request | `requestId` field (also in response header `x-request-id`) |
| Booking stuck in payment | `"message":"booking.funnel.payment_failed"` |
| New requests | `"message":"booking.funnel.created"` |
| 5xx API paths | `"message":"http.request"` AND `status >= 500` |

---

## Correlation

Every response includes **`x-request-id`**. Pass it to support tickets. Sentry events tag `request_id` on instrumented API routes.

---

## Related

- [Production readiness](./production-readiness.md)
- [Deploy runbook](./deploy.md)
- [Go-live checklist](./go-live-checklist.md)
- [Backups](./backups.md)
- [Uptime monitor template](./uptime-monitors.example.json)
