# Intelligence Entry & Alert Implementation Notes

> Technical notes on dashboard changes, router integration, alert service internals, and known gaps introduced in this implementation phase.

---

## 1. Dashboard Changes

### 1.1 IntelligenceSummaryCard in dashboard-view.tsx

**File:** `apps/web/src/app/(dashboard)/dashboard/dashboard-view.tsx` (lines 477-613)

The `IntelligenceSummaryCard` function component was added as an inline component within `dashboard-view.tsx`, not extracted into a separate file.

**Placement in render tree:**

```tsx
{/* 4.5 Intelligence 인사이트 */}
<IntelligenceSummaryCard />
```

It renders between `<SearchIntelligenceStatusBar />` and the "오늘의 핵심 발견" section. It is rendered unconditionally (not gated by `hasChannels`).

### 1.2 Data Fetching

```ts
const { projectId } = useCurrentProject();
const keywordsQuery = trpc.intelligence.keywords.useQuery(
  { projectId: projectId ?? "", filter: "all", limit: 3 },
  { enabled: !!projectId },
);
```

| Parameter   | Value   | Rationale                                 |
|-------------|---------|-------------------------------------------|
| `filter`    | `"all"` | Show both saved and recent keywords       |
| `limit`     | `3`     | Dashboard shows a compact summary only    |
| `enabled`   | `!!projectId` | Prevent query when project not selected |

### 1.3 Imports Added to dashboard-view.tsx

```ts
import { Brain, GitCompareArrows } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "@/hooks/use-current-project";
```

These were added to the existing import block alongside other lucide icons and shared components.

### 1.4 Warning Count Computation

The warning count is derived client-side from the keyword list:

```ts
const warningCount = keywords.filter(
  (k: any) =>
    k.lastSignalHint?.toLowerCase().includes("warning") ||
    k.lastSignalHint?.toLowerCase().includes("risk") ||
    (k.lastConfidence != null && k.lastConfidence < 0.4),
).length;
```

**Fragility note:** This relies on substring matching against `lastSignalHint`. If the signal hint text format changes (e.g., from `"warning"` to `"caution"`), the dashboard card will not detect those warnings. A more robust approach would use an enum or structured field.

---

## 2. Router Changes

### 2.1 Import Addition

**File:** `packages/api/src/routers/intelligence.ts` (line 15-16)

```ts
import {
  IntelligenceAlertService,
} from "../services/intelligence/intelligence-alert.service";
```

### 2.2 Alert Evaluation in analyze Mutation

After persistence (step 6), a new step 7 was added (lines 287-307):

```ts
// 7. Evaluate alerts (non-blocking)
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

**Key design decisions:**
- `IntelligenceAlertService` is instantiated per request (not a singleton) since it holds a Prisma reference.
- The empty `catch` block is intentional: alerting is secondary to the analysis response.
- `ctx.db as any` cast is used to avoid importing Prisma generated types into the alert service.

### 2.3 Response Metadata Extension

The `alertsTriggered` array is included in the response:

```ts
return {
  // ... existing fields ...
  metadata: {
    ...metadata,
    savedRunId,
    alertsTriggered,  // NEW: string[] of triggered alert type names
  },
};
```

**Response metadata shape:**

| Field              | Type       | Description                                       |
|--------------------|------------|---------------------------------------------------|
| `confidence`       | `number`   | 0.4 / 0.65 / 0.85 based on signal richness       |
| `freshness`        | `string`   | Always `"fresh"` for live analysis                |
| `isPartial`        | `boolean`  | True if cluster or social data is missing         |
| `isMockOnly`       | `boolean`  | True if no cluster and no social data provided    |
| `isStaleBased`     | `boolean`  | Always `false` for live analysis                  |
| `savedRunId`       | `string \| null` | ID of the persisted analysis run            |
| `alertsTriggered`  | `string[]` | Alert types that fired (e.g., `["LOW_CONFIDENCE"]`) |

---

## 3. Alert Service Internals

### 3.1 Architecture Pattern

The `IntelligenceAlertService` follows the same architectural pattern as `IntelligencePersistenceService`:

| Aspect              | Approach                                                |
|---------------------|---------------------------------------------------------|
| DB access           | Direct Prisma calls (not repository pattern)            |
| Constructor         | Receives `prisma: any` (no typed client)                |
| Error handling      | Caller wraps in try-catch (service itself throws)       |
| State               | Stateless (no instance caching)                         |
| ID generation       | `randomBytes(12).toString("hex")` from Node's `crypto` |

### 3.2 Cooldown Implementation

The cooldown uses a `findFirst` query with a computed date threshold:

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

**Performance note:** This query scans the `Notification` table filtered by `sourceType` and `sourceId`. There is no dedicated composite index on `(sourceType, sourceId, createdAt)`. For high-volume usage, this could become a bottleneck.

### 3.3 Previous Run Lookup

```ts
const previousRun = await this.prisma.intelligenceAnalysisRun.findFirst({
  where: { projectId, seedKeyword },
  orderBy: { analyzedAt: "desc" },
  skip: 1,
});
```

The `skip: 1` ensures we compare against the run before the current one. This works because:
1. Step 6 (persistence) runs before step 7 (alerts) in the router.
2. The current run is already saved when this query executes.
3. `orderBy: analyzedAt desc` puts the current run first, and `skip: 1` gets the previous.

### 3.4 Condition Independence

All four conditions are evaluated independently. Multiple alerts can fire from a single analysis. For example, an analysis with low confidence AND partial provider coverage could trigger both `LOW_CONFIDENCE` and `PROVIDER_COVERAGE_LOW`.

---

## 4. Relationship: IntelligenceSummaryCard vs IntelligenceSummaryCards

There are two similarly named components that serve different purposes:

| Component                   | File                                                              | Purpose                    |
|-----------------------------|-------------------------------------------------------------------|----------------------------|
| `IntelligenceSummaryCard`   | `dashboard-view.tsx` (inline)                                     | Dashboard entry point card |
| `IntelligenceSummaryCards`  | `components/intelligence/IntelligenceSummaryCards.tsx`             | Intelligence Hub detail cards |

The plural `IntelligenceSummaryCards` component receives full analysis result props (signal quality, taxonomy, benchmark, social, fusion counts, metadata) and renders:
- Signal quality indicator bar (RICH/MODERATE/MINIMAL)
- Four mini-cards (taxonomy coverage, benchmark score, social signals, fusion output)
- Confidence progress bar with badges
- Expandable benchmark highlights/warnings

---

## 5. Data Flow Diagram

```
User clicks "분석 시작" on dashboard
  |
  v
Navigate to /intelligence
  |
  v
User enters keyword + runs analysis
  |
  v
intelligence.analyze mutation
  |
  +--[1] Industry suggestion
  +--[2] Auto metrics from clusters
  +--[3] Signal Fusion
  +--[4] Benchmark baseline
  +--[5] Template label
  +--[6] Persist to IntelligenceAnalysisRun  ----+
  +--[7] Alert evaluation                        |
  |     |                                        |
  |     +-- Fetch previous run (uses step 6)  <--+
  |     +-- Evaluate 4 conditions
  |     +-- Check cooldowns (query Notification table)
  |     +-- Create Notification records
  |     +-- Return alertsTriggered[]
  |
  v
Response includes metadata.alertsTriggered
  |
  v
Dashboard re-fetches intelligence.keywords
  → IntelligenceSummaryCard updates
  → Warning dots and count refresh
```

---

## 6. Known Gaps and Future Work

### 6.1 Missing UI Components

| Gap                          | Description                                                           | Priority  |
|------------------------------|-----------------------------------------------------------------------|-----------|
| Bell dropdown                | Top-bar bell icon has no dropdown/popover to show notifications       | HIGH      |
| Alert history UI             | No dedicated page to view/filter intelligence alert history           | MEDIUM    |
| Alert configuration UI       | Users cannot configure thresholds or enable/disable alert types       | MEDIUM    |
| Notification badge count     | Bell icon does not show unread count badge                            | HIGH      |

### 6.2 Missing Delivery Channels

| Channel   | Status | Required Work                                                      |
|-----------|--------|--------------------------------------------------------------------|
| EMAIL     | TODO   | Email service integration, templates, user preferences             |
| WEBHOOK   | TODO   | Endpoint configuration, payload schema, retry logic, signing       |

### 6.3 Technical Debt

| Item                              | Description                                                                     |
|-----------------------------------|---------------------------------------------------------------------------------|
| Warning count fragility           | Dashboard warning detection uses string matching on `lastSignalHint` text       |
| No cooldown index                 | `(sourceType, sourceId, createdAt)` composite index missing                     |
| `any` type casts                  | Prisma client and keyword data use `any` types throughout                       |
| No alert type enum in schema      | Alert types are plain strings, not enforced by Prisma enum                      |
| Per-request instantiation         | `IntelligenceAlertService` is created per mutation call                         |
| No batch alert processing         | Each condition runs its own cooldown query; could be batched                    |

### 6.4 Confidence Value Mapping

The confidence value used for alert evaluation is derived from signal richness, not from a nuanced calculation:

| `overallRichness` | Confidence |
|-------------------|------------|
| `RICH`            | `0.85`     |
| `MODERATE`        | `0.65`     |
| `MINIMAL`         | `0.40`     |

This means `LOW_CONFIDENCE` alerts (threshold `< 0.4`) will never fire for `MINIMAL` richness (which produces exactly `0.4`). Only scenarios where the confidence might be set below `0.4` through other paths would trigger this alert. This is a potential logic gap.

### 6.5 Testing Considerations

- Alert service has no unit tests yet.
- Cooldown behavior is time-dependent; tests should mock `Date.now()`.
- The `skip: 1` previous-run lookup assumes persistence always succeeds before alert evaluation.
- Multiple concurrent analysis requests for the same keyword could create race conditions in cooldown checks.
