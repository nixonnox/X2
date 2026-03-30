# External Delivery Gap List

> **Date**: 2026-03-15
> **Scope**: All identified gaps in external notification delivery (email, webhook)
> **Total Gaps**: 7 (S1: 2, S2: 2, S3: 3)

---

## Severity Definitions

| Badge | Level | Definition |
|-------|-------|------------|
| ![S1](https://img.shields.io/badge/S1-CRITICAL-red) | Critical | Data loss or delivery failure with no recovery path |
| ![S2](https://img.shields.io/badge/S2-HIGH-orange) | High | Significant operational or developer-experience issue |
| ![S3](https://img.shields.io/badge/S3-MODERATE-yellow) | Moderate | Non-blocking but affects quality, UX, or maintainability |

---

## S1 — Critical Gaps

### GAP-S1-01: No Retry Logic in Channel-Dispatch

| Attribute | Value |
|-----------|-------|
| **Severity** | ![S1](https://img.shields.io/badge/S1-CRITICAL-red) |
| **Component** | `ChannelDispatchService` |
| **Impact** | Failed email/webhook deliveries are lost permanently |
| **Current Behavior** | Single `fetch()` attempt; on failure, `console.error` is called and execution continues |
| **Expected Behavior** | At least 3 retry attempts with exponential backoff before marking as permanently failed |
| **Recovery Path** | None — the user must manually re-trigger the alert or never receives the notification externally |

**Detail**: When `fetch()` fails due to network timeout, DNS resolution failure,
or a 5xx server error, the channel-dispatch service catches the error and logs it.
No retry queue, no dead-letter mechanism, and no scheduled re-attempt exists.
The in-app notification is still visible, but the email/webhook delivery is silently
dropped. A separate `deliveryRetryService` exists in the automation module but is
not connected to the intelligence alert dispatch path.

**Recommendation**: Implement a retry queue within `ChannelDispatchService` or
connect the existing `deliveryRetryService` to handle failed intelligence alert
deliveries. Suggested config: 3 attempts, exponential backoff (1s, 5s, 25s),
with a dead-letter log for permanently failed deliveries.

---

### GAP-S1-02: No Persistent Delivery Status

| Attribute | Value |
|-----------|-------|
| **Severity** | ![S1](https://img.shields.io/badge/S1-CRITICAL-red) |
| **Component** | `ChannelDispatchService`, `Notification` model |
| **Impact** | No audit trail for delivery success/failure; impossible to debug or report |
| **Current Behavior** | Delivery outcome stored in local variable during execution; discarded after function returns |
| **Expected Behavior** | Each delivery attempt persisted to a `NotificationDelivery` table with status, timestamp, error |
| **DB Field Gap** | `Notification.emailSentAt` exists in Prisma schema but is never updated by channel-dispatch |

**Detail**: The `Notification` model includes an `emailSentAt` datetime field that
was designed to track when the email was successfully sent. However, the
`ChannelDispatchService` never writes to this field after a successful email
delivery. There is no equivalent field for webhook delivery status. Without
persistent tracking, there is no way to:
- Audit which notifications were delivered externally
- Build a delivery status dashboard
- Identify systematic delivery failures
- Retry failed deliveries from a historical record

**Recommendation**: After successful email delivery, update `emailSentAt` on the
`Notification` record. Add a `NotificationDelivery` join table to track per-channel
delivery attempts with columns: `channel`, `status`, `attemptCount`, `lastError`,
`deliveredAt`.

---

## S2 — High Gaps

### GAP-S2-01: .env.example Missing NOTIFICATION_* Variables

| Attribute | Value |
|-----------|-------|
| **Severity** | ![S2](https://img.shields.io/badge/S2-HIGH-orange) |
| **Component** | Project configuration |
| **Impact** | New deployments will silently skip email/webhook delivery without clear guidance |
| **Current State** | `turbo.json` declares `NOTIFICATION_EMAIL_API_KEY`, `NOTIFICATION_WEBHOOK_URL`, `NOTIFICATION_WEBHOOK_SECRET` in env array |
| **Missing From** | `.env.example` — the standard developer reference for required environment variables |

**Detail**: Developers setting up the project for the first time will not know that
`NOTIFICATION_*` environment variables need to be configured. The variables are
referenced in `turbo.json` for build-time passthrough but are absent from
`.env.example`. When these variables are missing at runtime, the channel-dispatch
service silently skips external delivery with a warning log that may go unnoticed.

**Recommendation**: Add the following to `.env.example`:
```
# External Notification Delivery
NOTIFICATION_EMAIL_API_KEY=       # Resend API key for email delivery
NOTIFICATION_EMAIL_API_URL=       # Optional: custom email API endpoint
NOTIFICATION_WEBHOOK_URL=         # Webhook endpoint for external notifications
NOTIFICATION_WEBHOOK_SECRET=      # HMAC secret for webhook signature
```

---

### GAP-S2-02: emailSentAt Field Never Updated

| Attribute | Value |
|-----------|-------|
| **Severity** | ![S2](https://img.shields.io/badge/S2-HIGH-orange) |
| **Component** | `ChannelDispatchService`, Prisma `Notification` model |
| **Impact** | DB schema has delivery tracking capability that is entirely unused |
| **Current State** | `emailSentAt` field exists in schema, always remains `null` |
| **Expected State** | Set to `new Date()` after successful email `fetch()` response |

**Detail**: The Prisma schema defines `emailSentAt DateTime?` on the `Notification`
model, indicating that delivery tracking was planned. However, the channel-dispatch
email sender does not perform a Prisma update after a successful API call. This
means the field is always `null`, even for notifications that were successfully
emailed. Any future query relying on this field (e.g., "show me all emailed
notifications") will return empty results.

**Recommendation**: After a successful email delivery (2xx response from the API),
call `prisma.notification.update({ where: { id }, data: { emailSentAt: new Date() } })`.
This is a low-effort fix that immediately enables delivery tracking queries.

---

## S3 — Moderate Gaps

### GAP-S3-01: Dispatcher Created Per-Notification

| Attribute | Value |
|-----------|-------|
| **Severity** | ![S3](https://img.shields.io/badge/S3-MODERATE-yellow) |
| **Component** | `ChannelDispatchService` instantiation |
| **Impact** | Minor performance overhead; no connection reuse; harder to add state (e.g., circuit breaker) |
| **Current Behavior** | `new ChannelDispatchService()` called for each notification dispatch |
| **Expected Behavior** | Singleton instance or pooled service for connection reuse and state management |

**Detail**: Each notification dispatch creates a fresh instance of
`ChannelDispatchService`. While this has no correctness impact, it prevents the
service from maintaining state across calls — such as a circuit breaker for
repeatedly failing endpoints, connection pooling, or rate limiting. For the current
volume this is acceptable, but it will become a concern at scale.

**Recommendation**: Refactor to a singleton service instantiated at application
startup. This enables future additions like circuit breaker patterns and connection
pooling without architectural changes.

---

### GAP-S3-02: No Delivery Status in UI

| Attribute | Value |
|-----------|-------|
| **Severity** | ![S3](https://img.shields.io/badge/S3-MODERATE-yellow) |
| **Component** | Notification history page, bell dropdown |
| **Impact** | Users cannot see whether a notification was delivered via email/webhook |
| **Current UI** | Shows notification title, message, timestamp, read/unread status |
| **Missing UI** | Delivery channel badges (e.g., "Sent via EMAIL", "Sent via WEBHOOK") |

**Detail**: The notification history page and bell dropdown display notification
content and read status but provide no indication of which external channels were
used for delivery. Users have no way to confirm whether they should also check their
email or webhook integration for a given notification. This information gap is
especially problematic when debugging delivery issues.

**Recommendation**: Add delivery channel badges to the notification list items.
Requires GAP-S1-02 (persistent delivery status) to be resolved first, as the UI
needs a data source for channel delivery outcomes.

---

### GAP-S3-03: Automation deliveryRetryService Not Connected to Intelligence Alerts

| Attribute | Value |
|-----------|-------|
| **Severity** | ![S3](https://img.shields.io/badge/S3-MODERATE-yellow) |
| **Component** | `deliveryRetryService` (automation module) |
| **Impact** | Retry infrastructure exists but only serves automation flows; intelligence alerts get no retry |
| **Current State** | `deliveryRetryService` handles retries for automation-triggered deliveries only |
| **Gap** | Intelligence alert deliveries (via `ChannelDispatchService`) bypass this service entirely |

**Detail**: The automation module contains a `deliveryRetryService` with retry
queue logic, configurable max attempts, and exponential backoff. However, this
service was built specifically for the automation pipeline and is not integrated
with `ChannelDispatchService`. Additionally, the automation service's email sender
is a placeholder (logs to console), while the channel-dispatch email sender is the
real implementation. Unifying these two paths would eliminate code duplication and
provide retry coverage for intelligence alerts.

**Recommendation**: Either extend `deliveryRetryService` to accept intelligence
alert deliveries, or extract the retry logic into a shared utility that both
the automation and intelligence alert paths can use. Ensure the real email sender
from channel-dispatch replaces the placeholder in the automation module.

---

## Gap Summary Table

| ID | Severity | Component | One-Line Description | Effort |
|----|----------|-----------|---------------------|--------|
| GAP-S1-01 | ![S1](https://img.shields.io/badge/S1-CRITICAL-red) | channel-dispatch | No retry on failed delivery | Medium |
| GAP-S1-02 | ![S1](https://img.shields.io/badge/S1-CRITICAL-red) | channel-dispatch + DB | No persistent delivery status | Medium |
| GAP-S2-01 | ![S2](https://img.shields.io/badge/S2-HIGH-orange) | .env.example | Missing NOTIFICATION_* env vars | Low |
| GAP-S2-02 | ![S2](https://img.shields.io/badge/S2-HIGH-orange) | channel-dispatch | emailSentAt field never written | Low |
| GAP-S3-01 | ![S3](https://img.shields.io/badge/S3-MODERATE-yellow) | channel-dispatch | Per-notification instantiation | Low |
| GAP-S3-02 | ![S3](https://img.shields.io/badge/S3-MODERATE-yellow) | UI | No delivery status badges | Medium |
| GAP-S3-03 | ![S3](https://img.shields.io/badge/S3-MODERATE-yellow) | automation | deliveryRetryService disconnected | Low |

---

## Next Steps

1. **Immediate** (S1): Implement retry queue and persistent delivery tracking
2. **Short-term** (S2): Update `.env.example` and wire `emailSentAt` updates
3. **Medium-term** (S3): Unify retry services, add UI badges, refactor to singleton
