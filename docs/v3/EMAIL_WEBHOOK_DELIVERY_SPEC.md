# Email and Webhook Delivery Specification

## Overview

This document specifies the delivery mechanics for the two external notification
channels: EMAIL and WEBHOOK. Both are implemented as private methods within
`NotificationChannelDispatchService` at
`packages/api/src/services/notification/channel-dispatch.service.ts`.

---

## EMAIL Delivery

### Provider

The default email provider is Resend (`https://api.resend.com/emails`).
The provider can be changed by setting `NOTIFICATION_EMAIL_API_URL` to any
API-compatible transactional email endpoint.

Authentication uses Bearer token via the `Authorization` header, with the
token sourced from `NOTIFICATION_EMAIL_API_KEY`.

### Preconditions

| Condition                              | Outcome if not met          |
|----------------------------------------|-----------------------------|
| `NOTIFICATION_EMAIL_API_KEY` is set    | `PROVIDER_UNAVAILABLE`      |
| `recipientEmail` present in input      | `SKIPPED`                   |

The recipient email is resolved by the caller (`IntelligenceAlertService`)
via `prisma.user.findUnique({ where: { id: userId }, select: { email: true } })`.
If the user record has no email or the lookup throws, `recipientEmail` is undefined
and the channel is skipped.

### Priority Prefix

The subject line is prefixed based on notification priority:

| Priority | Prefix     | Example Subject                                  |
|----------|------------|--------------------------------------------------|
| URGENT   | `[긴급] `  | `[긴급] Intelligence Alert: WARNING_SPIKE`        |
| HIGH     | `[중요] `  | `[중요] Intelligence Alert: BENCHMARK_DECLINE`    |
| NORMAL   | _(none)_   | `Intelligence Alert: LOW_CONFIDENCE`              |
| LOW      | _(none)_   | `Intelligence Alert: PROVIDER_COVERAGE_LOW`       |

### HTML Template Structure

The email body is an inline-styled HTML template with the following layout:

```
+-----------------------------------------------+
| Violet header (#7c3aed)                       |
|   [priority prefix] + title (white, 16px)     |
+-----------------------------------------------+
| Message body                                  |
|   (gray #374151, 14px, 1.6 line-height)       |
|                                               |
|   [ 상세 보기 ]  (violet button, if actionUrl) |
|                                               |
|   ─────────────────────────────────           |
|   Footer: auto-send notice (gray #9ca3af)     |
+-----------------------------------------------+
```

- Max width: 560px, centered.
- Font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.
- Action button: Only rendered when `actionUrl` is provided. Links to the
  intelligence detail page (e.g., `/intelligence?keyword=...`).
- Footer text: "이 알림은 X2 Intelligence에서 자동으로 발송되었습니다."

### API Request

```
POST {NOTIFICATION_EMAIL_API_URL}
Content-Type: application/json
Authorization: Bearer {NOTIFICATION_EMAIL_API_KEY}

{
  "from": "{NOTIFICATION_EMAIL_FROM}",
  "to": ["{recipientEmail}"],
  "subject": "{priorityPrefix}{title}",
  "html": "{htmlBody}"
}
```

Default `from` address: `notifications@x2.app`.

### Error Handling

| Scenario              | DeliveryStatus         | Error Message                              |
|-----------------------|------------------------|--------------------------------------------|
| API returns non-2xx   | `FAILED`               | `Email API error {status}: {body[0:200]}`  |
| Network/fetch error   | `FAILED`               | `Email delivery failed: {error.message}`   |
| No API key            | `PROVIDER_UNAVAILABLE` | Korean message about missing env var       |
| No recipient email    | `SKIPPED`              | Korean message about missing recipient     |
| API returns 2xx       | `SUCCESS`              | _(none)_                                   |

On non-2xx responses, the response body is read (up to 200 chars) for diagnostics.
The `.text()` call is wrapped in `.catch(() => "")` to handle unreadable bodies.

---

## WEBHOOK Delivery

### Mechanism

HTTP POST to the configured webhook URL. The URL is resolved in order:
1. `input.webhookUrl` (per-notification override)
2. `this.config.webhookUrl` (from `NOTIFICATION_WEBHOOK_URL` env var)

If neither is available, the channel returns `PROVIDER_UNAVAILABLE`.

### Payload Schema

```json
{
  "event": "notification",
  "timestamp": "2026-03-15T10:30:00.000Z",
  "notification": {
    "id": "a1b2c3d4e5f6...",
    "title": "Intelligence Alert: WARNING_SPIKE",
    "message": "'키워드' 분석에서 경고가 5개로 증가했습니다",
    "priority": "HIGH",
    "sourceType": "intelligence_alert",
    "sourceId": "proj123:WARNING_SPIKE:키워드",
    "actionUrl": "/intelligence?keyword=%ED%82%A4%EC%9B%8C%EB%93%9C"
  }
}
```

- `event` is always `"notification"`.
- `timestamp` is ISO-8601 at time of dispatch.
- `notification.id` matches the DB notification ID (24-char hex from `randomBytes(12)`).

### Request Headers

| Header                | Value                              | Condition              |
|-----------------------|------------------------------------|------------------------|
| `Content-Type`        | `application/json`                 | Always                 |
| `User-Agent`          | `X2-Notification/1.0`             | Always                 |
| `X-Webhook-Signature` | `sha256={hmac_hex}`               | If webhook secret set  |

### HMAC Signature

When `NOTIFICATION_WEBHOOK_SECRET` is configured, the service computes an
HMAC-SHA256 signature over the JSON-serialized payload:

```ts
const signature = crypto
  .createHmac("sha256", webhookSecret)
  .update(JSON.stringify(payload))
  .digest("hex");
// Header value: "sha256={signature}"
```

The `crypto` module is dynamically imported (`await import("crypto")`).

Receiving servers should:
1. Read the raw request body.
2. Compute `HMAC-SHA256(secret, rawBody)`.
3. Compare with the value after the `sha256=` prefix.

If no secret is configured, the `X-Webhook-Signature` header is omitted entirely.

### Timeout

A 10-second timeout is enforced via `AbortController`:

```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);
// ...fetch with signal: controller.signal
clearTimeout(timeout);
```

If the target server does not respond within 10 seconds, the fetch is aborted
and the delivery result is `FAILED` with error `"Webhook timeout (10s)"`.

### Error Handling

| Scenario               | DeliveryStatus         | Error Message                            |
|------------------------|------------------------|------------------------------------------|
| HTTP non-2xx response  | `FAILED`               | `Webhook HTTP {status}`                  |
| Timeout (10s)          | `FAILED`               | `Webhook timeout (10s)`                  |
| Network/fetch error    | `FAILED`               | `Webhook failed: {error.message}`        |
| No webhook URL         | `PROVIDER_UNAVAILABLE` | Korean message about missing env var     |
| HTTP 2xx response      | `SUCCESS`              | _(none)_                                 |

Timeout detection: the error message is checked for the substring `"abort"`.
If found, the timeout-specific message is used; otherwise, the raw error message
is wrapped in the generic failure format.

---

## Shared Behavior

### Delivery Result Recording

Both channels produce a `DeliveryResult` that is:
1. Returned in the `dispatch()` result array.
2. Pushed to the in-memory `deliveryLog` array.
3. Logged to `console.error` by the caller if `status === "FAILED"`.

### No Retry

Neither channel implements retry logic. Each delivery is a single attempt.
If it fails, the failure is recorded and logged but not retried. See
`DELIVERY_RETRY_AND_STATUS_RUNTIME_NOTES.md` for details on this gap.

### Channel Independence

EMAIL and WEBHOOK execute within the same `for` loop but are independently
try/caught. A crash in EMAIL delivery does not prevent WEBHOOK from executing,
and vice versa. The dispatch loop always completes all requested channels.
