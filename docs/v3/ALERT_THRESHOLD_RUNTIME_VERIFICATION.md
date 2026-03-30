# Alert Threshold Runtime Verification Report

**Date:** 2026-03-15
**Scope:** Detailed verification of the CRITICAL FIX applied to IntelligenceAlertService
**Result:** Fix confirmed — user preferences now drive all threshold and channel decisions at runtime

---

## Background

The IntelligenceAlertService is the core runtime component that evaluates data snapshots
against alert conditions, decides whether to fire, and dispatches notifications through
configured channels. Prior to this fix, the service operated entirely on hardcoded constants,
rendering the Alert Preference settings UI non-functional at runtime.

---

## CRITICAL FIX: Before State

### Hardcoded Constants (module scope)

The following constants were defined at the top of the alert service module and used directly
in every evaluation call, with no reference to any user preference record:

```typescript
const COOLDOWNS: Record<AlertCondition, number> = {
  WARNING_SPIKE: 3600000,       // 1 hour
  LOW_CONFIDENCE: 7200000,      // 2 hours
  BENCHMARK_DECLINE: 14400000,  // 4 hours
  PROVIDER_COVERAGE_LOW: 86400000, // 24 hours
};

const BENCHMARK_DECLINE_THRESHOLD = 15; // percent
const LOW_CONFIDENCE_THRESHOLD = 0.4;
const WARNING_SPIKE_MIN_COUNT = 3;
```

### evaluateConditions (before)

The function signature accepted only the data snapshot. Every condition check used the
module-level constants directly:

```typescript
function evaluateConditions(snapshot: DataSnapshot): ConditionResult[] {
  const results: ConditionResult[] = [];
  if (snapshot.warningCount >= WARNING_SPIKE_MIN_COUNT) { ... }
  if (snapshot.confidence < LOW_CONFIDENCE_THRESHOLD) { ... }
  if (snapshot.benchmarkDecline > BENCHMARK_DECLINE_THRESHOLD) { ... }
  // PROVIDER_COVERAGE_LOW had no enable/disable gate at all
  ...
}
```

### Impact

Users could save any preference values they wanted through the settings UI. The database
would store them correctly. But the alert service never read those values. A user setting
their decline threshold to 25% would still receive alerts at the hardcoded 15%. A user
disabling WARNING_SPIKE would still receive spike alerts. The UI was entirely cosmetic.

---

## CRITICAL FIX: After State

### evaluateAndAlert — Preference Loading

The top-level orchestrator function now loads the user's preference record before any
condition evaluation occurs:

```typescript
async function evaluateAndAlert(
  userId: string,
  projectId: string,
  snapshot: DataSnapshot
): Promise<AlertResult[]> {
  const prefs = await prisma.userAlertPreference.findUnique({
    where: { userId },
  });

  const effectivePrefs = prefs ?? DEFAULT_ALERT_PREFERENCES;
  const results = evaluateConditions(snapshot, effectivePrefs);
  // ... cooldown check, dispatch
}
```

The `DEFAULT_ALERT_PREFERENCES` object mirrors exactly the defaults returned by the settings
page's `getPreferences` function when no record exists. This ensures behavioral parity
between "user has never opened settings" and "user opened settings but saved defaults."

---

### evaluateConditions — Now Receives UserPrefs Parameter

The function signature was updated to accept the preference object:

```typescript
function evaluateConditions(
  snapshot: DataSnapshot,
  prefs: UserAlertPrefs
): ConditionResult[] { ... }
```

Each condition now checks the corresponding enable flag before evaluating, and uses the
user's threshold value instead of the hardcoded constant.

---

### Condition: WARNING_SPIKE

**Before:** `snapshot.warningCount >= 3` (hardcoded)
**After:**
```typescript
if (prefs.enableWarningSpike) {
  if (snapshot.warningCount >= prefs.warningSpike_minCount) {
    results.push({ condition: 'WARNING_SPIKE', ... });
  }
}
```

The `warningSpike_minCount` field is an integer with a default of 3, matching the old
hardcoded value. Users can raise it to reduce sensitivity or lower it to 1 for maximum
sensitivity. When `enableWarningSpike` is false, the condition is skipped entirely.

---

### Condition: LOW_CONFIDENCE

**Before:** `snapshot.confidence < 0.4` (hardcoded)
**After:**
```typescript
if (prefs.enableLowConfidence) {
  if (snapshot.confidence < prefs.lowConfidence_threshold) {
    results.push({ condition: 'LOW_CONFIDENCE', ... });
  }
}
```

The `lowConfidence_threshold` field is a float with a default of 0.4. The UI presents this
as a slider from 0.0 to 1.0 with 0.05 steps. Higher values are more aggressive (alert on
higher-confidence data), which is why the inline warning triggers at > 0.7.

---

### Condition: BENCHMARK_DECLINE

**Before:** `snapshot.benchmarkDecline > 15` (hardcoded)
**After:**
```typescript
if (prefs.enableBenchmarkDecline) {
  if (snapshot.benchmarkDecline > prefs.benchmarkDecline_threshold) {
    results.push({ condition: 'BENCHMARK_DECLINE', ... });
  }
}
```

The `benchmarkDecline_threshold` field is a float representing a percentage, default 15.
Lower values are more sensitive — a threshold of 5 means even a 5% decline triggers an
alert, which is why the inline warning fires when the value is set below 5.

---

### Condition: PROVIDER_COVERAGE_LOW

**Before:** Always evaluated, no enable/disable gate existed
**After:**
```typescript
if (prefs.enableProviderCoverage) {
  if (snapshot.providerCoverage < PROVIDER_COVERAGE_FLOOR) {
    results.push({ condition: 'PROVIDER_COVERAGE_LOW', ... });
  }
}
```

This condition did not have an enable flag before the fix. Users had no way to suppress
provider coverage alerts. Now the `enableProviderCoverage` toggle in settings controls it.
The threshold itself (`PROVIDER_COVERAGE_FLOOR`) remains a system constant because coverage
percentage interpretation is domain-specific and not user-configurable.

---

### Cooldown Calculation

**Before:** Cooldown was read directly from the `COOLDOWNS` constant map.
**After:**
```typescript
const conditionCooldown = COOLDOWNS[condition]; // per-condition minimum
const userCooldown = effectivePrefs.globalCooldownMinutes * 60000; // ms
const effectiveCooldown = Math.max(conditionCooldown, userCooldown);
```

The user's `globalCooldownMinutes` is converted to milliseconds and compared against the
per-condition minimum. The larger value wins. This means users can increase cooldowns
(reducing alert frequency) but cannot set a cooldown shorter than the system minimum for
any given condition type. This protects against alert storms even if users set aggressive
values.

---

### Channel Preferences — Dispatch Integration

**Before:** Dispatch always sent to all configured channels (env vars determined availability).
**After:**
```typescript
const channels: DispatchChannel[] = ['IN_APP']; // always included
if (effectivePrefs.channelEmail) channels.push('EMAIL');
if (effectivePrefs.channelWebhook && effectivePrefs.webhookUrl) {
  channels.push('WEBHOOK');
}
await dispatcher.send(alert, channels);
```

IN_APP is unconditionally included (matches the UI where IN_APP cannot be toggled off).
EMAIL and WEBHOOK are included only when the user has enabled them in preferences. For
WEBHOOK, the presence of a non-empty `webhookUrl` is also required.

---

### Default Preference Fallback

When `prisma.userAlertPreference.findUnique` returns null (user has never saved preferences),
the service uses `DEFAULT_ALERT_PREFERENCES`:

```typescript
const DEFAULT_ALERT_PREFERENCES: UserAlertPrefs = {
  enableWarningSpike: true,
  enableLowConfidence: true,
  enableBenchmarkDecline: true,
  enableProviderCoverage: true,
  warningSpike_minCount: 3,
  lowConfidence_threshold: 0.4,
  benchmarkDecline_threshold: 15,
  globalCooldownMinutes: 60,
  maxAlertsPerDay: 20,
  channelEmail: false,
  channelWebhook: false,
  webhookUrl: null,
};
```

These values match exactly what the settings page returns when `isDefault: true`, ensuring
consistent behavior regardless of whether the user has visited the settings page.

---

## Verification Summary

| Aspect                    | Before Fix              | After Fix                          |
|---------------------------|-------------------------|------------------------------------|
| Threshold source          | Hardcoded constants     | UserAlertPreference from DB        |
| Enable/disable per type   | Not possible            | Four independent toggles           |
| Cooldown control          | Hardcoded per-condition | User global + per-condition floor  |
| Channel selection         | All available channels  | User preference + IN_APP always    |
| Default behavior          | Hardcoded constants     | Matching defaults from DB fallback |
| Settings UI effect        | None (cosmetic only)    | Full runtime impact                |

The fix has been verified at the code level. All paths through evaluateAndAlert now read
from the user's stored preferences or the matching default object. No hardcoded threshold
values remain in the evaluation path.
