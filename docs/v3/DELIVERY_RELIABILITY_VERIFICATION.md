# Delivery Reliability Verification

> **Date**: 2026-03-15
> **Scope**: Retry logic, deduplication, cooldown enforcement, failure impact analysis
> **Verdict**: Deduplication and cooldown are solid; retry is absent for alert-driven delivery

---

## Summary

This report evaluates the reliability guarantees of the external notification delivery
pipeline. Deduplication and cooldown mechanisms prevent duplicate alerts effectively.
However, the channel-dispatch path has no retry logic — a single failed HTTP call
means the delivery is permanently lost. A separate `deliveryRetryService` exists in
the automation module but is not connected to intelligence alert dispatching.

---

## 1. Retry Logic Assessment

| Aspect | Status | Details |
|--------|--------|---------|
| Retry in channel-dispatch | ![NOT IMPLEMENTED](https://img.shields.io/badge/NOT_IMPLEMENTED-red) | Fire-and-forget; `fetch()` failure caught and logged only |
| deliveryRetryService | ![EXISTS](https://img.shields.io/badge/EXISTS-yellow) | Separate service in automation module; handles automation-triggered deliveries only |
| Connection to intelligence alerts | ![DISCONNECTED](https://img.shields.io/badge/DISCONNECTED-red) | `deliveryRetryService` is **not** wired to `ChannelDispatchService` |
| Max retry attempts | N/A | No retry config exists for channel-dispatch |
| Backoff strategy | N/A | Not applicable — no retry mechanism |

### Impact

When `ChannelDispatchService` fires an email or webhook and the call fails (network
timeout, 5xx response, DNS failure), the following happens:

1. The `catch` block logs the error via `console.error`
2. No retry is enqueued
3. No failure record is persisted to the database
4. The notification remains marked as created (in-app) but external delivery is lost

The `deliveryRetryService` in the automation module has its own retry queue with
configurable max attempts and exponential backoff, but it operates on a completely
separate code path. It also contains a **placeholder email sender** that is not the
same implementation used by `ChannelDispatchService`.

---

## 2. Deduplication Assessment

| Aspect | Status | Details |
|--------|--------|---------|
| Deduplication level | ![PASS](https://img.shields.io/badge/PASS-green) | Alert creation level (before dispatch) |
| Key composition | `sourceId` + `projectId` | Unique per alert source within a project |
| Mechanism | Cooldown window lookup | If matching alert exists within cooldown, creation is skipped |
| Dispatch implication | Effective | If alert is not created, dispatch never executes |

Deduplication is **not** implemented at the dispatch level. Instead, it is enforced
at the alert creation layer. When a new intelligence alert is about to be created,
the system checks whether an alert with the same `sourceId` and `projectId` already
exists within the active cooldown window. If so, the alert is silently dropped,
which means `ChannelDispatchService` is never invoked.

This design is sufficient because:
- Each alert maps 1:1 to a dispatch call
- No alert creation = no dispatch = no duplicate delivery
- The cooldown window is type-specific (see below)

---

## 3. Cooldown Values

| Alert Type | Cooldown Duration | Rationale |
|------------|-------------------|-----------|
| `WARNING_SPIKE` | **1 hour** | Spikes are time-sensitive; allow re-alert after 1h |
| `LOW_CONFIDENCE` | **24 hours** | Data quality issues are stable; daily check sufficient |
| `BENCHMARK_DECLINE` | **24 hours** | Benchmark trends move slowly; daily re-evaluation |
| `PROVIDER_COVERAGE_LOW` | **6 hours** | Coverage gaps may resolve quickly; check every 6h |

These values are defined as constants in the intelligence alert trigger module.
They are not user-configurable at this time.

### Cooldown Flow

```
New alert trigger
  --> lookup existing alert by (sourceId, projectId, type)
    --> if found AND within cooldown window
      --> SKIP creation (no dispatch)
    --> if not found OR outside cooldown window
      --> CREATE alert
      --> DISPATCH via ChannelDispatchService
```

---

## 4. Repeated Alert Prevention

| Scenario | Protected? | Mechanism |
|----------|------------|-----------|
| Same metric spike within 1h | Yes | `WARNING_SPIKE` cooldown = 1h |
| Same low-confidence flag within 24h | Yes | `LOW_CONFIDENCE` cooldown = 24h |
| Same benchmark decline within 24h | Yes | `BENCHMARK_DECLINE` cooldown = 24h |
| Same provider gap within 6h | Yes | `PROVIDER_COVERAGE_LOW` cooldown = 6h |
| Cross-project same sourceId | Yes | Cooldown key includes `projectId` — fully isolated |
| Cross-user same alert | Yes | Alerts are scoped to project, projects are scoped to user |

The combination of `sourceId + projectId` as the cooldown key ensures complete
isolation between projects and users. Two different projects monitoring the same
YouTube channel will each receive their own alerts independently.

---

## 5. Failure Impact Analysis

| Failure Point | Consequence | Recovery Path |
|---------------|-------------|---------------|
| Email API 5xx | Delivery lost | None — must re-trigger alert manually |
| Email API timeout | Delivery lost | None |
| Webhook endpoint down | Delivery lost | None |
| Webhook DNS failure | Delivery lost | None |
| Invalid email address | Delivery lost | Error logged; user must fix settings |
| Invalid webhook URL | Delivery lost | Error logged; user must fix settings |
| Network partition | All external deliveries lost | In-app notification still persisted |

### Key Observation

In-app notifications are always persisted to the database **before** external
dispatch begins. Therefore, even if all external channels fail, the user will still
see the notification in the bell dropdown and history page. The failure only affects
email and webhook delivery — the in-app experience is unaffected.

---

## 6. Recommendations

| Priority | Recommendation | Effort |
|----------|---------------|--------|
| **S1** | Add retry queue to `ChannelDispatchService` with 3 attempts + exponential backoff | Medium |
| **S1** | Persist delivery attempt/status to `NotificationDelivery` table | Medium |
| **S2** | Connect `deliveryRetryService` to intelligence alert path or unify into one service | Low |
| **S3** | Make cooldown values user-configurable via project settings | Low |

---

## Conclusion

The deduplication and cooldown mechanisms are well-designed and effectively prevent
duplicate alerts from reaching external channels. The critical gap is the complete
absence of retry logic in the channel-dispatch path — any single-point failure in
email or webhook delivery results in permanent loss of that notification's external
delivery. The in-app notification is always preserved as a safety net.
