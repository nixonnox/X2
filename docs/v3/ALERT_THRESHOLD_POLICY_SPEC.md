# Alert Threshold Policy Spec

## Overview

This document defines the default thresholds, validation ranges, server-side guardrail warnings,
and database model for user alert preferences. These policies govern when alerts are triggered
and how the system constrains user-configurable values.

---

## Default Thresholds

Applied when a user has no saved preference record (first visit or record deleted).

| Alert Type              | Field                        | Default Value | Meaning                                      |
| ----------------------- | ---------------------------- | ------------- | -------------------------------------------- |
| WARNING_SPIKE           | `warningSpike_minCount`      | 3             | Alert when 3+ warnings occur in window        |
| LOW_CONFIDENCE          | `lowConfidence_threshold`    | 0.4           | Alert when confidence score drops below 0.4   |
| BENCHMARK_DECLINE       | `benchmarkDecline_threshold` | 15            | Alert when benchmark drops by 15+ points      |
| PROVIDER_COVERAGE_LOW   | (hardcoded in service)       | 0.5           | Alert when provider coverage falls below 50%  |

## Default Guardrails

| Field                   | Default Value | Meaning                                  |
| ----------------------- | ------------- | ---------------------------------------- |
| `globalCooldownMinutes` | 60            | Minimum 60 minutes between alerts        |
| `maxAlertsPerDay`       | 20            | Maximum 20 alerts per user per day       |

---

## Validation Ranges

All values are validated both client-side (form input constraints) and server-side (zod schema).
Values outside these ranges are rejected with a validation error.

| Field                        | Min   | Max   | Step  | Type    |
| ---------------------------- | ----- | ----- | ----- | ------- |
| `warningSpike_minCount`      | 1     | 20    | 1     | integer |
| `lowConfidence_threshold`    | 0.1   | 0.9   | 0.05  | float   |
| `benchmarkDecline_threshold` | 5     | 50    | 1     | integer |
| `globalCooldownMinutes`      | 10    | 1440  | 10    | integer |
| `maxAlertsPerDay`            | 1     | 100   | 1     | integer |

### Zod Schema (Server-Side)

```ts
const savePreferencesInput = z.object({
  channelEmail:              z.boolean(),
  channelWebhook:            z.boolean(),
  webhookUrl:                z.string().max(500).optional(),
  enableWarningSpike:        z.boolean(),
  enableLowConfidence:       z.boolean(),
  enableBenchmarkDecline:    z.boolean(),
  enableProviderCoverageLow: z.boolean(),
  warningSpike_minCount:     z.number().int().min(1).max(20),
  lowConfidence_threshold:   z.number().min(0.1).max(0.9),
  benchmarkDecline_threshold:z.number().int().min(5).max(50),
  globalCooldownMinutes:     z.number().int().min(10).max(1440),
  maxAlertsPerDay:           z.number().int().min(1).max(100),
});
```

Values that pass validation but are in risky ranges trigger guardrail warnings (see below).

---

## Server-Side Guardrail Warnings

These are advisory warnings returned alongside a successful save response.
They do NOT prevent the save. The mutation response shape:

```ts
type SaveResult = {
  success: true;
  warnings: string[];
};
```

### Warning Rules

| Warning Key            | Condition                                       | Message (for logging)                        |
| ---------------------- | ----------------------------------------------- | -------------------------------------------- |
| `cooldown_too_short`   | `globalCooldownMinutes < 30`                    | Cooldown below 30 min may cause alert flood  |
| `max_alerts_too_high`  | `maxAlertsPerDay > 50`                          | High daily limit may cause alert fatigue     |
| `confidence_too_high`  | `lowConfidence_threshold > 0.7`                 | High threshold triggers on most analyses     |
| `decline_too_low`      | `benchmarkDecline_threshold < 5`                | Low decline threshold triggers on noise      |
| `webhook_no_url`       | `channelWebhook === true && !webhookUrl`        | Webhook enabled but no URL provided          |

### Warning Evaluation Logic

```ts
function evaluateGuardrails(input: SaveInput): string[] {
  const warnings: string[] = [];
  if (input.globalCooldownMinutes < 30)              warnings.push("cooldown_too_short");
  if (input.maxAlertsPerDay > 50)                    warnings.push("max_alerts_too_high");
  if (input.lowConfidence_threshold > 0.7)           warnings.push("confidence_too_high");
  if (input.benchmarkDecline_threshold < 5)          warnings.push("decline_too_low");
  if (input.channelWebhook && !input.webhookUrl)     warnings.push("webhook_no_url");
  return warnings;
}
```

---

## Database Model

### Prisma Schema: UserAlertPreference

```prisma
model UserAlertPreference {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Channels
  channelEmail    Boolean @default(false)
  channelWebhook  Boolean @default(false)
  webhookUrl      String? @db.VarChar(500)

  // Alert type toggles
  enableWarningSpike        Boolean @default(true)
  enableLowConfidence       Boolean @default(true)
  enableBenchmarkDecline    Boolean @default(true)
  enableProviderCoverageLow Boolean @default(true)

  // Thresholds
  warningSpike_minCount      Int   @default(3)
  lowConfidence_threshold    Float @default(0.4)
  benchmarkDecline_threshold Int   @default(15)

  // Rate limits
  globalCooldownMinutes Int @default(60)
  maxAlertsPerDay       Int @default(20)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId])
}
```

### User Relation

```prisma
model User {
  // ... existing fields
  alertPreference UserAlertPreference?
}
```

The `@@unique([userId])` constraint ensures one preference record per user.

---

## Upsert Pattern

### First Save (Create)

When a user saves preferences for the first time, no `UserAlertPreference` record exists.
The router uses `prisma.userAlertPreference.upsert()`:

```ts
await prisma.userAlertPreference.upsert({
  where: { userId: ctx.userId },
  create: { userId: ctx.userId, ...validatedInput },
  update: { ...validatedInput },
});
```

### Subsequent Saves (Update)

The same upsert handles subsequent saves. The `update` branch overwrites all fields.
Partial updates are not supported; the full form state is always sent.

---

## Default Response (No Record)

When `getPreferences` is called and no record exists, the router returns hardcoded defaults:

```ts
const DEFAULTS: PreferenceResponse = {
  channelEmail: false,
  channelWebhook: false,
  webhookUrl: "",
  enableWarningSpike: true,
  enableLowConfidence: true,
  enableBenchmarkDecline: true,
  enableProviderCoverageLow: true,
  warningSpike_minCount: 3,
  lowConfidence_threshold: 0.4,
  benchmarkDecline_threshold: 15,
  globalCooldownMinutes: 60,
  maxAlertsPerDay: 20,
  isDefault: true,
};
```

The `isDefault: true` flag tells the UI that these are system defaults, not user-saved values.
The UI may optionally display a subtle indicator ("기본값 사용 중") but behaves identically.

---

## Threshold Interaction with Alert Types

- If `enableWarningSpike` is `false`, the `warningSpike_minCount` threshold is irrelevant
  (no WARNING_SPIKE alerts are generated regardless of the count).
- Same applies to other type/threshold pairs.
- The UI greys out threshold inputs when the corresponding alert type is disabled.

---

## Future Considerations

- Per-project preference overrides (currently global per user only)
- Threshold recommendation engine based on historical alert frequency
- Admin-level minimum/maximum overrides to prevent abuse
