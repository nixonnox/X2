# Time-Series and Keyword Gap List (Consolidated)

> Generated: 2026-03-15
> Source reports: BENCHMARK_TIME_SERIES_VERIFICATION_REPORT, KEYWORD_HISTORY_DB_VERIFICATION_REPORT, INTELLIGENCE_REENTRY_FLOW_VERIFICATION

---

## S0 — Critical (2 issues)

| # | Title | Location | Description | Actual Impact | Quick Fix | Structural Fix |
|---|-------|----------|-------------|---------------|-----------|----------------|
| 1 | Period comparison uses single latest run, not period aggregation | `intelligence.ts:520` | Period comparison takes `runs[0]!` (latest run only) instead of aggregating all runs within the specified period. | User expects a period average but receives a single snapshot. Period-over-period comparison is unreliable and misleading when multiple analyses exist within a period. | N | Y |
| 2 | `period_vs_period` compare has no date picker UI | `compare/page.tsx` | Backend accepts `periodStart`/`periodEnd` but frontend never renders date picker inputs and never passes these parameters. Compare button stays disabled for period mode. | Period comparison mode is completely non-functional from the UI. Users see the option but cannot use it. | N | Y |

---

## S1 — Major (4 issues)

| # | Title | Location | Description | Actual Impact | Quick Fix | Structural Fix |
|---|-------|----------|-------------|---------------|-----------|----------------|
| 3 | No benchmark trend chart in compare view | `compare/page.tsx` | Compare page shows tabular data only. `BenchmarkTrendChart` is not rendered in the compare route despite being available. | Users cannot visually compare benchmark evolution between two periods or keywords. Reduces analytical value of the compare feature. | Y | N |
| 4 | Snapshot overwrite within same day | Snapshot persistence layer | A second analysis on the same day overwrites the first `BenchmarkSnapshot`. No version tracking or append logic for intra-day runs. | Historical data is silently lost with multiple daily analyses. Trend accuracy degrades as data points disappear. | N | Y |
| 5 | No `userId` in `BenchmarkSnapshot` (multi-user isolation gap) | Prisma schema / `BenchmarkSnapshot` model | Keywords are scoped to `[projectId, userId]` but `BenchmarkSnapshot` only has `projectId`. No user-level isolation for benchmark data. | In multi-user projects, all users share and overwrite each other's benchmark snapshots. Data leakage risk. | N | Y |
| 6 | Inefficient re-sort of already-sorted benchmark data | Trend computation logic | Benchmark snapshots are queried with `orderBy` from Prisma but then re-sorted in application code before trend computation. | Unnecessary CPU usage on large snapshot sets. No data correctness impact but degrades performance at scale. | Y | N |

---

## S2 — Moderate (3 issues)

| # | Title | Location | Description | Actual Impact | Quick Fix | Structural Fix |
|---|-------|----------|-------------|---------------|-----------|----------------|
| 7 | No anomaly markers on benchmark trend chart | `BenchmarkTrendChart` component | Trend summary reports VOLATILE status but the chart renders no visual markers on the specific anomalous data points. | Users see "volatile" label but cannot identify which points are anomalous. Reduces actionability. | Y | N |
| 8 | `KeywordHistoryPanel` hidden until first analysis | `KeywordHistoryPanel` render logic | Panel is not rendered when keyword list is empty. No placeholder or onboarding hint for new users. | First-time users may not discover keyword history feature. No affordance shown. | Y | N |
| 9 | Dashboard not integrated with keyword history | Dashboard route / main layout | Main dashboard has no keyword history widget or quick-access link. Must navigate to `/intelligence` for keyword features. | Extra navigation steps for re-entry. Power users cannot quickly re-run previous analyses from dashboard. | Y | N |

---

## Summary by Severity

| Severity | Count | Quick Fixable | Needs Structural Fix |
|----------|-------|---------------|----------------------|
| ![S0](https://img.shields.io/badge/S0-Critical-red) | 2 | 0 | 2 |
| ![S1](https://img.shields.io/badge/S1-Major-orange) | 4 | 2 | 2 |
| ![S2](https://img.shields.io/badge/S2-Moderate-yellow) | 3 | 3 | 0 |
| **Total** | **9** | **5** | **4** |

---

## Recommended Fix Order

1. **S0 #1** — Period aggregation logic (backend fix, blocks comparison reliability)
2. **S0 #2** — Date picker UI for period compare (frontend, unblocks the feature)
3. **S1 #5** — Add `userId` to `BenchmarkSnapshot` (schema migration, blocks multi-tenancy)
4. **S1 #4** — Snapshot versioning (persistence layer change, prevents data loss)
5. **S1 #3** — Add trend chart to compare view (frontend, reuse existing component)
6. **S1 #6** — Remove redundant re-sort (quick performance win)
7. **S2 #7-9** — UI polish items (can be batched in a single sprint)
