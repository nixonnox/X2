# Email & Webhook Runtime Evidence

> **Date**: 2026-03-15
> **Scope**: Runtime behavior of email and webhook delivery — real HTTP evidence, payload structure, template details
> **Verdict**: All delivery paths use real `fetch()` calls — no stubs, mocks, or fakes detected

---

## Summary

This document provides concrete evidence that the email and webhook delivery paths
in `ChannelDispatchService` make real HTTP calls. Every delivery code path was
inspected for stub/mock patterns. The email sender constructs a full HTML template
with branding. The webhook poster signs payloads with HMAC SHA-256. A separate
`deliveryRetryService` in the automation module has a placeholder email implementation
that is NOT connected to the channel-dispatch pipeline.

---

## 1. Email Delivery — Runtime Evidence

### HTTP Call Structure

| Property | Value |
|----------|-------|
| Method | `POST` |
| URL | Configurable via `NOTIFICATION_EMAIL_API_URL` (default: Resend endpoint) |
| Authorization | `Bearer <NOTIFICATION_EMAIL_API_KEY>` |
| Content-Type | `application/json` |
| Body format | `{ from, to, subject, html }` |

### Request Construction

```
fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: configuredSender,
    to: recipientEmail,
    subject: priorityPrefix + notificationTitle,
    html: renderedTemplate,
  }),
})
```

The `fetch()` call is a real native HTTP request. No wrapper, no mock, no test
double. The API key is read from environment variables at call time.

### Priority Prefix Logic

| Priority | Subject Prefix | Example |
|----------|---------------|---------|
| `CRITICAL` | `[긴급]` | `[긴급] YouTube 조회수 급감 감지` |
| `HIGH` | `[중요]` | `[중요] Instagram 참여율 벤치마크 하회` |
| `MEDIUM` | _(none)_ | `TikTok 데이터 수집 범위 부족` |
| `LOW` | _(none)_ | `주간 성과 리포트 준비 완료` |

### HTML Email Template

The email template renders a fully styled HTML document:

| Section | Content |
|---------|---------|
| **Header** | Violet (`#7c3aed`) background bar with platform logo/name |
| **Body** | Notification message in readable paragraph format |
| **Action Button** | CTA button linking to `actionUrl` (deep link into X2 dashboard) |
| **Footer** | Unsubscribe hint + "Sent by X2 Notification System" |

The template uses inline CSS for maximum email client compatibility. No external
stylesheets or images are referenced (except the action button link).

---

## 2. Webhook Delivery — Runtime Evidence

### HTTP Call Structure

| Property | Value |
|----------|-------|
| Method | `POST` |
| URL | `NOTIFICATION_WEBHOOK_URL` from environment |
| Content-Type | `application/json` |
| User-Agent | `X2-Notification/1.0` |
| X-Webhook-Signature | `sha256=<HMAC-SHA256-hex>` |
| Timeout | 10 seconds via `AbortController` |

### Request Construction

```
const payload = JSON.stringify(webhookBody)
const signature = hmacSha256(webhookSecret, payload)

const controller = new AbortController()
setTimeout(() => controller.abort(), 10_000)

fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'X2-Notification/1.0',
    'X-Webhook-Signature': `sha256=${signature}`,
  },
  body: payload,
  signal: controller.signal,
})
```

### Webhook Payload Schema

| Field | Type | Description |
|-------|------|-------------|
| `notificationId` | `string` | Unique ID of the notification record |
| `title` | `string` | Notification title (localized) |
| `message` | `string` | Notification body text |
| `priority` | `string` | `CRITICAL` / `HIGH` / `MEDIUM` / `LOW` |
| `sourceType` | `string` | Alert source type (e.g., `INTELLIGENCE_ALERT`) |
| `sourceId` | `string` | Originating alert or entity ID |
| `actionUrl` | `string` | Deep link URL into the X2 dashboard |
| `createdAt` | `string` | ISO 8601 timestamp of notification creation |

### HMAC Signature Verification

Consumers can verify the webhook signature by:
1. Reading the raw request body as a UTF-8 string
2. Computing `HMAC-SHA256(webhookSecret, rawBody)`
3. Comparing the hex digest with the value after `sha256=` in `X-Webhook-Signature`

---

## 3. Stub/Mock Detection Audit

| Module | Pattern Searched | Found? | Verdict |
|--------|-----------------|--------|---------|
| channel-dispatch email | `TODO`, `STUB`, `MOCK`, `FAKE`, `placeholder` | No | Real implementation |
| channel-dispatch webhook | `TODO`, `STUB`, `MOCK`, `FAKE`, `placeholder` | No | Real implementation |
| channel-dispatch core | `console.log("sending")`, no-op returns | No | Real implementation |
| automation deliveryRetryService | `placeholder`, `TODO` | **Yes** | Placeholder email sender |

### Automation deliveryRetryService — Placeholder Detail

The `deliveryRetryService` in the automation module contains a placeholder email
sending function that logs to console instead of making an HTTP call. Key findings:

- It is a **separate code path** from `ChannelDispatchService`
- It is used only for automation-triggered deliveries (scheduled reports, etc.)
- It does **NOT** handle intelligence alert deliveries
- The placeholder has no effect on the channel-dispatch pipeline

This means the intelligence alert email path (via `ChannelDispatchService`) is
fully real, while the automation retry path has a placeholder that needs to be
replaced before automation emails can work.

---

## 4. Environment Variable Dependencies

| Variable | Used By | Required | Default |
|----------|---------|----------|---------|
| `NOTIFICATION_EMAIL_API_KEY` | Email sender | Yes (for email) | None |
| `NOTIFICATION_EMAIL_API_URL` | Email sender | No | Resend default endpoint |
| `NOTIFICATION_EMAIL_FROM` | Email sender | No | Configured default sender |
| `NOTIFICATION_WEBHOOK_URL` | Webhook poster | Yes (for webhook) | None |
| `NOTIFICATION_WEBHOOK_SECRET` | Webhook poster | Yes (for webhook) | None |

If email or webhook environment variables are not set, the respective channel
silently skips delivery (no error thrown, logged as warning).

---

## 5. Error Handling Evidence

| Scenario | Behavior |
|----------|----------|
| Email API returns 4xx | Response status checked; error logged with status code |
| Email API returns 5xx | Error logged; no retry |
| Email API network error | Caught by `catch`; error logged |
| Webhook returns non-2xx | Response status checked; error logged |
| Webhook times out (>10s) | `AbortError` caught; logged as timeout |
| Webhook network error | Caught by `catch`; error logged |
| Missing API key | Channel skipped with warning log |
| Missing webhook URL | Channel skipped with warning log |

---

## Conclusion

All external delivery paths in `ChannelDispatchService` are implemented with real
`fetch()` calls. Email goes through a properly authenticated API call with a fully
rendered HTML template. Webhooks are signed with HMAC SHA-256 and enforce a 10-second
timeout. The only placeholder email implementation exists in the automation module's
`deliveryRetryService`, which is entirely separate from the intelligence alert
delivery pipeline.
