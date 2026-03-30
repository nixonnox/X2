# Delivery Retry and Status Runtime Notes

## Overview

This document describes the current runtime behavior of the notification delivery
pipeline with respect to retries, deduplication, failure handling, and known gaps.
The delivery subsystem is implemented across two files:

- `packages/api/src/services/notification/channel-dispatch.service.ts`
- `packages/api/src/services/intelligence/intelligence-alert.service.ts`

---

## Current Retry Policy: None

The dispatch service operates in a **fire-and-forget** model. Each channel gets
exactly one delivery attempt. If that attempt fails (network error, timeout, API
error), the result is logged to `console.error` and stored in the in-memory
delivery log. No retry is scheduled.

```
dispatch(channels: ["EMAIL", "WEBHOOK"])
  EMAIL  -> attempt once -> SUCCESS or FAILED (logged)
  WEBHOOK -> attempt once -> SUCCESS or FAILED (logged)
  // No retry queue, no backoff, no second attempt
```

This is a deliberate simplification for the current phase. The `retryCount` field
exists in the `DeliveryResult` type but is never populated.

---

## Deduplication

Deduplication is handled at the **alert level**, not at the delivery level.
The `IntelligenceAlertService` enforces per-alert-type cooldowns using the
`sourceId` field stored in the notification table.

### Cooldown Periods

| Alert Type              | Cooldown   | Rationale                                    |
|-------------------------|------------|----------------------------------------------|
| `WARNING_SPIKE`         | 1 hour     | Warnings can fluctuate; avoid noise          |
| `LOW_CONFIDENCE`        | 24 hours   | Confidence changes slowly                    |
| `BENCHMARK_DECLINE`     | 24 hours   | Benchmark scores update infrequently         |
| `PROVIDER_COVERAGE_LOW` | 6 hours    | Provider reconnection may take time          |

### Cooldown Mechanism

Before creating a notification, the alert service checks:

```ts
const cooldownStart = new Date(Date.now() - cooldownMs);
const recent = await prisma.notification.findFirst({
  where: {
    sourceType: "intelligence_alert",
    sourceId,                          // "{projectId}:{alertType}:{keyword}"
    createdAt: { gte: cooldownStart },
  },
  orderBy: { createdAt: "desc" },
});
// If recent exists -> skip this alert entirely
```

The `sourceId` format is `{projectId}:{alertType}:{seedKeyword}`, which ensures:
- Cross-project isolation (different projects can alert independently).
- Per-keyword granularity (different keywords have independent cooldowns).
- Per-type separation (a WARNING_SPIKE cooldown does not block LOW_CONFIDENCE).

If a notification with the same `sourceId` exists within the cooldown window,
the entire alert is skipped -- no DB row is created and no external dispatch runs.

---

## Failure Logging

### Per-Channel Failure (inside dispatch)

When a channel delivery fails, the error is logged with channel and context:

```
[ChannelDispatch] EMAIL delivery failed: Email API error 403: ...
[ChannelDispatch] WEBHOOK delivery failed: Webhook timeout (10s)
```

### Per-Alert Failure (inside alert service)

After dispatch completes, the caller iterates results and logs failures:

```
[IntelligenceAlert] EMAIL delivery failed for WARNING_SPIKE: ...
[IntelligenceAlert] WEBHOOK delivery failed for BENCHMARK_DECLINE: ...
```

### Dispatch-Level Failure

If the entire dispatch promise rejects (unexpected), the `.catch()` handler logs:

```
[IntelligenceAlert] Channel dispatch error: ...
```

All logging goes to `console.error`. There is no structured log sink, no log
aggregation, and no alerting on delivery failures.

---

## In-Memory Delivery Log

`NotificationChannelDispatchService` maintains an internal `deliveryLog` array.
Every `DeliveryResult` from every channel is appended to this array.

```ts
getRecentDeliveryLog(limit = 20): DeliveryResult[]
```

Returns the last `limit` entries (default 20) from the array. Since the dispatcher
is typically instantiated per-notification, each instance's log is short-lived.
The log is not persisted to disk or database.

### Current Utility

- Useful in development for inspecting what happened after a dispatch.
- Useful in tests where a single instance processes multiple dispatches.
- Not useful in production since instances are created and discarded per-alert.

---

## Integration: Alert Service to Dispatcher

The call chain from analysis to delivery:

```
IntelligenceAlertService.evaluateAndAlert(params)
  -> evaluateConditions(currentResult, previousRun, keyword)
     returns AlertConditionResult[] (0..N conditions met)
  -> for each condition:
       -> isWithinCooldown(sourceId, cooldownMs)
          skips if recent notification exists
       -> createAlertNotification(...)
            -> prisma.notification.create(...)         // IN_APP: synchronous
            -> new NotificationChannelDispatchService()
            -> dispatcher.getChannelStatus()
            -> filter external channels (EMAIL, WEBHOOK)
            -> user email lookup (for EMAIL)
            -> dispatcher.dispatch(externalChannels)
                 .then(logFailures)                    // non-blocking
                 .catch(logError)                      // non-blocking
```

### Non-Blocking Pattern

External dispatch is explicitly non-blocking. The `dispatch()` call returns a
Promise, but it is chained with `.then()/.catch()` instead of being `await`ed:

```ts
dispatcher
  .dispatch({ ... })
  .then((results) => {
    for (const r of results) {
      if (r.status === "FAILED") {
        console.error(`[IntelligenceAlert] ${r.channel} delivery failed ...`);
      }
    }
  })
  .catch((err) => {
    console.error("[IntelligenceAlert] Channel dispatch error:", err);
  });
```

This means:
- `createAlertNotification` returns the notification ID immediately after the DB save.
- External delivery happens asynchronously in the background.
- The caller (`evaluateAndAlert`) does not know whether external delivery succeeded.
- If the Node.js process exits before delivery completes, in-flight deliveries are lost.

---

## Channel Detection at Notification Creation

Before dispatching, the alert service checks which external channels are available:

```ts
const channels: DeliveryChannel[] = ["IN_APP"];
const dispatcher = new NotificationChannelDispatchService();
const channelStatus = dispatcher.getChannelStatus();
if (channelStatus.WEBHOOK.enabled) channels.push("WEBHOOK");
if (channelStatus.EMAIL.enabled) channels.push("EMAIL");
```

The `channels` array is also saved to the notification DB row, recording which
channels were targeted (not necessarily successfully delivered to).

---

## Known Gaps

### 1. No Persistent Delivery Log Table

Delivery results exist only in memory and console logs. There is no
`notification_delivery` or `delivery_log` table to track which channels
succeeded or failed for each notification.

**Impact**: Cannot query delivery history, cannot build a delivery status UI,
cannot identify systematic delivery failures.

### 2. No Retry Queue

Failed deliveries are not retried. A transient network issue or a temporary
email API outage results in a permanently missed delivery.

**Impact**: External channel reliability depends entirely on the first attempt
succeeding.

### 3. No Delivery Status in UI

The notification UI shows notifications (IN_APP) but has no visibility into
whether EMAIL or WEBHOOK delivery succeeded. The `channels` field on the
notification record indicates intended channels, not actual delivery outcomes.

**Impact**: Users and administrators cannot verify external delivery status.

### 4. No Dead Letter Queue

Failed deliveries are not collected for later inspection or manual retry.
Once logged to console, the failure information is effectively lost.

### 5. Process Exit Risk

Because external dispatch is non-blocking (`.then()`), if the process
terminates (crash, deploy, restart) while a delivery is in-flight, that
delivery silently fails with no record.

### 6. Per-Notification Instantiation Overhead

A new `NotificationChannelDispatchService` is created for each notification.
This re-reads env vars and creates a fresh delivery log each time. A singleton
pattern would allow the delivery log to accumulate across notifications and
reduce object allocation.

---

## Future Considerations

- **Retry with exponential backoff**: 3 attempts with 1s/5s/30s delays.
- **Delivery log table**: Persist each `DeliveryResult` with foreign key to notification.
- **Webhook retry with idempotency key**: Include notification ID in payload for dedup.
- **Circuit breaker**: Track consecutive failures per channel and temporarily disable.
- **Delivery status API**: Expose delivery results to the admin UI.
- **Queue-based dispatch**: Move external delivery to a background job queue (BullMQ)
  to survive process restarts and enable reliable retry.
