# Alert Preference Gap List

**Date:** 2026-03-15
**Scope:** Remaining gaps in the Alert Preference system after the critical runtime fix
**Result:** 0 S0, 0 S1, 2 S2, 3 S3

---

## FIXED — Previously S0

### GAP-F1: IntelligenceAlertService Ignores UserAlertPreference

**Severity:** S0 (was) → FIXED
**Component:** IntelligenceAlertService.evaluateAndAlert
**Date Fixed:** 2026-03-15

**Problem:** The alert service used hardcoded constants for all threshold values, cooldown
durations, and channel routing. The `evaluateConditions` function accepted only a data
snapshot parameter and never queried the `UserAlertPreference` table. Users could configure
preferences through the settings UI, and those preferences were correctly persisted to the
database, but the runtime evaluation path had no awareness of them whatsoever.

This meant:
- Threshold changes had no effect (spike minCount was always 3, confidence was always 0.4,
  decline was always 15%)
- Disabling alert types had no effect (all four conditions were always evaluated)
- Channel preferences had no effect (dispatch used env-var availability, not user prefs)
- Cooldown settings had no effect (per-condition hardcoded values were always used)

The entire Alert Preference UI was functionally cosmetic — a settings page that saved data
no runtime component ever read.

**Fix Applied:**
1. `evaluateAndAlert` now calls `prisma.userAlertPreference.findUnique({ where: { userId } })`
   at the start of every evaluation cycle
2. Falls back to `DEFAULT_ALERT_PREFERENCES` when no record exists (matches settings API defaults)
3. `evaluateConditions` signature extended to accept a `UserAlertPrefs` parameter
4. Each condition checks its `enable*` flag before evaluating
5. Each threshold reads from the prefs object instead of module-level constants
6. Cooldown uses `Math.max(conditionDefault, prefs.globalCooldownMinutes * 60000)`
7. Channel dispatch reads `prefs.channelEmail` and `prefs.channelWebhook`
8. IN_APP remains unconditionally included in dispatch

**Verification:** See ALERT_THRESHOLD_RUNTIME_VERIFICATION.md for complete before/after
comparison of every affected code path.

**No remaining S0 issues.**

---

## No S1 Issues

There are currently no severity-1 gaps in the Alert Preference system. The critical runtime
fix addressed the only path where user intent was silently ignored. All remaining gaps are
enhancement-level items that do not cause incorrect behavior — they represent missing
features rather than broken features.

---

## S2 — Moderate Gaps (2)

### GAP-S2-1: No Per-Project Preferences

**Severity:** S2
**Component:** UserAlertPreference model, settings UI
**Impact:** Medium — multi-project users cannot customize thresholds per project

**Description:** The `UserAlertPreference` model is keyed by `userId` alone with a
`@@unique(userId)` constraint. This means all alert preferences are user-global: the same
thresholds, enabled types, channels, and guardrails apply to every project the user has
access to.

For users managing a single project this is adequate. For users managing multiple projects
with different characteristics (e.g., a high-volume social account and a low-volume
corporate account), the inability to set per-project thresholds may cause either:
- Over-alerting on the low-volume project (thresholds tuned for high volume)
- Under-alerting on the high-volume project (thresholds tuned for low volume)

**Potential Fix:** Add an optional `projectId` field to the model and change the unique
constraint to `@@unique([userId, projectId])`. The settings UI would need a project
selector. The alert service would need to query with both userId and projectId, falling
back to the user-global record if no project-specific record exists.

**Workaround:** Users can set middle-ground thresholds that work acceptably across projects.

---

### GAP-S2-2: Channel Preferences Not Verified at Delivery Time

**Severity:** S2
**Component:** Alert dispatcher, email/webhook delivery
**Impact:** Medium — channel availability depends on env vars, not just user prefs

**Description:** When the alert service builds the channel list from user preferences, it
correctly reads `prefs.channelEmail` and `prefs.channelWebhook`. However, the actual
delivery functions for EMAIL and WEBHOOK perform their own availability checks based on
environment variables:

- EMAIL delivery checks for `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` env vars
- WEBHOOK delivery checks for a valid URL but does not validate connectivity

This creates a potential inconsistency: a user enables email delivery in preferences, but
the system does not have SMTP configured. The alert service includes EMAIL in the channel
list, the dispatcher attempts email delivery, and it silently fails (logged as a warning
but not surfaced to the user).

The user sees their preference saved as "Email: enabled" but never receives email alerts.
There is no feedback mechanism to inform the user that the email channel is unavailable at
the system level.

**Potential Fix:** The settings API should check system-level channel availability and
return it alongside user preferences. The UI could show "Email: not available (system not
configured)" and disable the toggle when SMTP is not set up. Alternatively, a health check
endpoint could report available channels.

**Workaround:** System administrators must ensure SMTP and webhook infrastructure is
configured before users enable those channels. Documentation should note this dependency.

---

## S3 — Minor Gaps (3)

### GAP-S3-1: No Preference Change History / Audit Log

**Severity:** S3
**Component:** UserAlertPreference persistence
**Impact:** Low — no traceability for threshold changes

**Description:** The `UserAlertPreference` model tracks only `createdAt` and `updatedAt`
timestamps. There is no history table or audit log that records what was changed, by whom,
and when. If a user changes their decline threshold from 15% to 5% and starts receiving
many alerts, there is no system-level record of when the change was made.

This makes debugging and support more difficult. If an administrator investigates why a
user is receiving excessive alerts, they can see the current preferences but not whether
those preferences were recently changed.

**Potential Fix:** Add a `UserAlertPreferenceHistory` model that stores a snapshot of the
preference record on each update, with a timestamp and optional change reason. The
`savePreferences` action would create a history record before or after the upsert.

**Workaround:** The `updatedAt` field indicates when preferences were last changed, but
not what was changed or what the previous values were. Application logs may contain some
information depending on log level configuration.

---

### GAP-S3-2: Webhook URL Not Tested on Save

**Severity:** S3
**Component:** savePreferences server action
**Impact:** Low — invalid webhook URLs are accepted silently

**Description:** When a user saves preferences with a webhook URL, the Zod schema validates
that the URL has valid syntax (protocol, host, etc.) but does not perform any connectivity
test. A user could save `https://example.com/nonexistent-webhook` and the system would
accept it without verifying that the endpoint exists or responds correctly.

The first indication that the webhook URL is invalid would be a failed delivery attempt
when an alert actually fires. Depending on the retry policy and logging configuration, this
failure might not be immediately visible to the user.

**Potential Fix:** Add a "Test Webhook" button in the settings UI that sends a test payload
to the configured URL and reports success or failure. This would be a client-initiated
action, not part of the save flow, to avoid blocking saves on network latency. The test
payload could be a standardized ping event that webhook receivers can distinguish from
real alerts.

**Workaround:** Users should manually verify their webhook endpoint is accessible and
correctly configured before enabling webhook delivery. Testing with a tool like curl or
Postman against the URL can confirm basic connectivity.

---

### GAP-S3-3: maxAlertsPerDay Not Enforced in Alert Service

**Severity:** S3
**Component:** IntelligenceAlertService.evaluateAndAlert
**Impact:** Low — daily cap preference is saved but not runtime-enforced

**Description:** The `maxAlertsPerDay` field is included in the preference model, validated
by Zod, persisted to the database, and displayed in the settings UI. However, the alert
service does not currently count how many alerts have been sent to a user in the current
day or compare that count against the configured maximum.

The cooldown mechanism provides indirect volume control (a 60-minute cooldown naturally
limits to ~24 alerts per day per condition type), but it is not the same as a hard daily
cap. A user with a 5-minute cooldown and all four condition types active could theoretically
receive up to `4 * 288 = 1152` alerts per day, far exceeding any reasonable maxAlertsPerDay
setting.

**Potential Fix:** Add a daily counter to the alert service, keyed by userId and date. Before
dispatching an alert, check:
```typescript
const todayCount = await prisma.alertLog.count({
  where: {
    userId,
    createdAt: { gte: startOfDay(new Date()) },
  },
});
if (todayCount >= effectivePrefs.maxAlertsPerDay) {
  return { suppressed: true, reason: 'daily_cap_reached' };
}
```
This requires that fired alerts are logged to a table (which may already exist for history
purposes). The counter should be efficient — an index on `(userId, createdAt)` would make
the count query fast.

**Workaround:** The cooldown mechanism provides the primary volume control. Users concerned
about alert volume should set longer cooldowns rather than relying on maxAlertsPerDay.

---

## Summary Table

| ID       | Severity | Title                                          | Status  |
|----------|----------|------------------------------------------------|---------|
| GAP-F1   | S0       | Alert service ignores UserAlertPreference       | FIXED   |
| GAP-S2-1 | S2       | No per-project preferences                      | Open    |
| GAP-S2-2 | S2       | Channel prefs not verified at delivery time     | Open    |
| GAP-S3-1 | S3       | No preference change history / audit log        | Open    |
| GAP-S3-2 | S3       | Webhook URL not tested on save                  | Open    |
| GAP-S3-3 | S3       | maxAlertsPerDay not enforced in alert service   | Open    |

---

## Priority Recommendation

The S2 items should be addressed before public launch if multi-project users are a target
audience (GAP-S2-1) or if email/webhook channels are marketed as supported features
(GAP-S2-2). The S3 items are quality-of-life improvements that can be scheduled for a
post-launch iteration without risk to core functionality.

The critical fix (GAP-F1) has fully resolved the only issue where user preferences were
silently ignored at runtime. The Alert Preference system is now functionally complete for
single-project, in-app notification use cases.
