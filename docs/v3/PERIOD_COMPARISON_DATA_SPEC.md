# Period Comparison Data Spec

> Last updated based on actual source code analysis.
> Sources:
> - `packages/api/src/services/intelligence/intelligence-comparison.service.ts`
> - `packages/api/src/services/intelligence/intelligence-persistence.service.ts`
> - `packages/api/src/routers/intelligence.ts`

## Overview

Period comparison allows users to compare intelligence analysis results across different
time periods, keywords, or industries. The system supports three comparison modes and
leverages historical analysis runs, social mention snapshots, and benchmark snapshots
to construct comparison data.

---

## Three Comparison Modes

| Mode | Description | Data Source |
|------|-------------|-------------|
| `keyword_vs_keyword` | Compare two different keywords in the same industry | Live analysis or saved runs |
| `industry_vs_industry` | Compare same keyword across two industry templates | Live analysis or saved runs |
| `period_vs_period` | Compare same keyword across two time periods | Historical runs from DB |

All three modes are handled by the single `intelligence.compare` mutation endpoint.

---

## Data Sources

### IntelligenceAnalysisRun (Full Results)

Append-only records containing complete `SignalFusionResult` snapshots. Each run stores:
- `fusionResult` (JSON) - the full signal fusion output
- `signalQuality` (JSON) - data availability metadata
- `confidence` (Float) - 0.4 / 0.65 / 0.85 based on signal richness
- `analyzedAt` (DateTime) - timestamp of analysis

Used to reconstruct `ComparisonSide` objects for the comparison service.

### SocialMentionSnapshot (Daily)

Daily aggregates of social mention data, upserted by `(projectId, keyword, date)`:
- `totalCount`, `buzzLevel`
- `positiveCount`, `neutralCount`, `negativeCount`
- `providerStatuses` (JSON array)
- `topicSignals` (JSON array)

### BenchmarkSnapshot (Daily)

Daily benchmark scores, upserted by `(projectId, keyword, industryType, date)`:
- `overallScore` (Float)
- `comparisons` (JSON array of metric comparisons)
- `highlights`, `warnings` (JSON arrays)

---

## loadPeriodComparisonData

```typescript
async loadPeriodComparisonData(
  projectId: string,
  seedKeyword: string,
  periodStart: Date,
  periodEnd: Date,
  industryType?: string,
): Promise<PeriodComparisonData>
```

Loads all three data types in parallel using `Promise.all`:

```typescript
const [runs, socialSnapshots, benchmarkSnapshots] = await Promise.all([
  this.getRunsForPeriod(projectId, seedKeyword, periodStart, periodEnd),
  this.getSocialSnapshots(projectId, seedKeyword, periodStart, periodEnd),
  industryType
    ? this.getBenchmarkSnapshots(projectId, seedKeyword, industryType, periodStart, periodEnd)
    : Promise.resolve([]),
]);
```

### PeriodComparisonData Shape

```typescript
type PeriodComparisonData = {
  periodLabel: string;   // "2026-01-01 ~ 2026-01-31"
  periodStart: Date;
  periodEnd: Date;
  runs: Array<{
    id: string;
    analyzedAt: Date;
    fusionResult: unknown;
    signalQuality: unknown;
    confidence: number;
  }>;
  socialSnapshots: Array<{
    date: Date;
    totalCount: number;
    buzzLevel: string;
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
  }>;
  benchmarkSnapshots: Array<{
    date: Date;
    overallScore: number;
    comparisons: unknown;
  }>;
};
```

---

## getCurrentVsPrevious

Quick comparison method that returns the latest 2 analysis runs for a project+keyword:

```typescript
async getCurrentVsPrevious(
  projectId: string,
  seedKeyword: string,
): Promise<{ current: unknown | null; previous: unknown | null }>
```

Implementation:
```typescript
const runs = await this.prisma.intelligenceAnalysisRun.findMany({
  where: { projectId, seedKeyword },
  orderBy: { analyzedAt: "desc" },
  take: 2,
});

return {
  current: runs[0] ?? null,
  previous: runs[1] ?? null,
};
```

Exposed as `intelligence.currentVsPrevious` query endpoint.

---

## periodData Endpoint

The `intelligence.periodData` query checks data availability for a given period:

```typescript
// Router response shape
return {
  ...data,                                          // PeriodComparisonData fields
  hasData: data.runs.length > 0,                   // Boolean flag
  runCount: data.runs.length,                      // Number of analysis runs
  socialSnapshotCount: data.socialSnapshots.length, // Number of social snapshots
  benchmarkSnapshotCount: data.benchmarkSnapshots.length,
};
```

This endpoint is meant for checking whether sufficient historical data exists before
initiating a period comparison.

---

## Compare Flow: period_vs_period

When `comparisonType` is `period_vs_period`, the `compare` mutation follows this flow:

### Step 1: Resolve Each Side

For each side (left and right), the `analyzeOne` helper function:

1. **Check for explicit `runId`**: If provided, load the saved run from DB.
2. **Check for period range**: If `periodStart` and `periodEnd` are provided,
   query `getRunsForPeriod()` and use the most recent run in that range.
3. **Fallback to live analysis**: If no historical data exists, run a fresh
   signal fusion analysis. The result is marked with `isStaleBased: false`.

```typescript
// Period run loading
if (input.comparisonType === "period_vs_period" && side.periodStart && side.periodEnd) {
  const runs = await persistence.getRunsForPeriod(
    input.projectId,
    side.seedKeyword,
    new Date(side.periodStart),
    new Date(side.periodEnd),
  );
  if (runs.length > 0) {
    const latestRun = runs[0]!;
    // Use this run's fusionResult as the comparison side
    // Mark isStaleBased: true
  }
}
```

### Step 2: Compare

Both resolved sides are passed to `IntelligenceComparisonService.compare()`:

```typescript
const comparison = comparisonService.compare(
  leftResult,
  rightResult,
  input.comparisonType,
);
```

### Step 3: Data Availability Check

```typescript
let periodDataAvailability: {
  leftHasHistoricalData: boolean;
  rightHasHistoricalData: boolean;
  insufficientDataWarning?: string;
} | undefined;
```

| Condition | insufficientDataWarning |
|-----------|------------------------|
| Neither side has historical data | "양쪽 모두 저장된 과거 데이터가 없습니다..." |
| One side missing | "한쪽의 과거 데이터가 부족합니다..." |
| Both have data | `undefined` (no warning) |

A side "has historical data" if `isStaleBased === true` or an explicit `runId` was provided.

---

## Fallback Behavior

When no historical data exists for a period, the system runs a **live analysis** using
whatever cluster/social data the user provides in the request. Key indicators:

| Field | Value | Meaning |
|-------|-------|---------|
| `isStaleBased` | `false` | Data is from live analysis, not from a past run |
| `freshness` | `"fresh"` | Data was just computed |
| `isMockOnly` | `true` | No cluster data or social data was provided |

The `periodDataAvailability.insufficientDataWarning` in the response alerts the frontend
that the comparison is not based on actual historical data.

---

## ComparisonSide Type

Each side of a comparison is represented as:

```typescript
export type ComparisonSide = {
  label: string;                  // User-provided label (e.g., "Jan 2026")
  seedKeyword: string;            // The keyword analyzed
  industryType: string;           // Industry template used
  fusionResult: SignalFusionResult; // Full signal fusion output
  metadata: {
    confidence: number;           // 0.4 | 0.65 | 0.85
    freshness: string;            // "fresh" for live, historical for saved
    isPartial: boolean;           // Missing cluster or social data
    isMockOnly: boolean;          // No real data at all
    isStaleBased: boolean;        // true if loaded from saved run
    generatedAt: string;          // ISO timestamp
  };
};
```

---

## IntelligenceComparisonService.compare

The comparison service computes differences across 5 dimensions:

| Dimension | Method | Compares |
|-----------|--------|----------|
| Signal Quality | `compareSignalQuality` | Overall richness level, data source availability |
| Taxonomy | `compareTaxonomy` | Category coverage %, new/removed categories, cluster counts |
| Benchmark | `compareBenchmark` | Overall score change, per-metric rating changes |
| Social | `compareSocial` | Evidence count change, critical warning changes |
| Warnings | `compareWarnings` | Warning count change, new warnings |

### Output Shape

```typescript
type IntelligenceComparisonResult = {
  comparisonType: string;
  leftLabel: string;
  rightLabel: string;
  keyDifferences: KeyDifference[];
  highlightedChanges: HighlightedChange[];
  differenceWarnings: string[];
  actionDelta: ActionDelta;
  overallDifferenceScore: number;   // 0-100
  summary: string;
};
```

### Difference Score Calculation

```typescript
const weights = { CRITICAL: 30, WARNING: 15, INFO: 5, NEUTRAL: 1 };
score = sum of weights for each keyDifference
return Math.min(100, score);
```

### Metadata Warnings

Added to `differenceWarnings` when:
- Either side has `isStaleBased: true` => "일부 데이터가 최신이 아닙니다..."
- Either side has `isPartial: true` => "부분 데이터가 포함되어 있어..."
- Either side has `confidence < 0.5` => "신뢰도가 낮은 데이터..."

---

## Action Delta

Computes changes in insights and warnings between left and right sides:

```typescript
type ActionDelta = {
  newInsights: string[];        // Insight titles in right but not left
  removedInsights: string[];    // Insight titles in left but not right
  escalatedWarnings: string[];  // Warnings in right but not left
  resolvedWarnings: string[];   // Warnings in left but not right
  recommendations: string[];   // Auto-generated action items
};
```

---

## Persistence of Comparison Results

Every comparison is saved as an `IntelligenceComparisonRun`:

```typescript
savedComparisonId = await persistence.saveComparisonRun({
  projectId,
  comparisonType,
  leftLabel, leftKeyword, leftIndustry, leftRunId,
  rightLabel, rightKeyword, rightIndustry, rightRunId,
  comparisonResult: comparison,
  overallDifferenceScore: comparison.overallDifferenceScore,
  leftPeriodStart, leftPeriodEnd,
  rightPeriodStart, rightPeriodEnd,
});
```

The `savedComparisonId` is returned in the response (or `null` if persistence failed).

---

## Provider Coverage in Compare Response

The full compare response includes both sides with their intelligence breakdown:

```typescript
return {
  comparison,                    // IntelligenceComparisonResult
  periodDataAvailability,        // Only for period_vs_period
  savedComparisonId,
  left: {
    ...leftResult,
    industryLabel,
    benchmarkBaseline,
    intelligence: {
      signalQuality,
      taxonomyMapping,
      benchmarkComparison,
      socialIntegration,
    },
  },
  right: { /* same structure */ },
};
```
