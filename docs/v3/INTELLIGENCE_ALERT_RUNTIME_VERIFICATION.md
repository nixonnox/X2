# Intelligence Alert Runtime Verification

> **Date**: 2026-03-15
> **Scope**: `IntelligenceAlertService` runtime behavior, DB persistence, integration with analyze mutation
> **Status**: Partial Pass — 1 S0, 3 S1, 2 S2 issues identified

---

## 1. Verification Summary

| Area | Status | Notes |
|------|--------|-------|
| Service class exists | PASS | `intelligence-alert.service.ts` |
| Alert condition definitions | PASS | 4 conditions with correct thresholds |
| Deduplication logic | PASS | sourceType + sourceId + cooldown window |
| Previous run comparison | PASS | skip:1 + orderBy analyzedAt desc |
| DB persistence | PASS | `prisma.notification.create()` |
| Analyze mutation integration | PASS | Step 7, try-catch wrapped |
| Response metadata | PASS | `alertsTriggered` in response |
| No mock/hardcoded values | PASS | All data-driven |
| Alert UI display | **FAIL** | Bell icon non-functional |
| Cross-project dedup | **FAIL** | sourceId lacks projectId |
| Error isolation | **FAIL** | No inner try-catch |
| NotificationType enum | **FAIL** | Uses generic SYSTEM_ALERT |
| First-run behavior | **WARN** | Comparison alerts skip silently |
| Delivery channels | **WARN** | Email/WebSocket stubbed |
| Alert query endpoint | **WARN** | No sourceType filter |

---

## 2. Verified Correct Items

### 2.1 Alert Condition Definitions

| Condition | Severity | Cooldown | Trigger Logic |
|-----------|----------|----------|---------------|
| `WARNING_SPIKE` | HIGH | 1 hour | Warning signal count > previous run by >= 2 |
| `LOW_CONFIDENCE` | NORMAL | 24 hours | Overall confidence score < 0.4 |
| `BENCHMARK_DECLINE` | HIGH | 24 hours | Benchmark score dropped > 15% from previous |
| `PROVIDER_COVERAGE_LOW` | NORMAL | 6 hours | Fewer than 2 providers returned data |

All 4 conditions are defined as typed constants with severity and cooldown values.
No magic numbers in evaluation logic — thresholds reference the constant definitions.

### 2.2 Deduplication Mechanism

```
Dedup Key: sourceType + sourceId
Query:     prisma.notification.findFirst({
             where: {
               sourceType,
               sourceId,
               createdAt: { gte: cooldownStart }
             }
           })
```

| Check | Expected | Actual | Match |
|-------|----------|--------|-------|
| Composite key | sourceType + sourceId | Same | Yes |
| Time window | `new Date(now - cooldownMs)` | `cooldownStart` computed correctly | Yes |
| Skip if exists | Return early, no duplicate | `if (existing) return null` | Yes |

### 2.3 Previous Run Comparison

| Property | Value |
|----------|-------|
| Query | `prisma.keywordAnalysis.findFirst({ where: { keyword }, orderBy: { analyzedAt: 'desc' }, skip: 1 })` |
| Purpose | Get the run before the current one for delta comparison |
| Null handling | If no previous run, comparison alerts are skipped (return early) |

### 2.4 DB Persistence

```
prisma.notification.create({
  data: {
    type: 'SYSTEM_ALERT',
    sourceType: condition.name,
    sourceId: `${condition.name}:${keyword}`,
    title: condition.title,
    message: formattedMessage,
    severity: condition.severity,
    projectId,
    userId,
    read: false
  }
})
```

Real `prisma.notification.create()` call confirmed. No in-memory store, no mock layer.

### 2.5 Analyze Mutation Integration

| Property | Value |
|----------|-------|
| Call site | `analyze` mutation, step 7 (after scoring, before response) |
| Wrapper | `try { alertsTriggered = await alertService.evaluate(...) } catch (e) { log.warn(...) }` |
| Response | `{ ...result, metadata: { alertsTriggered } }` |

The outer try-catch ensures alert failures do not crash the analyze mutation.

---

## 3. Issues Found

### Issue #1: Alerts Created But No UI Display Path

| Field | Value |
|-------|-------|
| **Title** | Alerts created in DB but NO UI to display them |
| **Severity** | ![S0](https://img.shields.io/badge/severity-S0-red) |
| **Description** | `IntelligenceAlertService` successfully creates `Notification` records in the database via `prisma.notification.create()`. However, the bell icon in the top navigation bar has no `onClick` handler, no dropdown component, and no query to fetch notifications. There is no alternative UI path to view these records. |
| **Actual Impact** | Alert records accumulate silently. Users have zero visibility into triggered alerts. The entire alert pipeline produces output that is never consumed, making the feature effectively non-existent from the user's perspective. |
| **Quick Fix** | **N** — Requires a notification dropdown component, tRPC query endpoint, and read-state management. |
| **Structural Fix** | **Y** — Implement full notification consumption UI: dropdown, list view, mark-read, and click-through to source keyword analysis. |

### Issue #2: Cross-Project Deduplication Vulnerability

| Field | Value |
|-------|-------|
| **Title** | sourceId format lacks projectId — cross-project dedup vulnerability |
| **Severity** | ![S1](https://img.shields.io/badge/severity-S1-orange) |
| **Description** | The `sourceId` is formatted as `"{conditionType}:{keyword}"` (e.g., `"WARNING_SPIKE:삼성전자"`). When the same keyword is analyzed in different projects, the deduplication query matches across projects because `sourceId` does not include `projectId`. |
| **Actual Impact** | If Project A triggers a `WARNING_SPIKE` alert for keyword "삼성전자", and Project B analyzes the same keyword within the cooldown window, Project B's alert is suppressed even though it is a separate context. Users of Project B miss a legitimate alert. |
| **Quick Fix** | **Y** — Change sourceId format to `"{conditionType}:{projectId}:{keyword}"`. |
| **Structural Fix** | **Y** — Add `projectId` to the dedup query `where` clause in addition to the sourceId change, ensuring belt-and-suspenders isolation. |

### Issue #3: Silent Alert Creation Failures

| Field | Value |
|-------|-------|
| **Title** | No try-catch inside `createAlertNotification()` — DB error kills entire evaluation |
| **Severity** | ![S1](https://img.shields.io/badge/severity-S1-orange) |
| **Description** | While the outer `analyze` mutation wraps `alertService.evaluate()` in try-catch, the `evaluate()` method itself calls `createAlertNotification()` for each condition sequentially. If the first condition's DB write fails (e.g., unique constraint, connection timeout), remaining conditions are never evaluated. |
| **Actual Impact** | A transient DB error on one alert condition silently prevents all subsequent conditions from being checked. The outer catch logs a generic warning but does not indicate which conditions were skipped. Partial alert evaluation produces inconsistent state. |
| **Quick Fix** | **Y** — Wrap each `createAlertNotification()` call in its own try-catch within the evaluation loop. |
| **Structural Fix** | **N** — Individual try-catch per condition is the correct pattern; no deeper refactor needed. |

### Issue #4: Generic SYSTEM_ALERT NotificationType

| Field | Value |
|-------|-------|
| **Title** | Uses generic SYSTEM_ALERT type — cannot filter intelligence alerts |
| **Severity** | ![S1](https://img.shields.io/badge/severity-S1-orange) |
| **Description** | All intelligence alerts are created with `type: 'SYSTEM_ALERT'`. The `NotificationType` enum does not have an intelligence-specific variant. This makes it impossible to query only intelligence alerts without parsing `sourceType` string values. |
| **Actual Impact** | Any future notification listing UI that filters by type will show intelligence alerts mixed with other system alerts (maintenance notices, quota warnings, etc.). Building an "Intelligence Alerts" tab requires filtering by `sourceType` string matching instead of a proper enum, which is fragile. |
| **Quick Fix** | **N** — Requires adding a new enum value to `NotificationType` and a schema migration. |
| **Structural Fix** | **Y** — Add `INTELLIGENCE_ALERT` to the `NotificationType` enum in the Prisma schema, run migration, and update the alert service. |

### Issue #5: First-Run Alert Limitations

| Field | Value |
|-------|-------|
| **Title** | WARNING_SPIKE and BENCHMARK_DECLINE cannot fire without previous run |
| **Severity** | ![S2](https://img.shields.io/badge/severity-S2-yellow) |
| **Description** | Two of the four alert conditions (`WARNING_SPIKE` and `BENCHMARK_DECLINE`) require a previous analysis run for delta comparison. On the first analysis of any keyword, these conditions silently skip because `previousRun` is null. |
| **Actual Impact** | Users analyzing a keyword for the first time will never see spike or decline alerts regardless of how extreme the results are. This is technically correct behavior (no baseline to compare against) but is not communicated to the user. They may assume the system checked for spikes when it did not. |
| **Quick Fix** | **Y** — Show an informational note on first-run results: "비교 기준이 없어 일부 알림 조건이 건너뛰어졌습니다." |
| **Structural Fix** | **N** — The skip behavior is correct; only UX communication needs improvement. |

### Issue #6: Email/WebSocket Delivery Not Implemented

| Field | Value |
|-------|-------|
| **Title** | Email and WebSocket delivery channels are stubbed with TODO comments |
| **Severity** | ![S2](https://img.shields.io/badge/severity-S2-yellow) |
| **Description** | The alert service contains `// TODO: implement email notification` and `// TODO: implement WebSocket push` comments. Only `IN_APP` (database record) delivery is functional. |
| **Actual Impact** | Users must actively check the app to discover alerts. No push notification or email digest is sent, reducing the timeliness and utility of the alert system. Combined with the S0 bell icon issue, alerts are currently invisible through any channel. |
| **Quick Fix** | **N** — Email and WebSocket require infrastructure setup (SMTP config, WS server). |
| **Structural Fix** | **Y** — Implement delivery channel abstraction with `IN_APP`, `EMAIL`, `PUSH` strategies and user preference settings. |

### Issue #7: No Alert-Specific Query Endpoint

| Field | Value |
|-------|-------|
| **Title** | No tRPC endpoint for querying alerts with sourceType filter |
| **Severity** | ![S2](https://img.shields.io/badge/severity-S2-yellow) |
| **Description** | While `trpc.notification.list` exists for general notifications, there is no intelligence-specific query that filters by `sourceType` or allows filtering by alert condition type, severity, or keyword. |
| **Actual Impact** | Building an alert management UI requires client-side filtering of all notifications, which is inefficient and breaks pagination. Cannot build a dedicated "Intelligence Alerts" view without a server-side filtered query. |
| **Quick Fix** | **Y** — Add `sourceType` and `severity` optional filters to the existing `notification.list` endpoint. |
| **Structural Fix** | **N** — Extending the existing endpoint with filter params is sufficient. |

---

## 4. Severity Distribution

| Severity | Count | Items |
|----------|-------|-------|
| ![S0](https://img.shields.io/badge/severity-S0-red) | 1 | No UI to display alerts |
| ![S1](https://img.shields.io/badge/severity-S1-orange) | 3 | Cross-project dedup, silent failures, generic type |
| ![S2](https://img.shields.io/badge/severity-S2-yellow) | 3 | First-run limits, delivery stubs, no query endpoint |
| ![S3](https://img.shields.io/badge/severity-S3-grey) | 0 | — |

---

## 5. Alert Pipeline Flow

```
Analyze Mutation (step 7)
  └─ alertService.evaluate(keyword, result, projectId, userId)
       ├─ Check WARNING_SPIKE     → [needs previousRun] → dedup → create notification
       ├─ Check LOW_CONFIDENCE    → [threshold < 0.4]   → dedup → create notification
       ├─ Check BENCHMARK_DECLINE → [needs previousRun] → dedup → create notification
       └─ Check PROVIDER_COVERAGE → [providers < 2]     → dedup → create notification
            └─ prisma.notification.create()
                 └─ ??? (no UI consumption path)
```

---

## 6. Recommendations

| Priority | Action | Effort | Blocks |
|----------|--------|--------|--------|
| P0 | Build notification dropdown UI | 2-3 days | All alert visibility |
| P1 | Fix sourceId to include projectId | 1 hour | Multi-project correctness |
| P1 | Add per-condition try-catch | 30 min | Alert reliability |
| P1 | Add INTELLIGENCE_ALERT enum + migration | 2 hours | Alert filtering |
| P2 | Add first-run UX note | 1 hour | User understanding |
| P2 | Add sourceType filter to notification.list | 2 hours | Alert management UI |
| P2 | Implement email delivery | 1-2 days | Async alert delivery |

---

*Report generated as part of Intelligence Alert runtime verification cycle.*
*Next: ALERT_TRIGGER_AND_DELIVERY_GAP_LIST.md*
