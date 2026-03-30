# Notification External Delivery Architecture

## Overview

The external delivery subsystem extends the notification pipeline beyond in-app storage
by dispatching copies of each notification to configured external channels (EMAIL, WEBHOOK).
The central component is `NotificationChannelDispatchService`, located at
`packages/api/src/services/notification/channel-dispatch.service.ts`.

This service is instantiated per-notification by `IntelligenceAlertService` and operates
in a fire-and-forget pattern: the caller does not await the external dispatch result.

---

## Supported Channels

| Channel  | Trigger Condition                       | Delivery Mechanism        |
|----------|-----------------------------------------|---------------------------|
| IN_APP   | Always enabled                          | Already persisted to DB   |
| EMAIL    | `NOTIFICATION_EMAIL_API_KEY` is set     | Transactional email API   |
| WEBHOOK  | `NOTIFICATION_WEBHOOK_URL` is set       | HTTP POST to target URL   |

IN_APP is not "dispatched" by this service; the DB row created during notification
creation constitutes the in-app delivery. The dispatcher only handles EMAIL and WEBHOOK.

---

## Architecture Flow

```
intelligence-alert.service.ts
  |
  +-- evaluateAndAlert()
        |
        +-- createAlertNotification()
              |
              +-- prisma.notification.create()        <-- IN_APP (DB save)
              |
              +-- dispatcher.getChannelStatus()       <-- check which externals are on
              |
              +-- dispatcher.dispatch(externalChannels)
                    .then(logFailures)                 <-- non-blocking via .then()
                    .catch(logError)
```

Key architectural decisions:

1. **Non-blocking dispatch**: The `.then()/.catch()` pattern ensures the caller
   (`createAlertNotification`) returns immediately after the DB save. External delivery
   latency does not affect the notification creation response.

2. **Independent channel execution**: Inside `dispatch()`, each channel is processed
   sequentially in a `for` loop, but failures are caught per-channel. A failed EMAIL
   does not prevent WEBHOOK from executing.

3. **Per-notification instantiation**: A fresh `NotificationChannelDispatchService`
   is created each time `createAlertNotification` runs, which re-reads env vars.

---

## Environment Variables

| Variable                       | Purpose                            | Default                           |
|--------------------------------|------------------------------------|-----------------------------------|
| `NOTIFICATION_EMAIL_API_KEY`   | API key for email provider         | _(none, disables EMAIL channel)_  |
| `NOTIFICATION_EMAIL_API_URL`   | Email API endpoint                 | `https://api.resend.com/emails`   |
| `NOTIFICATION_EMAIL_FROM`      | Sender address                     | `notifications@x2.app`           |
| `NOTIFICATION_WEBHOOK_URL`     | Target URL for webhook POST        | _(none, disables WEBHOOK)_        |
| `NOTIFICATION_WEBHOOK_SECRET`  | HMAC signing key for webhooks      | _(none, signature header omitted)_|

Configuration is loaded via `loadChannelConfig()` which reads `process.env` at
construction time. An optional partial config can be passed to the constructor to
override individual fields (useful for testing).

---

## Core Types

### DeliveryChannel
```ts
type DeliveryChannel = "IN_APP" | "EMAIL" | "WEBHOOK";
```

### DeliveryStatus
```ts
type DeliveryStatus =
  | "SUCCESS"
  | "FAILED"
  | "SKIPPED"
  | "QUEUED"
  | "DEDUPLICATED"
  | "PROVIDER_UNAVAILABLE";
```

- **SUCCESS**: Delivery confirmed (HTTP 2xx for email/webhook).
- **FAILED**: Delivery attempted but errored (network, timeout, non-2xx).
- **SKIPPED**: Channel was requested but precondition not met (e.g., no recipient email).
- **PROVIDER_UNAVAILABLE**: Required env var missing; channel cannot operate.
- **QUEUED / DEDUPLICATED**: Reserved for future use; not currently emitted.

### DeliveryResult
```ts
type DeliveryResult = {
  channel: DeliveryChannel;
  status: DeliveryStatus;
  error?: string;
  deliveredAt?: string;   // ISO-8601, set on SUCCESS
  retryCount?: number;    // Reserved, always undefined currently
};
```

---

## Service API

### `dispatch(input: DispatchInput): Promise<DeliveryResult[]>`

Iterates over `input.channels`, calling the appropriate delivery method for each.
Returns an array of results, one per channel. Exceptions within a single channel
are caught and converted to a `FAILED` result.

### `getChannelStatus(): Record<DeliveryChannel, { enabled, configured }>`

Returns current availability of each channel based on loaded config:
- `IN_APP`: always `{ enabled: true, configured: true }`
- `EMAIL`: enabled if `emailApiKey` is truthy
- `WEBHOOK`: enabled if `webhookUrl` is truthy

Called by `IntelligenceAlertService.createAlertNotification` to decide which external
channels to include in the dispatch call.

### `getRecentDeliveryLog(limit?: number): DeliveryResult[]`

Returns the last N delivery results from the in-memory log (default 20).
Useful for debugging; the log is not persisted and resets when the service
instance is garbage-collected.

---

## DispatchInput Shape

```ts
type DispatchInput = {
  notificationId: string;
  userId: string;
  channels: DeliveryChannel[];
  title: string;
  message: string;
  priority: string;           // "URGENT" | "HIGH" | "NORMAL" | "LOW"
  actionUrl?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  recipientEmail?: string;    // Required for EMAIL channel
  webhookUrl?: string;        // Override for WEBHOOK target
};
```

The `recipientEmail` is resolved by the alert service via a `prisma.user.findUnique`
lookup before dispatch. If the lookup fails or the user has no email, the EMAIL
channel returns `SKIPPED`.

---

## In-Memory Delivery Log

Every `DeliveryResult` produced by `dispatch()` is appended to an internal array.
`getRecentDeliveryLog()` returns the tail of this array (last 20 entries by default).

Since the dispatcher is instantiated per-notification, each instance's log contains
at most the results of a single dispatch call. The log is primarily useful when a
long-lived instance is reused (e.g., in tests or a future singleton pattern).

---

## Error Isolation

Each channel is wrapped in a try/catch inside `dispatch()`. The outer loop always
continues to the next channel regardless of prior failures. Additionally, the caller
wraps the entire dispatch promise in `.catch()` so that even an unexpected throw in
the dispatch loop does not propagate to the notification creation flow.

```
dispatch()
  for channel in channels:
    try { deliverToChannel(channel, input) }
    catch { push FAILED result, console.error, continue }
```

This two-layer isolation (per-channel catch + caller-level catch) ensures that
external delivery issues never compromise the core notification creation path.
