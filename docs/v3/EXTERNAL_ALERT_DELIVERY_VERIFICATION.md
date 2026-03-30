# External Alert Delivery Verification

> **Date**: 2026-03-15
> **Scope**: Channel dispatch service, email/webhook delivery, integration with intelligence alerts
> **Verdict**: 7 PASS / 3 FAIL — delivery works end-to-end but lacks retry and persistent tracking

---

## Summary

The external alert delivery pipeline dispatches notifications through three channels
(in-app, email, webhook) via `ChannelDispatchService`. Real HTTP calls are made to
Resend (email) and arbitrary webhook endpoints. Integration with the intelligence
alert system is non-blocking. Critical gaps exist around retry logic, delivery status
persistence, and environment variable documentation.

---

## Verification Checklist

| # | Check | Result | Severity | Details |
|---|-------|--------|----------|---------|
| 1 | Channel Dispatch Service | ![PASS](https://img.shields.io/badge/PASS-green) | — | Fully implemented with 3 channels: `IN_APP`, `EMAIL`, `WEBHOOK` |
| 2 | Email Delivery | ![PASS](https://img.shields.io/badge/PASS-green) | — | Real `fetch()` to Resend API, HTML template with violet header, priority labels |
| 3 | Webhook Delivery | ![PASS](https://img.shields.io/badge/PASS-green) | — | Real HTTP POST, HMAC SHA-256 signature, 10 s AbortController timeout |
| 4 | Intelligence Alert Integration | ![PASS](https://img.shields.io/badge/PASS-green) | — | Non-blocking `.then()`, email lookup by userId, channel auto-detection |
| 5 | Retry Logic | ![FAIL](https://img.shields.io/badge/FAIL-red) | **S1** | Fire-and-forget — no retry in `channel-dispatch` on failure |
| 6 | Deduplication & Cooldown | ![PASS](https://img.shields.io/badge/PASS-green) | — | Alert-level cooldown blocks creation before dispatch ever runs |
| 7 | Delivery Status Tracking | ![FAIL](https://img.shields.io/badge/FAIL-red) | **S1** | In-memory only; no persistent DB record of delivery outcome |
| 8 | Failure Logging | ![PASS](https://img.shields.io/badge/PASS-green) | — | `console.error` with channel type + notification context on catch |
| 9 | Stub/Mock Detection | ![PASS](https://img.shields.io/badge/PASS-green) | — | All delivery paths use real `fetch()` calls, no stubs detected |
| 10 | Environment Variables | ![FAIL](https://img.shields.io/badge/FAIL-red) | **S2** | `turbo.json` declares vars; `.env.example` does not list `NOTIFICATION_*` keys |

---

## Detailed Findings

### 1. Channel Dispatch Service — PASS

The `ChannelDispatchService` accepts a notification object and iterates over the
user's enabled channels. Three channel types are supported:

- **IN_APP** — no-op (notification already persisted by the caller)
- **EMAIL** — delegates to email sender with HTML template
- **WEBHOOK** — delegates to webhook poster with HMAC signature

The service is instantiated per notification dispatch call, not as a singleton.

### 2. Email Delivery — PASS

Email is sent via `fetch()` to a configurable API URL (defaults to Resend endpoint).
The request includes `Authorization: Bearer <API_KEY>`, JSON body with `from`, `to`,
`subject`, and `html` fields. The HTML template renders a violet branded header,
message body, action button, and footer. Priority prefixes `[긴급]` / `[중요]` are
prepended to the subject line based on notification priority.

### 3. Webhook Delivery — PASS

Webhook delivery posts JSON to `NOTIFICATION_WEBHOOK_URL`. Headers include:
- `Content-Type: application/json`
- `User-Agent: X2-Notification/1.0`
- `X-Webhook-Signature: sha256=<HMAC>`

An `AbortController` enforces a 10-second timeout. The HMAC is computed over the
raw JSON payload using the configured webhook secret.

### 4. Intelligence Alert Integration — PASS

When the intelligence engine generates an alert, it calls the dispatch service via
a non-blocking `.then()` chain. The caller looks up the user's email by `userId`,
detects enabled channels from user preferences, and passes the assembled notification
to `ChannelDispatchService`. Errors in delivery do not block the alert creation flow.

### 5. Retry Logic — FAIL

No retry mechanism exists in `channel-dispatch`. If `fetch()` fails (network error,
5xx, timeout), the error is caught and logged, but the notification is never retried.
A separate `deliveryRetryService` exists in the automation module, but it is **not**
connected to the intelligence alert dispatch path.

### 6. Deduplication & Cooldown — PASS

Deduplication is handled at the alert creation level, not at the dispatch level. Each
alert type has a cooldown window keyed by `sourceId + projectId`. If a duplicate is
detected within the cooldown, the alert is simply not created — and therefore never
dispatched. This effectively prevents duplicate external deliveries.

### 7. Delivery Status Tracking — FAIL

The dispatch service tracks success/failure in local variables during execution.
No persistent record is written to the database. The `Notification` model has an
`emailSentAt` field, but it is never updated by the channel dispatch flow.

### 8. Failure Logging — PASS

Each channel's catch block calls `console.error` with structured context including
the channel type, notification ID, and error message. This is sufficient for
debugging in development but not adequate for production alerting.

### 9. Stub/Mock Detection — PASS

All email and webhook code paths use the native `fetch()` API. No placeholder
strings like `TODO`, `STUB`, or `MOCK` were found in the delivery modules.

### 10. Environment Variables — FAIL

`turbo.json` correctly declares `NOTIFICATION_EMAIL_API_KEY`,
`NOTIFICATION_WEBHOOK_URL`, and `NOTIFICATION_WEBHOOK_SECRET` in its `env` array.
However, `.env.example` does not include these keys, making production configuration
undocumented for new deployments.

---

## Risk Matrix

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Lost email/webhook on transient failure | High | Medium | Add retry queue to channel-dispatch |
| No delivery audit trail | Medium | High | Persist delivery status to DB |
| Missing env vars in production | Medium | Low | Add keys to `.env.example` |

---

## Conclusion

The external delivery pipeline is functionally complete — real HTTP calls are made to
both email and webhook endpoints with proper authentication and signing. The primary
risk is **reliability**: a single failed attempt results in permanent loss of that
delivery with no retry and no persistent record. Addressing the three FAIL items
should be prioritized before production launch.
