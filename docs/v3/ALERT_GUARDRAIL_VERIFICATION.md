# Alert Guardrail Verification Report

**Date:** 2026-03-15
**Scope:** Verification of all input validation, safety guardrails, and default behaviors in the Alert Preference system
**Result:** All guardrail mechanisms verified and functioning correctly

---

## Overview

The Alert Preference system includes multiple layers of guardrails to prevent users from
configuring alert settings that would cause alert storms, missed critical notifications, or
invalid state. This report verifies each guardrail layer: Zod schema validation on the
server, inline warnings in the UI, channel safety rules, and default value consistency.

---

## 1. Zod Validation — Server-Side Schema

The `savePreferences` server action validates all incoming data through a Zod schema before
any database write occurs. The schema enforces hard boundaries that cannot be bypassed from
the client.

### Boolean Fields

All enable/disable flags are validated as `z.boolean()`. Non-boolean values are rejected:
- `enableWarningSpike`
- `enableLowConfidence`
- `enableBenchmarkDecline`
- `enableProviderCoverage`
- `channelEmail`
- `channelWebhook`

### Numeric Fields with Min/Max Ranges

| Field                       | Type    | Min   | Max    | Default |
|-----------------------------|---------|-------|--------|---------|
| warningSpike_minCount       | z.number().int() | 1     | 100    | 3       |
| lowConfidence_threshold     | z.number()       | 0.0   | 1.0    | 0.4     |
| benchmarkDecline_threshold  | z.number()       | 1     | 100    | 15      |
| globalCooldownMinutes       | z.number().int() | 5     | 1440   | 60      |
| maxAlertsPerDay             | z.number().int() | 1     | 200    | 20      |

Values outside these ranges cause a validation error response with field-level messages.
The min/max boundaries prevent extreme configurations:
- Cooldown cannot be less than 5 minutes (prevents sub-minute alert spam)
- Cooldown cannot exceed 1440 minutes (24 hours — ensures at least daily evaluation)
- maxAlertsPerDay cannot be 0 (prevents silent suppression of all alerts)
- Confidence threshold stays within [0, 1] (the only valid probability range)

### String Fields

- `webhookUrl`: validated as `z.string().url().optional().or(z.literal(''))` — must be a
  valid URL if provided, or empty string, or omitted. Invalid URLs are rejected.

---

## 2. Server-Side Warnings

Beyond hard validation, the server action returns advisory warnings for configurations that
are technically valid but may cause problems. These warnings are returned in the response
alongside a successful save — they do not block persistence.

### Warning Conditions

**Condition 1 — Short Cooldown:**
```
if (data.globalCooldownMinutes < 30) {
  warnings.push('cooldown_short');
}
```
Trigger: globalCooldownMinutes is between 5 and 29 (inclusive).
Rationale: Cooldowns under 30 minutes can generate high alert volumes, especially if
multiple condition types are enabled simultaneously.

**Condition 2 — High Daily Cap:**
```
if (data.maxAlertsPerDay > 50) {
  warnings.push('max_alerts_high');
}
```
Trigger: maxAlertsPerDay is between 51 and 200.
Rationale: More than 50 alerts per day is likely to cause notification fatigue. Most users
should stay under 20.

**Condition 3 — High Confidence Threshold:**
```
if (data.lowConfidence_threshold > 0.7) {
  warnings.push('confidence_aggressive');
}
```
Trigger: lowConfidence_threshold is above 0.7.
Rationale: A high threshold means alerts fire even when data confidence is moderately good.
This produces many false positive low-confidence warnings.

**Condition 4 — Webhook Enabled Without URL:**
```
if (data.channelWebhook && (!data.webhookUrl || data.webhookUrl.trim() === '')) {
  warnings.push('webhook_no_url');
}
```
Trigger: channelWebhook is true but webhookUrl is empty or missing.
Rationale: Alerts will be configured for webhook delivery but have nowhere to go. The
alert service also checks this at dispatch time, but the warning catches it early.

---

## 3. Inline Warnings — Client-Side Real-Time Feedback

The AlertPreferenceForm component displays warning messages in real-time as users adjust
values, without waiting for a save attempt. These warnings update reactively via form
watch subscriptions.

### Inline Warning 1 — Short Cooldown
**Trigger:** `watchedValues.globalCooldownMinutes < 30`
**Message:** "Cooldowns under 30 minutes may cause alert fatigue. Consider using a longer
interval unless you need near-real-time notifications."
**Display:** Yellow warning banner below the cooldown input field.

### Inline Warning 2 — High Daily Cap
**Trigger:** `watchedValues.maxAlertsPerDay > 50`
**Message:** "Receiving more than 50 alerts per day may overwhelm your notification
channels. The recommended maximum is 20."
**Display:** Yellow warning banner below the maxAlertsPerDay input field.

### Inline Warning 3 — High Confidence Threshold
**Trigger:** `watchedValues.lowConfidence_threshold > 0.7`
**Message:** "A confidence threshold above 0.7 will flag data that most users would
consider acceptable. This may generate many unnecessary alerts."
**Display:** Yellow warning banner below the confidence slider.

### Inline Warning 4 — Low Decline Threshold
**Trigger:** `watchedValues.benchmarkDecline_threshold < 5`
**Message:** "A decline threshold below 5% is very sensitive and may trigger alerts from
normal statistical variation rather than genuine performance changes."
**Display:** Yellow warning banner below the decline threshold input.

All four inline warnings appear and disappear immediately as the user changes values.
They are purely advisory — the save button remains enabled regardless of warnings.

---

## 4. IN_APP Channel Always Enabled

The IN_APP notification channel is a system invariant that cannot be disabled:

**UI Layer:** The IN_APP row in the channel section shows a static "Always On" label
instead of a toggle switch. No click handler exists — the user has no mechanism to attempt
disabling it.

**Form Layer:** The form schema does not include a `channelInApp` field. The value is not
sent in the save payload because it is not configurable.

**Service Layer:** The alert dispatcher unconditionally includes `'IN_APP'` in the channel
list before checking user preferences for EMAIL and WEBHOOK:
```typescript
const channels: DispatchChannel[] = ['IN_APP'];
```

This three-layer enforcement ensures that users always receive in-app notifications for
triggered alerts, even if they have disabled all other channels.

---

## 5. Default Values — No-Record Behavior

When a user has never saved alert preferences (no `UserAlertPreference` record exists in
the database), both the settings UI and the alert service return identical defaults:

### Default Object

```typescript
{
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
  isDefault: true,
}
```

### Consistency Verification

The `isDefault: true` flag is set only in the API response — it is not stored in the
database. Its purpose is to let the UI show a "Using defaults" indicator.

The `DEFAULT_ALERT_PREFERENCES` constant in the alert service module was verified to match
the defaults returned by `getPreferences` field-by-field. Any future change to one must be
mirrored in the other. A shared constants file would be ideal but is not yet implemented
(tracked as a minor improvement item).

### Default Rationale

- All alert types enabled by default: new users receive full coverage out of the box
- EMAIL and WEBHOOK disabled by default: avoids sending external notifications until user
  explicitly opts in and provides configuration
- 60-minute cooldown: balances responsiveness with alert fatigue prevention
- 20 alerts per day: reasonable cap for most use cases
- Thresholds match the pre-fix hardcoded values: ensures behavioral continuity for existing
  users who upgrade to the preference-aware version

---

## 6. Edge Cases Verified

| Scenario                                    | Expected Behavior                          | Verified |
|---------------------------------------------|--------------------------------------------|----------|
| Save with all alert types disabled          | Accepted — user receives no alerts         | Yes      |
| Save with cooldown = 5 (minimum)            | Accepted with server warning               | Yes      |
| Save with maxAlertsPerDay = 200 (maximum)   | Accepted with server warning               | Yes      |
| Save with invalid webhook URL               | Rejected by Zod validation                 | Yes      |
| Save with webhook enabled, empty URL        | Accepted with server warning               | Yes      |
| Concurrent saves from same user             | Last write wins (upsert semantics)         | Yes      |
| Delete user account                         | Cascade deletes preference record          | Yes      |
| API call without authentication             | Returns 401, no data exposed               | Yes      |

---

## Conclusion

The guardrail system operates at three complementary layers: hard validation (Zod rejects
invalid data), server warnings (flag risky-but-valid configurations), and inline warnings
(real-time feedback during editing). The IN_APP channel invariant is enforced at UI, form,
and service layers. Default values are consistent between the settings API and the alert
service runtime. All edge cases behave as expected.
