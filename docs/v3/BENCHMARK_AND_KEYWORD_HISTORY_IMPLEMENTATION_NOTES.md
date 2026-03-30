# Benchmark and Keyword History Implementation Notes

## Overview

This document records implementation details, architectural decisions, and known gaps
for the benchmark time-series and keyword history features added to the Intelligence Hub.

---

## 1. Prisma Schema Changes

### IntelligenceKeyword Model

Added to `packages/db/prisma/schema.prisma`:

```prisma
model IntelligenceKeyword {
  id            String   @id @default(cuid())
  projectId     String
  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId        String
  keyword       String
  industryType  String?
  industryLabel String?
  isSaved       Boolean  @default(false)
  analysisCount Int      @default(1)
  lastConfidence Float?
  lastFreshness  String?
  lastSignalHint String?
  lastAnalyzedAt DateTime @default(now())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([projectId, userId, keyword])
  @@index([projectId, userId, lastAnalyzedAt(sort: Desc)])
  @@index([projectId, userId, isSaved])
  @@map("intelligence_keywords")
}
```

### Project Relation

The `Project` model gained a new relation field for `IntelligenceKeyword`.
This was added alongside the existing `BenchmarkSnapshot` relation.

### BenchmarkSnapshot (Pre-existing)

The `BenchmarkSnapshot` model was already present from earlier persistence work.
No schema changes were needed -- only new read/write paths were added.

---

## 2. Router Additions

Four new endpoints were added to `packages/api/src/routers/intelligence.ts`:

### `benchmarkTrend` (Query)

- Reads `BenchmarkSnapshot` records within a date range
- Computes trend direction, change percent, and volatility in-memory
- Returns structured data points + summary for the chart component
- Falls back to `INSUFFICIENT_DATA` when fewer than 3 data points exist

### `keywords` (Query)

- Reads `IntelligenceKeyword` records scoped to `[projectId, userId]`
- Supports three filter modes: `all`, `saved`, `recent`
- Orders by `lastAnalyzedAt` (for all/recent) or `updatedAt` (for saved)
- Limited to 20 results by default, max 50

### `recordKeyword` (Mutation)

- Upserts on composite key `[projectId, userId, keyword]`
- On update: increments `analysisCount`, overwrites `last*` fields
- On create: initializes with count=1, isSaved=false
- Called automatically in `analyze` mutation's `onSuccess` callback

### `toggleSaveKeyword` (Mutation)

- Finds existing keyword or creates new one
- Toggles `isSaved` boolean
- When creating from toggle: sets `analysisCount: 0` (keyword was bookmarked
  but never analyzed by this user yet)

---

## 3. Frontend Components

### BenchmarkTrendChart

**File:** `apps/web/src/components/intelligence/BenchmarkTrendChart.tsx`

- **Library:** recharts (AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer)
- **Size:** 302 lines
- **Key features:**
  - Gradient fill with dynamic color based on average score
  - Reference line at score 50 (labeled "기준선")
  - Custom tooltip with score color, date, and highlight items
  - Direction badge with icon, Korean label, and percent change
  - Volatility + data point count summary text
  - Latest score large display (right-aligned)
  - Warning panel with amber background
  - Empty state with dashed border placeholder
- **Performance:** Uses `useMemo` for `chartData` and `dominantColor` to avoid
  recomputation on unrelated re-renders

### KeywordHistoryPanel

**File:** `apps/web/src/components/intelligence/KeywordHistoryPanel.tsx`

- **Library:** lucide-react (Star, Clock, BarChart3)
- **Size:** 201 lines
- **Key features:**
  - Signal quality dot (emerald/amber/red)
  - Industry badge with per-industry color
  - Analysis count with bar chart icon
  - Relative time display (Korean: N분 전, N시간 전, N일 전, N주 전, N개월 전)
  - Star bookmark toggle with stopPropagation
  - Active keyword highlight with blue left border
  - Skeleton loading state (3 animated rows)
  - Empty state message
- **Design system:** Uses CSS custom properties (--border, --card, --foreground,
  --muted-foreground, --accent) for theme compatibility

---

## 4. Page Integration

**File:** `apps/web/src/app/(dashboard)/intelligence/page.tsx`

### Import Changes

```typescript
import BenchmarkTrendChart from "@/components/intelligence/BenchmarkTrendChart";
import { KeywordHistoryPanel } from "@/components/intelligence/KeywordHistoryPanel";
```

### Removed Constants

```typescript
// RECENT_KEYWORDS removed -- now loaded from DB via intelligence.keywords
```

The hardcoded `RECENT_KEYWORDS` array was deleted. All keyword suggestions now
come from the `keywordsQuery` database query.

### New Queries and Mutations

```typescript
// Keyword history from DB
const keywordsQuery = trpc.intelligence.keywords.useQuery(
  { projectId, filter: "all", limit: 20 },
  { enabled: !!projectId },
);
const recordKeywordMutation = trpc.intelligence.recordKeyword.useMutation({
  onSuccess: () => keywordsQuery.refetch(),
});
const toggleSaveMutation = trpc.intelligence.toggleSaveKeyword.useMutation({
  onSuccess: () => keywordsQuery.refetch(),
});

// Benchmark trend
const benchmarkTrendQuery = trpc.intelligence.benchmarkTrend.useQuery(
  { projectId, seedKeyword, industryType, days: 30 },
  { enabled: !!projectId && !!analyzeMutation.data?.seedKeyword },
);
```

### Tab Addition

A "트렌드" tab was inserted into the section navigation (between "요약" and
"확장 그래프"):

```typescript
{ key: "trend", label: "트렌드" },
```

### Rendering Locations

`KeywordHistoryPanel` appears in two places:

1. **Empty state** -- below feature preview cards, when keywords exist in history
2. **Trend tab** -- below the BenchmarkTrendChart, when analysis result is active

`BenchmarkTrendChart` appears only in the trend tab.

---

## 5. Known Gaps

### No Keyword Deletion

There is no UI or endpoint to delete a keyword from history. Users can only
toggle the bookmark state. This means the keyword list will grow indefinitely
(bounded by the `limit` parameter on queries, default 20).

**Mitigation:** The `limit` parameter caps displayed keywords. Oldest non-saved
keywords will naturally fall off the visible list as new analyses occur.

### No Keyword Search/Filter UI

The `keywords` endpoint supports `filter: "all" | "saved" | "recent"` but
the UI does not expose filter controls. Users see all keywords in recency order
without the ability to search within their history.

### No Export

Benchmark trend data and keyword history cannot be exported (CSV, PDF, etc.).
This applies to both time-series data points and keyword metadata.

### Trend Data Requires Manual Accumulation

The BenchmarkSnapshot table is only populated when a user runs
`intelligence.analyze`. There is no background job or scheduled task to
automatically collect benchmark data. Users must actively run analyses over
multiple days to build up meaningful trend data.

**Impact:** First-time users will always see `INSUFFICIENT_DATA` until they
have run analyses on at least 3 separate days.

### No Trend Period Selector

The trend chart is fixed at 30 days. While the `days` parameter supports
1-365, the UI does not expose a date range picker or period selector.

### handleQuickKeyword Industry Race Condition

In `handleQuickKeyword`, the `industryType` passed to `analyzeMutation.mutate`
uses the current `selectedIndustry` state rather than the `industryHint` that
was just set via `setSelectedIndustry`. Due to React's batched state updates,
the first analysis after a quick keyword click may use the previous industry
selection. Subsequent clicks work correctly.

```typescript
// The industryHint is set...
if (industryHint) {
  setSelectedIndustry(industryHint as typeof selectedIndustry);
}
// ...but selectedIndustry is still the OLD value here
analyzeMutation.mutate({
  projectId,
  seedKeyword: kw,
  industryType: selectedIndustry,  // <-- stale
  socialData: socialDataPayload,
});
```

---

## 6. Database Performance Considerations

### Write Volume

Each analysis run creates at most:
- 1 `IntelligenceKeyword` upsert (fast, indexed composite key)
- 1 `BenchmarkSnapshot` upsert (fast, indexed composite key)

Both use upsert with unique constraint lookups, so performance is O(1).

### Read Volume

- `keywords` query: indexed scan on `[projectId, userId]` with limit
- `benchmarkTrend` query: range scan on `[projectId, keyword, date]` index

For typical usage (20 keywords, 30 days of snapshots), both queries return
small result sets and should complete in under 10ms on SQLite.

### Storage Growth

- `IntelligenceKeyword`: one row per unique (project, user, keyword) tuple
- `BenchmarkSnapshot`: one row per unique (project, keyword, industry, date) tuple
- Neither table grows unboundedly in normal usage patterns

---

## File References

- Schema: `packages/db/prisma/schema.prisma`
- Router: `packages/api/src/routers/intelligence.ts`
- Persistence: `packages/api/src/services/intelligence/intelligence-persistence.service.ts`
- BenchmarkTrendChart: `apps/web/src/components/intelligence/BenchmarkTrendChart.tsx`
- KeywordHistoryPanel: `apps/web/src/components/intelligence/KeywordHistoryPanel.tsx`
- Page: `apps/web/src/app/(dashboard)/intelligence/page.tsx`
