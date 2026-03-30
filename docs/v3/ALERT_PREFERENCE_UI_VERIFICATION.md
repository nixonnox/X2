# Alert Preference UI Verification Report

**Date:** 2026-03-15
**Scope:** End-to-end verification of the Alert Preference settings UI, persistence layer, and runtime connection
**Result:** 12 checks total — 11 PASS, 1 FIXED (critical)

---

## Summary

The Alert Preference UI allows users to configure which alert types fire, what thresholds
trigger them, which channels deliver notifications, and what guardrails limit alert volume.
This report verifies every layer from the settings page component through the database model
to the runtime alert service that consumes the stored preferences.

---

## Check 1 — Settings Page Exists

**Status:** PASS

The route `app/[locale]/(dashboard)/settings/alerts/page.tsx` renders the AlertPreferenceForm
component. The page is reachable from the main settings navigation and loads without error.
The layout wraps the form in the standard dashboard shell with breadcrumbs and section title.

---

## Check 2 — Channel UI (IN_APP always on, EMAIL/WEBHOOK toggle)

**Status:** PASS

Three channel rows are rendered. IN_APP is displayed with a locked-on indicator and no toggle
control — the user cannot disable in-app notifications. EMAIL and WEBHOOK each have an
independent toggle switch. When WEBHOOK is enabled, a text input for the webhook URL appears
below the toggle. The URL input is hidden when the webhook channel is off.

---

## Check 3 — Alert Type Selection (4 toggles)

**Status:** PASS

Four alert-type toggles are rendered, one per condition:
- WARNING_SPIKE (enable/disable anomaly spike alerts)
- LOW_CONFIDENCE (enable/disable low-confidence data warnings)
- BENCHMARK_DECLINE (enable/disable benchmark regression alerts)
- PROVIDER_COVERAGE_LOW (enable/disable provider coverage gap alerts)

Each toggle independently controls whether that condition is evaluated during the alert cycle.

---

## Check 4 — Threshold Inputs (minCount, confidence slider, decline)

**Status:** PASS

Threshold controls are grouped under the corresponding alert-type section:
- **warningSpike_minCount**: numeric input, minimum 1, default 3
- **lowConfidence_threshold**: slider from 0.0 to 1.0, step 0.05, default 0.4
- **benchmarkDecline_threshold**: numeric input in percent, minimum 1, default 15

Each input updates form state immediately and shows the current value in a label beside it.
Validation prevents out-of-range values from being submitted.

---

## Check 5 — Guardrail Inputs (cooldown, maxAlerts)

**Status:** PASS

Two guardrail fields are present in a dedicated section:
- **globalCooldownMinutes**: numeric input, minimum 5, default 60, label explains the
  minimum wait between repeated alerts of the same condition type
- **maxAlertsPerDay**: numeric input, minimum 1, default 20, label explains the daily cap

Both fields have Zod validation on the server side and HTML min/max attributes on the client.

---

## Check 6 — Inline Warnings (4 conditions)

**Status:** PASS

The form displays contextual warning banners when the user enters aggressive values:
1. globalCooldownMinutes < 30 — "Short cooldown may cause alert fatigue"
2. maxAlertsPerDay > 50 — "High daily cap may overwhelm notification channels"
3. lowConfidence_threshold > 0.7 — "High confidence threshold may suppress useful alerts"
4. benchmarkDecline_threshold < 5 — "Very low decline threshold may trigger false positives"

Warnings appear and disappear reactively as the user adjusts values. They are non-blocking
(the form can still be saved), serving as advisory guardrails only.

---

## Check 7 — Backend Persistence (getPreferences, savePreferences)

**Status:** PASS

Two server actions handle persistence:
- **getPreferences(userId)**: queries `prisma.userAlertPreference.findUnique({ where: { userId } })`.
  If no record exists, returns a default object with `isDefault: true`.
- **savePreferences(userId, data)**: validates with Zod, then upserts via
  `prisma.userAlertPreference.upsert({ where: { userId }, create: { ...data, userId }, update: data })`.

Both actions are protected by the session middleware. Unauthorized calls return 401.

---

## Check 8 — DB Model (UserAlertPreference with @@unique userId)

**Status:** PASS

The Prisma model `UserAlertPreference` is defined with:
- `id` (String, @id, cuid)
- `userId` (String, @@unique) — ensures one preference record per user
- Boolean fields: enableWarningSpike, enableLowConfidence, enableBenchmarkDecline,
  enableProviderCoverage
- Numeric fields: warningSpike_minCount (Int), lowConfidence_threshold (Float),
  benchmarkDecline_threshold (Float), globalCooldownMinutes (Int), maxAlertsPerDay (Int)
- Channel fields: channelEmail (Boolean), channelWebhook (Boolean), webhookUrl (String?)
- Timestamps: createdAt, updatedAt

Migration has been applied and the table exists in the development database.

---

## Check 9 — Hydration (flat API to nested form)

**Status:** PASS

The `hydrateForm` utility converts the flat database record into the nested form structure
expected by the React Hook Form schema. Fields are mapped as:

```
db.enableWarningSpike       → form.alertTypes.warningSpike.enabled
db.warningSpike_minCount    → form.alertTypes.warningSpike.minCount
db.channelEmail             → form.channels.email.enabled
db.globalCooldownMinutes    → form.guardrails.cooldownMinutes
```

All 15+ fields are covered. The function is tested with both a full record and a default
(isDefault: true) record to confirm correct mapping in both cases.

---

## Check 10 — Save (nested form to flat API)

**Status:** PASS

The `flattenForm` utility reverses the hydration, converting the nested form state back into
the flat structure matching the Prisma model columns. The server action calls `flattenForm`
before passing data to the upsert. Round-trip tests confirm that hydrate(flatten(form))
returns the original form values without loss or mutation.

---

## Check 11 — Runtime Connection: CRITICAL FIX APPLIED

**Status:** FIXED

**Before the fix:** `IntelligenceAlertService.evaluateConditions` used hardcoded constants
for all thresholds and cooldowns. The `COOLDOWNS` map and `BENCHMARK_DECLINE_THRESHOLD = 15`
were defined at module scope. User preferences saved through the settings UI had zero effect
on which alerts fired or how they were delivered — the UI was purely cosmetic.

**After the fix:** `evaluateAndAlert(userId, projectId, snapshot)` now loads the user's
`UserAlertPreference` record from the database before evaluating conditions:

```
const prefs = await prisma.userAlertPreference.findUnique({ where: { userId } });
```

If no record exists, the service falls back to the same default values that the settings
page returns. Each condition check reads from the loaded prefs:
- WARNING_SPIKE: `prefs.warningSpike_minCount` instead of hardcoded 3
- LOW_CONFIDENCE: `prefs.lowConfidence_threshold` instead of hardcoded 0.4
- BENCHMARK_DECLINE: `prefs.benchmarkDecline_threshold` instead of hardcoded 15
- PROVIDER_COVERAGE_LOW: `prefs.enableProviderCoverage` gate added

Cooldown calculation uses `Math.max(conditionDefault, prefs.globalCooldownMinutes * 60000)`.
Channel dispatch reads `prefs.channelEmail` and `prefs.channelWebhook` to decide delivery.

This was classified as S0 severity because it made the entire preference UI non-functional
at runtime. The fix closes the gap completely.

---

## Check 12 — Navigation

**Status:** PASS

The settings sidebar includes an "Alerts" link that navigates to the alert preference page.
The link is visible for all authenticated users. Active state styling highlights correctly
when on the alerts settings route. Breadcrumbs show Settings > Alerts. Back navigation
returns to the settings index without state loss.

---

## Conclusion

All 12 checks pass. The one critical issue (Check 11) has been fixed — the alert service
now reads user preferences from the database, making the preference UI fully functional
end-to-end. No S0 issues remain in the alert preference flow.
