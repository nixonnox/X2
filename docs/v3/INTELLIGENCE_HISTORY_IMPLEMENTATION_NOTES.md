# Intelligence History Implementation Notes

> Last updated based on actual source code analysis.
> Sources:
> - `packages/db/prisma/schema.prisma` (lines 2071-2213)
> - `packages/api/src/services/intelligence/intelligence-persistence.service.ts`
> - `packages/api/src/services/intelligence/intelligence-comparison.service.ts`
> - `packages/api/src/routers/intelligence.ts`

## Overview

This document covers implementation-level details of the intelligence history system:
Prisma schema design, service instantiation patterns, comparison internals, provider
coverage tracking, and known gaps that need addressing.

---

## Prisma Schema: 4 Intelligence Models

### IntelligenceAnalysisRun

```prisma
model IntelligenceAnalysisRun {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  seedKeyword    String
  industryType   String
  industryLabel  String

  signalQuality  Json
  fusionResult   Json

  taxonomyMapping      Json?
  benchmarkComparison  Json?
  benchmarkBaseline    Json?
  socialIntegration    Json?

  additionalInsights  Json?
  additionalWarnings  Json?
  additionalEvidence  Json?

  confidence   Float    @default(0)
  freshness    String   @default("fresh")
  isPartial    Boolean  @default(false)
  isMockOnly   Boolean  @default(false)
  isStaleBased Boolean  @default(false)

  providerCoverage      Json?
  socialMentionSnapshot Json?

  analyzedAt DateTime @default(now())
  createdAt  DateTime @default(now())

  @@index([projectId, seedKeyword])
  @@index([projectId, analyzedAt(sort: Desc)])
  @@index([seedKeyword, industryType, analyzedAt(sort: Desc)])
  @@map("intelligence_analysis_runs")
}
```

**Indexes:**

| Index | Purpose |
|-------|---------|
| `[projectId, seedKeyword]` | History query filtering |
| `[projectId, analyzedAt(sort: Desc)]` | Latest run lookups |
| `[seedKeyword, industryType, analyzedAt(sort: Desc)]` | Cross-project keyword analysis |

### IntelligenceComparisonRun

```prisma
model IntelligenceComparisonRun {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  comparisonType String

  leftLabel       String
  leftKeyword     String
  leftIndustry    String
  leftRunId       String?

  rightLabel      String
  rightKeyword    String
  rightIndustry   String
  rightRunId      String?

  comparisonResult        Json
  overallDifferenceScore  Int @default(0)

  leftPeriodStart  DateTime?
  leftPeriodEnd    DateTime?
  rightPeriodStart DateTime?
  rightPeriodEnd   DateTime?

  analyzedAt DateTime @default(now())
  createdAt  DateTime @default(now())

  @@index([projectId, analyzedAt(sort: Desc)])
  @@index([projectId, comparisonType])
  @@map("intelligence_comparison_runs")
}
```

**Note:** `leftRunId` and `rightRunId` are **soft references** (plain strings, not
foreign keys). No Prisma relation is defined, so there is no cascade behavior or
referential integrity enforcement.

### SocialMentionSnapshot

```prisma
model SocialMentionSnapshot {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  date      DateTime @db.Date
  keyword   String

  totalCount   Int    @default(0)
  buzzLevel    String @default("NONE")

  positiveCount Int @default(0)
  neutralCount  Int @default(0)
  negativeCount Int @default(0)

  providerStatuses Json
  topicSignals     Json?
  sampleMentions   Json?

  freshness   String   @default("fresh")
  collectedAt DateTime @default(now())

  @@unique([projectId, keyword, date])
  @@index([projectId, keyword, date(sort: Desc)])
  @@map("social_mention_snapshots")
}
```

The `date` field uses `@db.Date` (PostgreSQL `date` type) for date-only storage.
The composite unique `[projectId, keyword, date]` ensures one snapshot per
project-keyword-day combination.

### BenchmarkSnapshot

```prisma
model BenchmarkSnapshot {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  date         DateTime @db.Date
  keyword      String
  industryType String

  overallScore Float    @default(0)
  comparisons  Json
  highlights   Json?
  warnings     Json?

  createdAt DateTime @default(now())

  @@unique([projectId, keyword, industryType, date])
  @@index([projectId, keyword, date(sort: Desc)])
  @@map("benchmark_snapshots")
}
```

Four-column composite unique: `[projectId, keyword, industryType, date]`.

---

## Project Model Reverse Relations

The `Project` model includes reverse relations for all 4 intelligence models:

```prisma
model Project {
  // ... other fields ...

  intelligenceRuns        IntelligenceAnalysisRun[]
  intelligenceComparisons IntelligenceComparisonRun[]
  socialMentionSnapshots  SocialMentionSnapshot[]
  benchmarkSnapshots      BenchmarkSnapshot[]
}
```

All use `onDelete: Cascade`, so deleting a project removes all associated intelligence
data.

---

## Service Instantiation Pattern

The `IntelligencePersistenceService` is **not a singleton**. It is created fresh for
each tRPC request:

```typescript
// In every router endpoint that needs persistence:
const persistence = new IntelligencePersistenceService(ctx.db as any);
```

This pattern is used in these endpoints:
- `analyze` (mutation)
- `liveMentions` (query)
- `compare` (mutation)
- `history` (query)
- `loadRun` (query)
- `periodData` (query)
- `currentVsPrevious` (query)

The `ctx.db` is the Prisma client from the tRPC context, cast to `any` to avoid
build-time Prisma type generation dependency.

---

## Comparison Implementation Details

### IntelligenceComparisonService

Module-level singleton (not per-request):

```typescript
const comparisonService = new IntelligenceComparisonService();
```

The `compare()` method is synchronous (no async, no DB calls). It operates purely on
the in-memory `ComparisonSide` data.

### ComparisonSide Type

```typescript
export type ComparisonSide = {
  label: string;
  seedKeyword: string;
  industryType: string;
  fusionResult: SignalFusionResult;
  metadata: {
    confidence: number;
    freshness: string;
    isPartial: boolean;
    isMockOnly: boolean;
    isStaleBased: boolean;
    generatedAt: string;
  };
};
```

### Difference Levels and Scoring

```typescript
export type DifferenceLevel = "CRITICAL" | "WARNING" | "INFO" | "NEUTRAL";
```

Scoring weights:

| Level | Weight |
|-------|--------|
| CRITICAL | 30 |
| WARNING | 15 |
| INFO | 5 |
| NEUTRAL | 1 |

`overallDifferenceScore = min(100, sum of weights)`. Stored as `Int` in the DB schema.

---

## Period Comparison: Historical Run Loading

When `comparisonType === "period_vs_period"`:

1. The router's `analyzeOne` helper first checks for an explicit `runId`.
2. If no `runId`, it queries `getRunsForPeriod()` for the given date range.
3. If runs exist, it uses `runs[0]` (most recent in the period).
4. If no runs exist, it falls back to live analysis with `isStaleBased: false`.

The `isStaleBased` flag is the key indicator:
- `true` => loaded from a saved historical run
- `false` => freshly computed (no historical data available)

---

## Provider Coverage Tracking

Provider coverage is captured at analysis time and stored in the `providerCoverage`
JSON field of `IntelligenceAnalysisRun`:

```typescript
providerCoverage: {
  connectedProviders: number;
  totalProviders: number;
  isPartial: boolean;
  providers: Array<{
    provider: string;
    platform: string;
    isConnected: boolean;
    mentionCount: number;
  }>;
}
```

This field is populated from the `LiveMentionResult.coverage` and
`LiveMentionResult.providerStatuses` when social data is collected as part of the
analysis flow.

**Note:** The `providerCoverage` field is optional (`Json?`). It is only present when
the analysis included live social mention collection. Analyses run without social data
will have this field as `null`.

---

## Known Gaps and Future Work

### 1. PostgreSQL Migration

The schema uses PostgreSQL-specific features:
- `@db.Date` for date-only columns
- `Json` fields for flexible storage
- Sorted indexes: `analyzedAt(sort: Desc)`

Currently the application may be running against a development database. A production
PostgreSQL migration plan is needed.

### 2. Data Retention Policy

No data retention or cleanup mechanism exists. All analysis runs are append-only
with no expiry. Over time this will lead to:
- Growing storage costs
- Slower history queries
- Large JSON payloads in `fusionResult` accumulating

**Recommendation:** Implement a retention policy (e.g., keep last 90 days of runs,
archive older data).

### 3. Backfill Mechanism

Period comparison is only useful when historical data exists. Currently there is no
mechanism to backfill past data. If a user starts using the system today, they can only
compare from this point forward.

**Recommendation:** Consider adding a batch backfill endpoint or scheduled analysis
that accumulates historical snapshots over time.

### 4. Soft References in ComparisonRun

`leftRunId` and `rightRunId` in `IntelligenceComparisonRun` are plain strings, not
Prisma relations. Benefits:
- No cascade deletion issues
- Can reference runs that may be deleted later

Drawbacks:
- No referential integrity
- Cannot join or include related runs in queries
- Dangling references possible

### 5. Type Safety

The persistence service uses `any` for the Prisma client:

```typescript
private readonly prisma: any;
```

This means no compile-time type checking on database operations. Prisma query
errors will only surface at runtime.

### 6. No Aggregation Queries

The current implementation fetches raw records and aggregates in JavaScript. For larger
datasets, SQL-level aggregation would be more efficient:
- Social snapshot trend data (avg/sum over periods)
- Benchmark score trends
- Run count by keyword/industry

### 7. Missing Indexes

The `SocialMentionSnapshot` and `BenchmarkSnapshot` have descending date indexes, but
the `IntelligenceComparisonRun` lacks an index on `comparisonType` alone (it has a
composite with `projectId`). For cross-project comparison analytics, additional indexes
may be needed.

### 8. Concurrent Upsert Safety

The daily snapshot upserts (`saveSocialSnapshot`, `saveBenchmarkSnapshot`) use Prisma's
`upsert` which translates to PostgreSQL's `INSERT ... ON CONFLICT ... DO UPDATE`. This
is safe for concurrent requests but the "last write wins" behavior means rapid
successive calls for the same day may overwrite each other's data.

---

## File Index

| File | Description |
|------|-------------|
| `packages/db/prisma/schema.prisma` | Prisma schema with all 4 models (lines 2071-2213) |
| `packages/api/src/services/intelligence/intelligence-persistence.service.ts` | Persistence service (save/query) |
| `packages/api/src/services/intelligence/intelligence-comparison.service.ts` | Comparison logic (pure computation) |
| `packages/api/src/routers/intelligence.ts` | tRPC router with all endpoints |
| `packages/api/src/services/intelligence/social-provider-registry.service.ts` | Provider registry and types |
| `packages/api/src/services/intelligence/live-social-mention-bridge.service.ts` | Live mention orchestration |
