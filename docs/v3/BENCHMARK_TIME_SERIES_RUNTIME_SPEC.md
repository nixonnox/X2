# Benchmark Time-Series Runtime Spec

## Overview

The `intelligence.benchmarkTrend` endpoint provides time-series data for benchmark scores,
enabling trend visualization over a configurable period. It reads from the `BenchmarkSnapshot`
table, which is populated as a side-effect of every `intelligence.analyze` call that produces
a benchmark comparison result.

---

## Endpoint: `intelligence.benchmarkTrend`

**Type:** `protectedProcedure.query`

### Input

```typescript
z.object({
  projectId: z.string(),
  seedKeyword: z.string().min(1),
  industryType: z.enum(["BEAUTY", "FNB", "FINANCE", "ENTERTAINMENT"]),
  days: z.number().min(1).max(365).default(30),
})
```

| Field          | Required | Default | Description                           |
|----------------|----------|---------|---------------------------------------|
| `projectId`    | Yes      | -       | Scoping project                       |
| `seedKeyword`  | Yes      | -       | Keyword to fetch trend for            |
| `industryType` | Yes      | -       | Industry vertical filter              |
| `days`         | No       | 30      | Lookback window in days (1-365)       |

### Output

```typescript
{
  hasData: boolean;
  dataPoints: Array<{
    date: string;           // "YYYY-MM-DD"
    overallScore: number;   // 0-100
    comparisons: unknown[];
    highlights: string[] | null;
    warnings: string[] | null;
  }>;
  trendSummary: {
    direction: "RISING" | "DECLINING" | "STABLE" | "VOLATILE" | "INSUFFICIENT_DATA";
    changePercent: number;
    volatility: "HIGH" | "MODERATE" | "LOW" | "UNKNOWN";
    dataPointCount: number;
    periodDays: number;
    latestScore?: number;
    previousScore?: number | null;
  };
  warnings: string[];
}
```

---

## Data Source: BenchmarkSnapshot Table

### Prisma Model

```prisma
model BenchmarkSnapshot {
  id           String   @id @default(cuid())
  projectId    String
  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  date         DateTime @db.Date
  keyword      String
  industryType String

  overallScore Float    @default(0)
  comparisons  Json     // Array of metric comparison objects
  highlights   Json?    // Array of highlight strings
  warnings     Json?    // Array of warning strings

  createdAt    DateTime @default(now())

  @@unique([projectId, keyword, industryType, date])
  @@index([projectId, keyword, date(sort: Desc)])
  @@map("benchmark_snapshots")
}
```

### Composite Unique Key

`[projectId, keyword, industryType, date]` -- daily upsert. Running analysis
multiple times on the same day for the same keyword/industry updates the existing
snapshot rather than creating duplicates.

### Write Path

Inside the `intelligence.analyze` mutation, after a successful signal fusion:

```typescript
if (intel.benchmarkComparison) {
  await persistence.saveBenchmarkSnapshot({
    projectId: input.projectId,
    keyword: input.seedKeyword,
    industryType,
    date: todayDate(),
    overallScore: intel.benchmarkComparison.overallScore ?? 0,
    comparisons: intel.benchmarkComparison.comparisons ?? [],
    highlights: intel.benchmarkComparison.highlights,
    warnings: intel.benchmarkComparison.warnings,
  });
}
```

The `saveBenchmarkSnapshot` method uses Prisma `upsert` on the composite key:

```typescript
async saveBenchmarkSnapshot(input: SaveBenchmarkSnapshotInput): Promise<string> {
  const snapshot = await this.prisma.benchmarkSnapshot.upsert({
    where: {
      projectId_keyword_industryType_date: {
        projectId: input.projectId,
        keyword: input.keyword,
        industryType: input.industryType,
        date: input.date,
      },
    },
    update: { overallScore, comparisons, highlights, warnings },
    create: { projectId, keyword, industryType, date, overallScore, comparisons, highlights, warnings },
  });
  return snapshot.id;
}
```

---

## Trend Computation

### Direction

Determined by the first and last `overallScore` values in the period and the
coefficient of variation (CV):

| Condition                 | Direction           |
|---------------------------|---------------------|
| `scores.length < 3`      | `INSUFFICIENT_DATA` |
| `cv > 0.25`              | `VOLATILE`          |
| `changePercent > 10`      | `RISING`            |
| `changePercent < -10`     | `DECLINING`         |
| Otherwise                 | `STABLE`            |

`changePercent = ((lastScore - firstScore) / firstScore) * 100`

### Volatility

Uses coefficient of variation: `cv = stddev / mean`

| CV Range       | Volatility   |
|----------------|--------------|
| `< 3 points`  | `UNKNOWN`    |
| `cv > 0.3`    | `HIGH`       |
| `cv > 0.1`    | `MODERATE`   |
| `cv <= 0.1`   | `LOW`        |

### Warnings

- **Insufficient data:** Emitted when `dataPointCount < 7`. Message explains that at
  least 7 days of data are needed for reliable trend analysis.
- **High volatility:** Emitted when `direction === "VOLATILE"`. Indicates that scores
  fluctuate too much for a clear trend.

---

## UI: BenchmarkTrendChart Component

**File:** `apps/web/src/components/intelligence/BenchmarkTrendChart.tsx`

### Architecture

- Built with `recharts` (`AreaChart`, `Area`, `XAxis`, `YAxis`, `CartesianGrid`,
  `Tooltip`, `ReferenceLine`, `ResponsiveContainer`).
- Icons from `lucide-react`: `TrendingUp`, `TrendingDown`, `Minus`, `Activity`,
  `HelpCircle`, `AlertTriangle`.

### Layout

1. **Trend summary badge** -- colored pill showing direction icon, label (Korean),
   and `changePercent`. Adjacent text shows volatility label and data stats.
   Latest score displayed on the right side in large bold text.

2. **Area chart** (280px height) -- `monotone` interpolation, gradient fill from
   dominant color (green >70, amber 40-70, red <40) at 30% opacity down to 2%.
   Reference line at y=50 labeled "기준선". Custom tooltip shows date, score with
   color coding, and up to 5 highlight items.

3. **Warnings panel** -- amber background box with `AlertTriangle` icon, lists
   all warning strings.

### Empty State

When `hasData === false`, renders a dashed-border placeholder with text:
"이 기간에 벤치마크 데이터가 없습니다. 분석을 실행하여 데이터를 누적하세요."

### Color Scheme

| Score Range | Color   | Hex       |
|-------------|---------|-----------|
| > 70        | Green   | `#22c55e` |
| 40-70       | Amber   | `#f59e0b` |
| < 40        | Red     | `#ef4444` |

### Direction Config Map

| Direction          | Icon          | Background   | Label         |
|--------------------|---------------|--------------|---------------|
| `RISING`           | TrendingUp    | `bg-green-50`| 상승 추세     |
| `DECLINING`        | TrendingDown  | `bg-red-50`  | 하락 추세     |
| `STABLE`           | Minus         | `bg-blue-50` | 안정적        |
| `VOLATILE`         | Activity      | `bg-amber-50`| 변동성 높음   |
| `INSUFFICIENT_DATA`| HelpCircle    | `bg-gray-50` | 데이터 부족   |

---

## Page Integration

In `intelligence/page.tsx`, the trend query is activated when an analysis result exists:

```typescript
const benchmarkTrendQuery = trpc.intelligence.benchmarkTrend.useQuery(
  {
    projectId: projectId ?? "",
    seedKeyword: analyzeMutation.data?.seedKeyword ?? "",
    industryType: analyzeMutation.data?.industryType ?? "BEAUTY",
    days: 30,
  },
  { enabled: !!projectId && !!analyzeMutation.data?.seedKeyword },
);
```

Rendered under the "트렌드" tab alongside the `KeywordHistoryPanel`.

---

## File References

- Router: `packages/api/src/routers/intelligence.ts` (lines 773-889)
- Persistence: `packages/api/src/services/intelligence/intelligence-persistence.service.ts`
- Component: `apps/web/src/components/intelligence/BenchmarkTrendChart.tsx`
- Page: `apps/web/src/app/(dashboard)/intelligence/page.tsx`
- Schema: `packages/db/prisma/schema.prisma` (BenchmarkSnapshot model)
