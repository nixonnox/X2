# Alert Preference Implementation Notes

## Overview

This document captures the implementation details, data flow, and known gaps for the
user alert preference system. It covers the Prisma model, tRPC router, page component,
and the data mapping between API flat fields and UI nested form state.

---

## 1. Prisma: UserAlertPreference Model

### Model Addition

The `UserAlertPreference` model is added to the Prisma schema in `packages/db/prisma/schema.prisma`.

Key characteristics:
- Primary key: `id` (cuid)
- Unique constraint: `@@unique([userId])` ensures one record per user
- Cascade delete: when a User is deleted, their preference is removed
- All threshold fields have `@default()` values matching the system defaults
- `webhookUrl` is nullable (`String?`) with max length 500

### User Relation

The `User` model gains an optional relation:

```prisma
alertPreference UserAlertPreference?
```

This is a one-to-one optional relation. A user may or may not have a saved preference.

### Migration

After adding the model, run:

```bash
npx prisma migrate dev --name add_user_alert_preference
```

No data migration is needed since the table is new and defaults handle missing records.

---

## 2. tRPC Router: alertPreference

Router location: `packages/api/src/router/alertPreference.ts`

### getPreferences (Query)

- Auth: requires authenticated user (`protectedProcedure`)
- Logic:
  1. Query `prisma.userAlertPreference.findUnique({ where: { userId } })`
  2. If record exists, return it with `isDefault: false`
  3. If no record, return hardcoded `DEFAULTS` object with `isDefault: true`
- Return type: flat object with all preference fields plus `isDefault` boolean

```ts
getPreferences: protectedProcedure.query(async ({ ctx }) => {
  const record = await ctx.db.userAlertPreference.findUnique({
    where: { userId: ctx.session.user.id },
  });
  if (record) {
    return { ...record, isDefault: false };
  }
  return { ...DEFAULTS, isDefault: true };
}),
```

### savePreferences (Mutation)

- Auth: requires authenticated user (`protectedProcedure`)
- Input: validated with zod schema (see ALERT_THRESHOLD_POLICY_SPEC.md)
- Logic:
  1. Validate input against zod schema (automatic via tRPC)
  2. Evaluate guardrail warnings with `evaluateGuardrails(input)`
  3. Upsert: `prisma.userAlertPreference.upsert({ where: { userId }, create, update })`
  4. Return `{ success: true, warnings: string[] }`

```ts
savePreferences: protectedProcedure
  .input(savePreferencesInput)
  .mutation(async ({ ctx, input }) => {
    const warnings = evaluateGuardrails(input);
    await ctx.db.userAlertPreference.upsert({
      where: { userId: ctx.session.user.id },
      create: { userId: ctx.session.user.id, ...input },
      update: { ...input },
    });
    return { success: true, warnings };
  }),
```

### Guardrail Warning Evaluator

Located in the same router file. Pure function, no DB access.
Returns an array of warning keys based on risky input combinations.
See ALERT_THRESHOLD_POLICY_SPEC.md for the full rule table.

---

## 3. Page Component

### File Location

`apps/web/src/app/[locale]/(app)/settings/notifications/page.tsx`

### Component Structure

```
NotificationsSettingsPage
  +-- PageHeader ("알림 설정")
  +-- <form onSubmit={handleSave}>
  |   +-- ChannelSection
  |   |   +-- InAppBadge (always on)
  |   |   +-- EmailToggle
  |   |   +-- WebhookToggle + WebhookUrlInput
  |   +-- AlertTypeSection
  |   |   +-- WarningSpike toggle
  |   |   +-- LowConfidence toggle
  |   |   +-- BenchmarkDecline toggle
  |   |   +-- ProviderCoverageLow toggle
  |   +-- ThresholdSection
  |   |   +-- warningSpike_minCount input
  |   |   +-- lowConfidence_threshold slider
  |   |   +-- benchmarkDecline_threshold input
  |   +-- LimitSection
  |       +-- globalCooldownMinutes input
  |       +-- maxAlertsPerDay input
  +-- StickyFooter
      +-- SaveButton (disabled when not dirty or loading)
```

### State Management

Uses `useState` for form state. No external state library (Zustand) for this page.

```ts
const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
const [initialSnapshot, setInitialSnapshot] = useState<FormState>(INITIAL_FORM_STATE);
```

Dirty detection: `JSON.stringify(formState) !== JSON.stringify(initialSnapshot)`

### tRPC Integration

```ts
const prefsQuery = trpc.alertPreference.getPreferences.useQuery();
const saveMutation = trpc.alertPreference.savePreferences.useMutation();
```

---

## 4. Data Mapping

### Why Flat vs Nested?

The API uses flat field names (`channelEmail`, `enableWarningSpike`, `warningSpike_minCount`)
because Prisma columns are flat and the zod schema validates them directly.

The UI uses nested form state (`channels.email`, `types.warningSpike`, `thresholds.warningSpike_minCount`)
because the form is organized into logical sections and nested state makes section rendering cleaner.

### Hydration: Flat API Response to Nested Form State

When `prefsQuery.data` arrives, the `hydrateForm` function maps flat fields to nested state:

```ts
function hydrateForm(data: PreferenceResponse): FormState {
  return {
    channels: {
      inApp: true,
      email: data.channelEmail,
      webhook: data.channelWebhook,
      webhookUrl: data.webhookUrl ?? "",
    },
    types: {
      warningSpike: data.enableWarningSpike,
      lowConfidence: data.enableLowConfidence,
      benchmarkDecline: data.enableBenchmarkDecline,
      providerCoverageLow: data.enableProviderCoverageLow,
    },
    thresholds: {
      warningSpike_minCount: data.warningSpike_minCount,
      lowConfidence_threshold: data.lowConfidence_threshold,
      benchmarkDecline_threshold: data.benchmarkDecline_threshold,
    },
    limits: {
      globalCooldownMinutes: data.globalCooldownMinutes,
      maxAlertsPerDay: data.maxAlertsPerDay,
    },
  };
}
```

Called in a `useEffect` when `prefsQuery.data` changes:

```ts
useEffect(() => {
  if (prefsQuery.data) {
    const hydrated = hydrateForm(prefsQuery.data);
    setFormState(hydrated);
    setInitialSnapshot(hydrated);
  }
}, [prefsQuery.data]);
```

### Save: Nested Form State to Flat API Input

When the user clicks Save, the `flattenForm` function converts back:

```ts
function flattenForm(state: FormState): SavePreferencesInput {
  return {
    channelEmail:              state.channels.email,
    channelWebhook:            state.channels.webhook,
    webhookUrl:                state.channels.webhookUrl || undefined,
    enableWarningSpike:        state.types.warningSpike,
    enableLowConfidence:       state.types.lowConfidence,
    enableBenchmarkDecline:    state.types.benchmarkDecline,
    enableProviderCoverageLow: state.types.providerCoverageLow,
    warningSpike_minCount:     state.thresholds.warningSpike_minCount,
    lowConfidence_threshold:   state.thresholds.lowConfidence_threshold,
    benchmarkDecline_threshold:state.thresholds.benchmarkDecline_threshold,
    globalCooldownMinutes:     state.limits.globalCooldownMinutes,
    maxAlertsPerDay:           state.limits.maxAlertsPerDay,
  };
}
```

### Round-Trip Integrity

`hydrateForm(flattenForm(state))` should equal `state` for any valid form state.
This invariant ensures no data loss during the flat/nested conversion cycle.

---

## 5. Save Flow

1. User modifies form fields
2. Inline guardrail warnings appear/disappear based on current values
3. User clicks Save
4. `flattenForm(formState)` produces the API input
5. `saveMutation.mutate(flatInput)` sends to server
6. Server validates with zod, evaluates guardrails, upserts record
7. Response: `{ success: true, warnings: [...] }`
8. On success: green toast "알림 설정이 저장되었습니다."
9. If `warnings.length > 0`: each warning shown as yellow toast
10. `prefsQuery.refetch()` to re-sync (updates `initialSnapshot`, clears dirty state)
11. On error: red toast with error message

---

## 6. Known Gaps

### Preferences Not Consumed by Alert Service

The `IntelligenceAlertService` currently uses hardcoded constants in its `COOLDOWNS` map
and does not read from `UserAlertPreference`. Integration requires:

- Injecting the preference repository into `IntelligenceAlertService`
- Replacing `COOLDOWNS[type]` lookups with user-specific threshold reads
- Falling back to system defaults when no preference record exists
- Caching preferences per user to avoid per-alert DB queries

### No Per-Project Preferences

Current design is global per user. All projects share the same thresholds and channel settings.
Future iteration may add a `projectId` column to `UserAlertPreference` with:

- `@@unique([userId, projectId])` constraint
- Null `projectId` for global defaults
- Project-specific overrides when `projectId` is set

### No Preference Change History

Changes to preferences are not audited. There is no `UserAlertPreferenceHistory` table.
If audit logging is needed later, options include:

- Separate history table with `changedAt`, `changedBy`, `previousValues` JSON
- Application-level event log via existing audit infrastructure

### Webhook Delivery Not Verified

The `webhookUrl` is stored but not validated for reachability at save time.
A future enhancement could send a test payload on save and display the result.

### Email Channel Assumes Verified Email

The `channelEmail` toggle does not check whether the user has a verified email address.
If the email is unverified, email alerts will silently fail at delivery time.
A UI enhancement could disable the toggle with a message linking to email verification.

---

## 7. Testing Notes

### Unit Tests

- `hydrateForm` and `flattenForm` round-trip property test
- `evaluateGuardrails` returns correct warnings for edge-case inputs
- Zod schema rejects out-of-range values

### Integration Tests

- `getPreferences` returns defaults for new user (no record)
- `savePreferences` creates record on first call
- `savePreferences` updates record on subsequent call
- `savePreferences` returns guardrail warnings for risky values
- Upsert is idempotent (save same values twice, record unchanged)

### E2E Tests

- Load page, verify default values shown
- Change a threshold, verify inline warning appears
- Save, verify success toast
- Reload page, verify saved values persist
