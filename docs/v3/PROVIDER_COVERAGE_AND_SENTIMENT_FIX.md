# Provider Coverage and Sentiment Classification Fix

> **Date**: 2026-03-15
> **Scope**: Intelligence analyze mutation, persistence layer, Prisma schema
> **Priority**: P1

---

## Overview

Two related data-accuracy issues were fixed:

1. **Provider coverage** was not captured or persisted during analysis, making it
   impossible to determine which social platforms contributed data to a given run.
2. **Null sentiment** values were silently counted as NEUTRAL, inflating the neutral
   count and hiding data quality gaps.

---

## Part 1: Provider Coverage

### Problem

The `intelligence.analyze` mutation collected social mention data from multiple providers
(YouTube, Instagram, TikTok, X/Twitter) but did not record which providers were actually
connected and returning data. This meant:

- The frontend could not warn users about partial data
- Historical runs could not be compared fairly (different provider coverage)
- The `isPartial` flag existed but lacked the underlying detail

### Solution

#### Computation (Router)

In the analyze mutation (`packages/api/src/routers/intelligence.ts`), after collecting
social data, provider coverage is computed from the live mention service registry:

```ts
let providerCoverage: Record<string, unknown> | null = null;
try {
  const statuses = await liveMentionService.getRegistry().getAllStatuses();
  const connected = statuses.filter((s) => s.isAvailable).length;
  providerCoverage = {
    connectedProviders: connected,
    totalProviders: statuses.length,
    isPartial: connected < statuses.length && connected > 0,
    providers: statuses.map((s) => ({
      name: s.name,
      platform: s.platform,
      status: s.isAvailable ? "connected" : "disconnected",
      error: s.error ?? null,
    })),
  };
} catch { /* non-blocking */ }
```

#### Object Shape

```ts
type ProviderCoverage = {
  connectedProviders: number;   // e.g. 3
  totalProviders: number;       // e.g. 4
  isPartial: boolean;           // true if 0 < connected < total
  providers: Array<{
    name: string;               // e.g. "YouTube"
    platform: string;           // e.g. "youtube"
    status: "connected" | "disconnected";
    error: string | null;       // error message if disconnected
  }>;
};
```

#### Persistence

The `providerCoverage` object is passed to `IntelligencePersistenceService.saveAnalysisRun()`
and stored in the `IntelligenceAnalysisRun.providerCoverage` field.

**Schema** (`packages/db/prisma/schema.prisma`):
```prisma
model IntelligenceAnalysisRun {
  // ...
  providerCoverage Json?  // { connectedProviders, totalProviders, isPartial, providers: [...] }
}
```

The field is nullable (`Json?`) because:
- Legacy runs created before this fix will have `null`
- The computation itself is wrapped in try-catch (non-blocking)

#### Response

The analyze mutation includes `providerCoverage` in the response metadata object:

```ts
const metadata = {
  isPartial: /* ... */,
  isMockOnly: /* ... */,
  isStaleBased: false,
  providerCoverage,   // <-- included here
};
```

The frontend can use `metadata.providerCoverage.isPartial` to show a warning banner and
`metadata.providerCoverage.providers` to display per-platform connection status.

---

## Part 2: Null Sentiment Separation

### Problem

The social mention router classified sentiments into 3 buckets:

```
POSITIVE  -> positive++
NEGATIVE  -> negative++
everything else -> neutral++   // <-- BUG: null/undefined counted as NEUTRAL
```

This meant mentions that were never analyzed for sentiment (null) or had an unrecognized
sentiment value were silently counted as NEUTRAL. The resulting neutral counts were
artificially inflated, misleading users about actual sentiment distribution.

### Solution

#### Classification Logic (4 Buckets)

The router now uses 4 explicit buckets:

```ts
let positive = 0, neutral = 0, negative = 0, unclassified = 0;

for (const m of mentions) {
  if (m.sentiment === "POSITIVE") positive++;
  else if (m.sentiment === "NEGATIVE") negative++;
  else if (m.sentiment === "NEUTRAL") neutral++;
  else unclassified++;   // null, undefined, or unknown string values
}
```

**Key change**: NEUTRAL requires an exact string match (`m.sentiment === "NEUTRAL"`).
Anything that is not one of the three known strings falls into `unclassified`.

#### Schema Change

Added `unclassifiedCount` to the `SocialMentionSnapshot` model:

```prisma
model SocialMentionSnapshot {
  // ...
  positiveCount      Int @default(0)
  neutralCount       Int @default(0)
  negativeCount      Int @default(0)
  unclassifiedCount  Int @default(0)  // null/unknown sentiment - not analyzed
}
```

The `@default(0)` ensures backward compatibility with existing records.

#### Persistence Service

The `SaveSocialSnapshotInput` type was updated to include `unclassifiedCount`:

```ts
export type SaveSocialSnapshotInput = {
  projectId: string;
  keyword: string;
  date: string;
  totalMentionCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  unclassifiedCount: number;  // <-- added
  providerStatuses: unknown[];
  topicSignals?: unknown[];
  sampleMentions?: unknown[];
};
```

Both the `create` and `update` branches of the `saveSocialSnapshot` upsert now persist
`unclassifiedCount`.

#### Router Integration

The router passes the computed `unclassified` count:

```ts
await persistence.saveSocialSnapshot({
  // ...
  positiveCount: positive,
  neutralCount: neutral,
  negativeCount: negative,
  unclassifiedCount: unclassified,   // <-- new
  providerStatuses: result.providerStatuses,
  // ...
});
```

---

## Impact on Downstream Consumers

### Frontend Sentiment Charts

Consumers reading `SocialMentionSnapshot` should now handle 4 fields:

| Field | Meaning |
|-------|---------|
| `positiveCount` | Confirmed positive sentiment |
| `neutralCount` | Confirmed neutral sentiment |
| `negativeCount` | Confirmed negative sentiment |
| `unclassifiedCount` | Not analyzed or unknown value |

Chart components should either:
- Show a fourth "unclassified" segment (recommended for transparency)
- Exclude unclassified from percentage calculations and show a footnote

### Intelligence Alert Evaluation

The `PROVIDER_COVERAGE_LOW` alert condition uses `isPartial` from the providerCoverage
object. This is now accurately computed from the actual registry status rather than
inferred from data availability.

### Historical Data

Existing `SocialMentionSnapshot` records will have `unclassifiedCount = 0` due to the
schema default. This is technically inaccurate for old data but acceptable because:
- Old data already has inflated neutral counts (the bug)
- Retroactive correction would require re-analyzing all historical mentions
- New runs going forward will have accurate classification

---

## Files Modified

```
packages/api/src/routers/intelligence.ts
  - providerCoverage computation (analyze mutation)
  - Sentiment 4-bucket classification (social mention collection)

packages/api/src/services/intelligence/intelligence-persistence.service.ts
  - SaveAnalysisRunInput.providerCoverage field
  - SaveSocialSnapshotInput.unclassifiedCount field
  - saveSocialSnapshot upsert (create + update branches)

packages/db/prisma/schema.prisma
  - IntelligenceAnalysisRun.providerCoverage Json?
  - SocialMentionSnapshot.unclassifiedCount Int @default(0)
```

---

## Testing Guidance

### Provider Coverage
1. Connect 2 of 4 providers, run analyze, verify `providerCoverage.connectedProviders === 2`
2. Disconnect all providers, verify `isPartial === false` (0 of N is not partial)
3. Verify the saved `IntelligenceAnalysisRun` record contains the JSON object

### Sentiment
1. Send mentions with mixed sentiments including null values
2. Verify `unclassifiedCount > 0` and `neutralCount` only includes explicit NEUTRAL
3. Verify `positiveCount + neutralCount + negativeCount + unclassifiedCount === totalMentionCount`
4. Check that existing records have `unclassifiedCount = 0` (schema default)
