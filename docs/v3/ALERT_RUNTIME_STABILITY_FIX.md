# Alert Runtime Stability Fix

> **Date**: 2026-03-15
> **Component**: `IntelligenceAlertService`
> **File**: `packages/api/src/services/intelligence/intelligence-alert.service.ts`
> **Priority**: P1

---

## Context

The Intelligence alert pipeline runs inline at the end of the `intelligence.analyze` tRPC
mutation. Before this fix, any unhandled exception in the alert evaluation path would
propagate upward and turn a successful analysis into a 500 error visible to the user.

This was a P1 because a transient DB hiccup during notification creation would silently
destroy an otherwise-complete analysis result.

---

## Error Isolation Architecture

The fix introduces three independent try-catch layers. Each layer logs via `console.error`
and allows the pipeline to continue.

```
evaluateAndAlert()
 |
 +-- Layer 1: previousRun query
 |     try { findFirst(...) } catch { previousRun = null; log }
 |
 +-- evaluateConditions()  (pure logic, no I/O, no try-catch needed)
 |
 +-- Layer 2: per-condition processing loop
       for (const condition of conditions) {
         try {
           isWithinCooldown(...)
           createAlertNotification(...)
           alertsTriggered.push(...)
         } catch { log; continue }  <-- next condition still runs
       }
         |
         +-- Layer 3: createAlertNotification()
               try { prisma.notification.create(...) }
               catch { log; return null }
```

### Layer 1 — previousRun Query

```ts
let previousRun: any = null;
try {
  previousRun = await this.prisma.intelligenceAnalysisRun.findFirst({
    where: { projectId, seedKeyword },
    orderBy: { analyzedAt: "desc" },
    skip: 1,
  });
} catch (err) {
  console.error("[IntelligenceAlert] Failed to fetch previous run:", err);
}
```

**Behavior on failure**: `previousRun` remains `null`. Only comparison-based alert
conditions (WARNING_SPIKE increase check, BENCHMARK_DECLINE) are affected. Absolute
threshold conditions (LOW_CONFIDENCE, PROVIDER_COVERAGE_LOW) still fire normally.

### Layer 2 — Per-Condition Processing

Each condition (WARNING_SPIKE, LOW_CONFIDENCE, BENCHMARK_DECLINE, PROVIDER_COVERAGE_LOW)
is processed inside its own try-catch block within the for loop. If cooldown lookup or
notification creation fails for one condition, the remaining conditions still execute.

This prevents a single corrupted notification record from blocking all other alerts.

### Layer 3 — createAlertNotification

The innermost layer wraps `prisma.notification.create()`. On failure it logs the error
with the alert type and keyword context, then returns `null` instead of throwing.

```ts
private async createAlertNotification(params: {
  userId: string;
  type: IntelligenceAlertType;
  severity: AlertSeverity;
  message: string;
  sourceId: string;
  keyword: string;
  projectId: string;
}): Promise<string | null> {
  try {
    // ... prisma.notification.create(...)
    return notificationId;
  } catch (err) {
    console.error(`[IntelligenceAlert] Notification create failed for ${params.type}:`, err);
    return null;
  }
}
```

---

## sourceId Format Change

### Before
```
{type}:{keyword}
// Example: WARNING_SPIKE:brand_keyword
```

### After
```
{projectId}:{type}:{keyword}
// Example: proj_abc123:WARNING_SPIKE:brand_keyword
```

### Why This Matters

- **Cross-project isolation**: Two projects analyzing the same keyword no longer share
  cooldown windows. Project A triggering a WARNING_SPIKE alert does not suppress the
  same alert for Project B.

- **Deduplication scoping**: The `isWithinCooldown` method queries by `sourceType` +
  `sourceId` + `createdAt >= cooldownStart`. Since sourceId now contains projectId,
  the dedup boundary is project-scoped by default.

- **Backwards compatibility**: Existing notification records with the old format will
  not match the new format, so they will not accidentally suppress new alerts. This is
  the desired behavior since old records would have incorrect scoping anyway.

---

## Cooldown Mechanism

Each alert type has a defined cooldown period to prevent notification flooding:

| Alert Type | Cooldown |
|-----------|----------|
| WARNING_SPIKE | 1 hour |
| LOW_CONFIDENCE | 24 hours |
| BENCHMARK_DECLINE | 24 hours |
| PROVIDER_COVERAGE_LOW | 6 hours |

The cooldown check queries:
```ts
prisma.notification.findFirst({
  where: {
    sourceType: "intelligence_alert",
    sourceId,                          // includes projectId
    createdAt: { gte: cooldownStart }, // Date.now() - cooldownMs
  },
  orderBy: { createdAt: "desc" },
});
```

If a matching record exists, the condition is skipped silently (no error, no log).

---

## Alert Condition Evaluation

The `evaluateConditions()` method is a pure function (no I/O). It receives the current
analysis result and the optional previous run, and returns an array of triggered conditions.

| Condition | Trigger | Severity |
|-----------|---------|----------|
| WARNING_SPIKE | warnings.length >= 3 AND greater than previous run | HIGH |
| LOW_CONFIDENCE | confidence < 0.4 | NORMAL |
| BENCHMARK_DECLINE | overallScore dropped by >= 15 points from previous | HIGH |
| PROVIDER_COVERAGE_LOW | isPartial === true AND confidence < 0.5 | NORMAL |

When `previousRun` is null (Layer 1 failure or first-ever analysis):
- WARNING_SPIKE: Still triggers if warnings >= 3 (prev count defaults to 0)
- BENCHMARK_DECLINE: Skipped (requires both current and previous scores)
- Other conditions: Unaffected (absolute thresholds only)

---

## Notification Record Shape

Each alert creates a notification with this structure:

```ts
{
  id: randomBytes(12).toString("hex"),
  userId: params.userId,
  type: "SYSTEM_ALERT",
  title: `Intelligence Alert: ${params.type}`,
  message: params.message,             // Korean-language description
  priority: severity === "HIGH" ? "HIGH" : "NORMAL",
  sourceType: "intelligence_alert",
  sourceId: `${projectId}:${type}:${keyword}`,
  actionUrl: `/intelligence?keyword=${encodeURIComponent(keyword)}`,
  channels: ["IN_APP"],
  isRead: false,
}
```

The `actionUrl` navigates the user directly to the Intelligence page with the relevant
keyword pre-selected.

---

## Testing Guidance

1. **Verify isolation**: Disconnect or mock-fail the notification table, run analyze,
   confirm the response returns normally with all analysis data intact.
2. **Verify per-condition independence**: Create a scenario where two conditions trigger;
   fail the first notification create, confirm the second still succeeds.
3. **Verify project scoping**: Run the same keyword in two different projects, confirm
   each project gets its own alert and cooldown window.
4. **Verify cooldown**: Trigger the same alert type twice within the cooldown window,
   confirm the second is suppressed.

---

## Related Files

```
packages/api/src/services/intelligence/intelligence-alert.service.ts  (primary)
packages/api/src/routers/intelligence.ts                              (caller)
packages/db/prisma/schema.prisma                                      (Notification model)
```
