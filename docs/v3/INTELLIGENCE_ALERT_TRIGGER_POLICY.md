# Intelligence Alert Trigger Policy

> Documents the `IntelligenceAlertService` that evaluates analysis results and triggers notifications when significant changes are detected.

**Source:** `packages/api/src/services/intelligence/intelligence-alert.service.ts`

---

## 1. Service Overview

`IntelligenceAlertService` is instantiated with a Prisma client and exposes a single public method:

```ts
class IntelligenceAlertService {
  constructor(private readonly prisma: any) {}

  async evaluateAndAlert(params: EvaluateAndAlertParams): Promise<{ alertsTriggered: string[] }>
}
```

The service is called from the `intelligence.analyze` mutation in `packages/api/src/routers/intelligence.ts` (lines 287-307), wrapped in a non-blocking try-catch so that alert evaluation failure never blocks the analysis response.

```ts
// intelligence.ts — after persistence (step 7)
let alertsTriggered: string[] = [];
try {
  const alertService = new IntelligenceAlertService(ctx.db as any);
  const alertResult = await alertService.evaluateAndAlert({
    projectId: input.projectId,
    userId: ctx.userId,
    seedKeyword: input.seedKeyword,
    industryType,
    currentResult: {
      confidence,
      isPartial: metadata.isPartial,
      warnings: fusionResult.additionalWarnings,
      benchmarkComparison: intel.benchmarkComparison as any,
      signalQuality: fusionResult.signalQuality,
    },
  });
  alertsTriggered = alertResult.alertsTriggered;
} catch {
  // Alert evaluation failure should not block response
}
```

The `alertsTriggered` array is included in the mutation response under `metadata.alertsTriggered`.

---

## 2. Input Parameters

```ts
type EvaluateAndAlertParams = {
  projectId: string;
  userId: string;
  seedKeyword: string;
  industryType: string;
  currentResult: {
    confidence: number;
    isPartial: boolean;
    warnings: string[];
    benchmarkComparison?: { overallScore: number; warnings: string[] } | null;
    signalQuality: { overallRichness: string };
  };
};
```

| Field                  | Source in Router                          |
|------------------------|-------------------------------------------|
| `projectId`            | `input.projectId`                        |
| `userId`               | `ctx.userId`                             |
| `seedKeyword`          | `input.seedKeyword`                      |
| `industryType`         | Resolved industry type                   |
| `confidence`           | Derived from `overallRichness`           |
| `isPartial`            | `!hasClusterData \|\| !hasSocialData`    |
| `warnings`             | `fusionResult.additionalWarnings`        |
| `benchmarkComparison`  | From signal fusion benchmark comparison  |
| `signalQuality`        | `fusionResult.signalQuality`             |

---

## 3. Alert Conditions

Four alert conditions are evaluated in `evaluateConditions()`. Each condition produces an `AlertConditionResult`:

```ts
type AlertConditionResult = {
  type: IntelligenceAlertType;
  severity: AlertSeverity;
  message: string;
  cooldownMs: number;
};
```

### 3.1 WARNING_SPIKE

| Property   | Value                                                     |
|------------|-----------------------------------------------------------|
| Type       | `WARNING_SPIKE`                                           |
| Severity   | `HIGH`                                                    |
| Cooldown   | 1 hour (3,600,000 ms)                                    |
| Condition  | `warnings.length >= 3` AND `warnings.length > prevCount` |

**Logic:**
1. Check if current analysis has 3 or more warnings.
2. Fetch the previous analysis run (skip 1 from latest, ordered by `analyzedAt desc`).
3. Compare current warning count against `previousRun.additionalWarnings.length`.
4. Alert only fires if the count increased.

```ts
if (current.warnings.length >= 3) {
  const prevWarningCount = previousRun?.additionalWarnings?.length ?? 0;
  if (current.warnings.length > prevWarningCount) {
    // trigger WARNING_SPIKE
  }
}
```

**Message format:** `'${keyword}' 분석에서 경고가 ${count}개로 증가했습니다`

### 3.2 LOW_CONFIDENCE

| Property   | Value                                           |
|------------|-------------------------------------------------|
| Type       | `LOW_CONFIDENCE`                                |
| Severity   | `NORMAL`                                        |
| Cooldown   | 24 hours (86,400,000 ms)                        |
| Condition  | `confidence < 0.4`                              |

**Logic:** Simple threshold check on the computed confidence value.

```ts
if (current.confidence < 0.4) {
  // trigger LOW_CONFIDENCE
}
```

**Message format:** `'${keyword}' 분석 신뢰도가 낮습니다 (${confidence})`

### 3.3 BENCHMARK_DECLINE

| Property   | Value                                                              |
|------------|--------------------------------------------------------------------|
| Type       | `BENCHMARK_DECLINE`                                                |
| Severity   | `HIGH`                                                             |
| Cooldown   | 24 hours (86,400,000 ms)                                          |
| Condition  | `prevScore - currentScore >= 15` (BENCHMARK_DECLINE_THRESHOLD)     |

**Logic:**
1. Both current and previous runs must have `benchmarkComparison` data.
2. Extract `overallScore` from both.
3. Alert if the score dropped by 15 or more points.

```ts
if (prevScore - currentScore >= BENCHMARK_DECLINE_THRESHOLD) {
  // trigger BENCHMARK_DECLINE
}
```

**Message format:** `'${keyword}' 벤치마크 점수가 ${prevScore}에서 ${currentScore}로 하락했습니다`

### 3.4 PROVIDER_COVERAGE_LOW

| Property   | Value                                           |
|------------|-------------------------------------------------|
| Type       | `PROVIDER_COVERAGE_LOW`                         |
| Severity   | `NORMAL`                                        |
| Cooldown   | 6 hours (21,600,000 ms)                         |
| Condition  | `isPartial === true` AND `confidence < 0.5`     |

**Logic:** Detects when social provider connections are incomplete and the resulting confidence is low.

```ts
if (current.isPartial && current.confidence < 0.5) {
  // trigger PROVIDER_COVERAGE_LOW
}
```

**Message:** `"소셜 provider 연결이 부분적입니다. 데이터 정확도가 낮을 수 있습니다."`

---

## 4. Cooldown Summary Table

| Alert Type              | Severity | Cooldown  | Condition Summary                          |
|-------------------------|----------|-----------|---------------------------------------------|
| `WARNING_SPIKE`         | HIGH     | 1 hour    | 3+ warnings, count increased from previous  |
| `LOW_CONFIDENCE`        | NORMAL   | 24 hours  | confidence < 0.4                            |
| `BENCHMARK_DECLINE`     | HIGH     | 24 hours  | overallScore dropped 15+ points             |
| `PROVIDER_COVERAGE_LOW` | NORMAL   | 6 hours   | isPartial AND confidence < 0.5              |

---

## 5. Deduplication Mechanism

Before creating a notification for any triggered condition, the service checks whether a recent notification with the same `sourceId` already exists within the cooldown window.

### Source Identification

| Field        | Value                                        |
|--------------|----------------------------------------------|
| `sourceType` | `"intelligence_alert"` (constant)            |
| `sourceId`   | `"{alertType}:{keyword}"` (e.g. `"WARNING_SPIKE:스킨케어"`) |

### Cooldown Check Implementation

```ts
private async isWithinCooldown(sourceId: string, cooldownMs: number): Promise<boolean> {
  const cooldownStart = new Date(Date.now() - cooldownMs);

  const recent = await this.prisma.notification.findFirst({
    where: {
      sourceType: "intelligence_alert",
      sourceId,
      createdAt: { gte: cooldownStart },
    },
    orderBy: { createdAt: "desc" },
  });

  return recent != null;
}
```

The query uses the `Notification` model's `@@index([userId, createdAt])` index. It filters by:
- `sourceType = "intelligence_alert"`
- `sourceId` = the specific alert type + keyword combination
- `createdAt >= now() - cooldownMs`

If any such notification exists, the alert is skipped.

---

## 6. Previous Run Retrieval

The previous run is fetched once per `evaluateAndAlert` call:

```ts
const previousRun = await this.prisma.intelligenceAnalysisRun.findFirst({
  where: { projectId, seedKeyword },
  orderBy: { analyzedAt: "desc" },
  skip: 1,  // skip the current (most recent) run
});
```

This relies on the current run already being persisted (step 6 in the router) before the alert service is called (step 7). Since persistence and alert evaluation are sequential in the router, this ordering is guaranteed.

---

## 7. Notification Creation

When an alert passes both the condition check and the cooldown check:

```ts
await this.prisma.notification.create({
  data: {
    id: randomBytes(12).toString("hex"),   // 24-char hex ID
    userId: params.userId,
    type: "SYSTEM_ALERT",                  // NotificationType enum
    title: `Intelligence Alert: ${params.type}`,
    message: params.message,
    priority: params.severity === "HIGH" ? "HIGH" : "NORMAL",
    sourceType: "intelligence_alert",
    sourceId: params.sourceId,
    actionUrl: `/intelligence?keyword=${encodeURIComponent(params.keyword)}`,
    channels: ["IN_APP"],
    isRead: false,
  },
});
```

| Notification Field | Value                                                  |
|--------------------|--------------------------------------------------------|
| `id`               | `randomBytes(12).toString("hex")` (24 hex chars)      |
| `type`             | `SYSTEM_ALERT`                                         |
| `priority`         | `HIGH` if severity is HIGH, else `NORMAL`              |
| `sourceType`       | `"intelligence_alert"`                                 |
| `sourceId`         | `"{alertType}:{keyword}"`                              |
| `actionUrl`        | `/intelligence?keyword={encoded_keyword}`              |
| `channels`         | `["IN_APP"]`                                           |
| `isRead`           | `false`                                                |

---

## 8. Execution Flow

```
intelligence.analyze mutation
  |
  +-- Step 6: IntelligencePersistenceService.saveAnalysisRun()
  |
  +-- Step 7: IntelligenceAlertService.evaluateAndAlert()
        |
        +-- Fetch previous run (skip 1)
        +-- Evaluate 4 conditions
        +-- For each triggered condition:
        |     +-- Check cooldown (findFirst with createdAt filter)
        |     +-- If not within cooldown: create Notification
        |     +-- Push alert type to alertsTriggered[]
        |
        +-- Return { alertsTriggered }
  |
  +-- Include alertsTriggered in response metadata
```

---

## 9. Design Notes

- The service uses direct Prisma calls rather than a repository pattern, matching the approach used by `IntelligencePersistenceService`.
- The constructor accepts `any` type for the Prisma client to avoid tight coupling with the generated Prisma types.
- Alert evaluation is deliberately non-blocking: the try-catch in the router ensures the analysis response is always returned even if alerting fails.
- The `BENCHMARK_DECLINE_THRESHOLD` constant (15) is not configurable at runtime.
