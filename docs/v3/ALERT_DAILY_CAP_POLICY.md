# Alert Daily Cap Policy

**Date:** 2026-03-15
**Status:** IMPLEMENTED (verified by source code review)

---

## 1. Overview

The daily alert cap (`maxAlertsPerDay`) limits how many intelligence alert notifications
a single user can receive within a calendar day. This prevents notification fatigue
and protects against runaway alert storms.

---

## 2. Implementation Location

**Service:** `packages/api/src/services/intelligence/intelligence-alert.service.ts`
**Class:** `IntelligenceAlertService`
**Method:** `evaluateAndAlert()`

---

## 3. Implementation Flow

### Step 1: Load User Preferences
```
UserAlertPreference.findUnique({ where: { userId } })
```
- Loads `maxAlertsPerDay` from the user's saved preferences
- Default value if no preference record exists: **20**
- If preference load fails (DB error), defaults are used silently

### Step 2: Count Today's Alerts (Pre-Evaluation Check)
```
Notification.count({
  where: {
    userId,
    sourceType: "intelligence_alert",
    createdAt: { gte: todayStart }
  }
})
```
- `todayStart` is calculated as midnight (00:00:00.000) of the current day in server timezone
- Counts only `intelligence_alert` type notifications (not other notification types)
- Scoped to the specific user
- If count query fails, cap enforcement is skipped (fail-open)

### Step 3: Pre-Evaluation Gate
```
if (dailyAlertCount >= prefs.maxAlertsPerDay) {
  console.info(`[IntelligenceAlert] Daily cap reached for user ${userId}: ${count}/${cap}`);
  return { alertsTriggered: [], dailyCapped: true };
}
```
- If the user has already hit their daily cap, no conditions are evaluated at all
- Returns immediately with empty `alertsTriggered` and `dailyCapped: true`
- Logs the cap event with user ID, current count, and cap value

### Step 4: Track Remaining Cap During Evaluation
```
let remainingDailyCap = prefs.maxAlertsPerDay - dailyAlertCount;
```
- Initialized before the condition processing loop
- Accounts for alerts already sent today

### Step 5: Per-Iteration Cap Check (Mid-Evaluation)
```
if (remainingDailyCap <= 0) {
  console.info(`[IntelligenceAlert] Daily cap reached mid-evaluation`);
  break;
}
```
- Checked at the start of each iteration in the conditions loop
- If cap is reached partway through evaluation, remaining conditions are skipped
- Logs the mid-evaluation cap event

### Step 6: Decrement After Each Alert
```
alertsTriggered.push(condition.type);
remainingDailyCap--;
```
- After successfully creating an alert notification, the remaining cap is decremented
- This prevents exceeding the cap within a single evaluation call

### Step 7: Return Result
```
return { alertsTriggered, dailyCapped: false };
```
- Normal completion returns `dailyCapped: false`
- Note: even if cap was reached mid-evaluation, `dailyCapped` is `false` (it is only
  `true` when the pre-evaluation gate blocks ALL evaluation)

---

## 4. Scope and Isolation

### Per-User Scope
- The daily cap is per-user, not per-project or per-workspace
- A user with multiple projects shares a single daily cap across all projects
- This is intentional: the cap protects the user from notification overload regardless of source

### Notification Type Scope
- Only counts `sourceType: "intelligence_alert"` notifications
- Other notification types (system announcements, report completions, etc.) do not count
  toward the intelligence alert cap

### Time Window
- Uses server-local midnight as the day boundary (not UTC, not Pacific Time)
- Note: this differs from YouTube's quota reset which uses Pacific Time
- A new day starts at 00:00:00.000 server time

---

## 5. Interaction with Cooldown

The daily cap and per-alert cooldown are **separate, layered** guardrails:

1. **Daily cap check runs FIRST** (lines 137-158 in service)
   - If cap reached: return immediately, no conditions evaluated
2. **Conditions are evaluated** (line 161)
   - Generates list of triggered alert types
3. **Cooldown check runs per-condition** (lines 190-199)
   - Each condition's `sourceId` is checked for recent notifications
   - Uses `Math.max(condition.cooldownMs, globalCooldownMinutes * 60000)`
   - If within cooldown: that specific alert is skipped, others continue
4. **Daily cap re-checked per-iteration** (lines 174-179)
   - If remaining cap hits 0 during loop: break out

Order: Daily Cap (global) -> Condition Evaluation -> Cooldown (per-type) -> Mid-loop Cap

---

## 6. User Configuration

### Database Schema
```prisma
model UserAlertPreference {
  maxAlertsPerDay  Int @default(20)
  // ...
}
```
Located in `packages/db/prisma/schema.prisma`

### UI Configuration
- **Page:** `/settings/notifications` (apps/web/src/app/(dashboard)/settings/notifications/page.tsx)
- **Input:** Number field, min=1, max=100
- **Warning:** Shows amber warning text when value exceeds 50
- **Default:** 20

### Validation
- Frontend: `Math.min(100, Math.max(1, Number(e.target.value) || 1))`
- Clamped to range [1, 100]
- Non-numeric input falls back to 1

---

## 7. Logging

Two distinct log points:

### Pre-evaluation cap log
```
[IntelligenceAlert] Daily cap reached for user {userId}: {count}/{cap} — skipping all alerts
```
- Fires when user has already hit cap before any evaluation begins

### Mid-evaluation cap log
```
[IntelligenceAlert] Daily cap reached mid-evaluation — skipping remaining conditions
```
- Fires when cap is exhausted while processing conditions in the loop

Both use `console.info` (not `console.warn` or `console.error`), as hitting the cap
is expected behavior, not an error condition.

---

## 8. dailyCapped Flag

### In Service Return Type
```typescript
Promise<{ alertsTriggered: string[]; dailyCapped?: boolean }>
```
- `dailyCapped: true` — pre-evaluation gate blocked all evaluation
- `dailyCapped: false` — evaluation proceeded (may have been partially capped mid-loop)
- `dailyCapped: undefined` — should not occur in practice but type allows it

### In Router Response
- **NOT VERIFIED:** `dailyCapped` is returned by `evaluateAndAlert()` but whether the
  notification router passes it through to the API response was not confirmed.
  The `dailyCapped` field is NOT present in `packages/api/src/routers/notification.ts`.
  It exists only within the service layer.

---

## 9. Edge Cases

### Concurrent Evaluations
- If two `evaluateAndAlert()` calls run simultaneously for the same user,
  both read the same `dailyAlertCount` before either creates new notifications.
  This could result in slightly exceeding the cap (race condition).
- Severity: Low — the overshoot is bounded by the number of conditions (max 4 per call).

### Midnight Boundary
- An evaluation starting at 23:59:59 could create alerts that count toward today,
  while a subsequent evaluation at 00:00:01 sees a fresh count.
  This is standard behavior, not a bug.

### Count Query Failure
- If `notification.count()` throws, `dailyAlertCount` remains 0 and cap enforcement
  is effectively skipped. This is a fail-open design choice.

---

## 10. Honesty Statement

### Verified (by reading source code)
- maxAlertsPerDay field exists in UserPrefs type with default 20
- Pre-evaluation count query filters by userId + sourceType + createdAt
- Pre-evaluation gate returns dailyCapped: true and logs
- remainingDailyCap is initialized and decremented correctly
- Mid-evaluation break with log message exists
- UI allows configuration in range [1, 100]
- Schema has maxAlertsPerDay with @default(20)

### NOT Verified (requires running database)
- Actual notification.count() query execution
- Actual daily cap enforcement at runtime
- Race condition behavior under concurrent calls
- UI save/load round-trip to database
- dailyCapped flag propagation to API consumers (confirmed it does NOT reach the router)
