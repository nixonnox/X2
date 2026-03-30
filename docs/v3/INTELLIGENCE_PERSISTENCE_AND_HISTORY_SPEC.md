# Intelligence Persistence and History Spec

> Last updated based on actual source code analysis.
> Source: `packages/api/src/services/intelligence/intelligence-persistence.service.ts`
> Schema: `packages/db/prisma/schema.prisma`

## Overview

The `IntelligencePersistenceService` handles saving and querying intelligence analysis
results, comparison runs, social mention snapshots, and benchmark snapshots. It wraps
all Prisma operations and is instantiated per-request from the tRPC context.

---

## Service Architecture

### Constructor

```typescript
export class IntelligencePersistenceService {
  private readonly prisma: any;

  constructor(prisma: any) {
    this.prisma = prisma;
  }
}
```

The service receives the Prisma client instance via constructor injection. It uses
`any` typing to avoid a build-time dependency on generated Prisma types.

### Instantiation Pattern

Created per-request in the router layer:

```typescript
const persistence = new IntelligencePersistenceService(ctx.db as any);
```

This pattern appears in every router endpoint that needs persistence (`analyze`,
`liveMentions`, `compare`, `history`, `loadRun`, `periodData`, `currentVsPrevious`).

---

## Four DB Models

| Model | Table Name | Purpose | Write Strategy |
|-------|-----------|---------|----------------|
| `IntelligenceAnalysisRun` | `intelligence_analysis_runs` | Single-keyword analysis result snapshot | **Append-only** (create) |
| `IntelligenceComparisonRun` | `intelligence_comparison_runs` | A/B comparison result snapshot | **Append-only** (create) |
| `SocialMentionSnapshot` | `social_mention_snapshots` | Daily social mention aggregates | **Upsert** (composite unique) |
| `BenchmarkSnapshot` | `benchmark_snapshots` | Daily benchmark score snapshot | **Upsert** (composite unique) |

---

## Save Flows

### 1. analyze -> saveAnalysisRun + saveBenchmarkSnapshot

Triggered by `intelligenceRouter.analyze`:

```
analyze mutation
  |
  +-> persistence.saveAnalysisRun({...})         // append-only create
  |     Returns: run.id (string)
  |
  +-> persistence.saveBenchmarkSnapshot({...})   // upsert by composite key
        Only if benchmarkComparison is available
        Uses todayDate() for the date field
```

Both calls are wrapped in a single try-catch; failure does not block the response.

### 2. liveMentions -> saveSocialSnapshot

Triggered by `intelligenceRouter.liveMentions`:

```
liveMentions query
  |
  +-> liveMentionService.collectLiveMentions()
  |
  +-> persistence.saveSocialSnapshot({...})      // upsert by composite key
        Counts sentiment from mentions
        Stores top 20 sample mentions (text truncated to 300 chars)
        Uses todayDate() for the date field
```

### 3. compare -> saveComparisonRun

Triggered by `intelligenceRouter.compare`:

```
compare mutation
  |
  +-> persistence.saveComparisonRun({...})       // append-only create
        Stores full comparison result as JSON
        Includes optional period start/end dates
```

---

## Upsert Strategy

### SocialMentionSnapshot

Composite unique constraint: `(projectId, keyword, date)`

```typescript
await this.prisma.socialMentionSnapshot.upsert({
  where: {
    projectId_keyword_date: {
      projectId: input.projectId,
      keyword: input.keyword,
      date: input.date,
    },
  },
  update: { /* all fields except projectId, keyword, date */ },
  create: { /* all fields */ },
});
```

If a snapshot already exists for the same project + keyword + date, it gets updated
with the latest data. This means only the most recent collection for a given day is kept.

### BenchmarkSnapshot

Composite unique constraint: `(projectId, keyword, industryType, date)`

```typescript
await this.prisma.benchmarkSnapshot.upsert({
  where: {
    projectId_keyword_industryType_date: {
      projectId: input.projectId,
      keyword: input.keyword,
      industryType: input.industryType,
      date: input.date,
    },
  },
  update: { /* score, comparisons, highlights, warnings */ },
  create: { /* all fields */ },
});
```

---

## History Query Methods

### getAnalysisHistory

```typescript
async getAnalysisHistory(
  projectId: string,
  options?: {
    seedKeyword?: string;
    industryType?: string;
    limit?: number;     // default 20
    offset?: number;    // default 0
  },
): Promise<AnalysisHistoryItem[]>
```

Returns a paginated list of analysis runs ordered by `analyzedAt` descending.
Selected fields only (no full fusionResult):

| Field | Type |
|-------|------|
| id | string |
| seedKeyword | string |
| industryType | string |
| industryLabel | string |
| confidence | number |
| freshness | string |
| isPartial | boolean |
| signalQuality | unknown (JSON) |
| analyzedAt | Date |

### getLatestRun

```typescript
async getLatestRun(
  projectId: string,
  seedKeyword: string,
  industryType?: string,
): Promise<FullRun | null>
```

Returns the single most recent analysis run matching the project, keyword, and
optionally industry type. Returns the full record (all fields).

### getRunsForPeriod

```typescript
async getRunsForPeriod(
  projectId: string,
  seedKeyword: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<FullRun[]>
```

Returns all analysis runs within the date range, ordered by `analyzedAt` descending.
Used by `loadPeriodComparisonData` and the period comparison flow.

### getCurrentVsPrevious

```typescript
async getCurrentVsPrevious(
  projectId: string,
  seedKeyword: string,
): Promise<{ current: unknown | null; previous: unknown | null }>
```

Fetches the latest 2 runs for a project+keyword combination. Returns `current` (most
recent) and `previous` (second most recent). If fewer than 2 runs exist, the missing
one is `null`.

### getComparisonHistory

```typescript
async getComparisonHistory(projectId: string, limit = 10)
```

Returns the most recent comparison runs for a project, ordered by `analyzedAt` desc.

---

## todayDate Helper

Located in the router file (`packages/api/src/routers/intelligence.ts`):

```typescript
function todayDate(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
```

Creates a date-only value (midnight local time) used as the `date` field for daily
snapshots. This ensures that upserts correctly match "same day" records regardless
of the time the analysis ran.

---

## Non-Blocking Persistence

All persistence operations in the router are wrapped in try-catch blocks that silently
swallow errors:

```typescript
try {
  savedRunId = await persistence.saveAnalysisRun({...});
} catch {
  // Persistence failure should not block analysis response
}
```

This pattern applies to:
- `saveAnalysisRun` in the `analyze` endpoint
- `saveBenchmarkSnapshot` in the `analyze` endpoint
- `saveSocialSnapshot` in the `liveMentions` endpoint
- `saveComparisonRun` in the `compare` endpoint

The consequence: if the database is unreachable, the user still receives analysis
results but no historical data is saved. The `savedRunId` / `savedComparisonId` will
be `null` in the response, which the frontend can use to detect persistence failure.

---

## Input Types

### SaveAnalysisRunInput

| Field | Type | Required |
|-------|------|----------|
| projectId | string | yes |
| seedKeyword | string | yes |
| industryType | string | yes |
| industryLabel | string | yes |
| signalQuality | Record<string, unknown> | yes |
| fusionResult | Record<string, unknown> | yes |
| taxonomyMapping | Record<string, unknown> | null | no |
| benchmarkComparison | Record<string, unknown> | null | no |
| benchmarkBaseline | unknown[] | null | no |
| socialIntegration | Record<string, unknown> | null | no |
| additionalInsights | unknown[] | null | no |
| additionalWarnings | string[] | null | no |
| additionalEvidence | unknown[] | null | no |
| confidence | number | yes |
| freshness | string | yes |
| isPartial | boolean | yes |
| isMockOnly | boolean | yes |
| isStaleBased | boolean | yes |
| providerCoverage | Record<string, unknown> | null | no |
| socialMentionSnapshot | Record<string, unknown> | null | no |

### SaveComparisonRunInput

| Field | Type | Required |
|-------|------|----------|
| projectId | string | yes |
| comparisonType | string | yes |
| leftLabel | string | yes |
| leftKeyword | string | yes |
| leftIndustry | string | yes |
| leftRunId | string | no |
| rightLabel | string | yes |
| rightKeyword | string | yes |
| rightIndustry | string | yes |
| rightRunId | string | no |
| comparisonResult | Record<string, unknown> | yes |
| overallDifferenceScore | number | yes |
| leftPeriodStart / End | Date | no |
| rightPeriodStart / End | Date | no |

### SaveSocialSnapshotInput

| Field | Type |
|-------|------|
| projectId | string |
| keyword | string |
| date | Date |
| totalCount | number |
| buzzLevel | string |
| positiveCount | number |
| neutralCount | number |
| negativeCount | number |
| providerStatuses | unknown[] |
| topicSignals | unknown[] (optional) |
| sampleMentions | unknown[] (optional) |
| freshness | string |

### SaveBenchmarkSnapshotInput

| Field | Type |
|-------|------|
| projectId | string |
| keyword | string |
| industryType | string |
| date | Date |
| overallScore | number |
| comparisons | unknown[] |
| highlights | string[] (optional) |
| warnings | string[] (optional) |

---

## Router Endpoints for History

| Endpoint | Method | Description |
|----------|--------|-------------|
| `intelligence.history` | query | Paginated analysis run list |
| `intelligence.loadRun` | query | Load single run by ID |
| `intelligence.currentVsPrevious` | query | Latest 2 runs for quick compare |
| `intelligence.periodData` | query | Load period comparison data |
