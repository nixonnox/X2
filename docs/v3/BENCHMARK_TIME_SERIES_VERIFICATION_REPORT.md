# Benchmark Time-Series Verification Report

> Generated: 2026-03-15
> Scope: `benchmarkTrend` endpoint, `BenchmarkTrendChart` component, snapshot persistence

---

## Verified Correct

| # | Item | Status |
|---|------|--------|
| 1 | `benchmarkTrend` endpoint queries real `BenchmarkSnapshot` via `persistence.getBenchmarkSnapshots()` | PASS |
| 2 | Period is configurable 1-365 days (default 30), not fixed | PASS |
| 3 | Trend computation: RISING (>10%), DECLINING (<-10%), STABLE, VOLATILE (cv>0.25), INSUFFICIENT_DATA (<3 points) | PASS |
| 4 | Volatility: coefficient of variation (HIGH >0.3, MODERATE >0.1, LOW, UNKNOWN <3) | PASS |
| 5 | Empty data returns `hasData=false` with user-friendly warning | PASS |
| 6 | No mock/hardcoded values | PASS |
| 7 | `BenchmarkTrendChart`: recharts `AreaChart`, gradient fill, `ReferenceLine` at 50 | PASS |
| 8 | Custom tooltip with date, score, highlights | PASS |
| 9 | Empty state with dashed border and message | PASS |
| 10 | Warnings displayed at bottom | PASS |

---

## Issues Found

| # | Severity | Title | Description | Actual Impact | Quick Fix | Structural Fix |
|---|----------|-------|-------------|---------------|-----------|----------------|
| 1 | ![S0](https://img.shields.io/badge/S0-Critical-red) | Period comparison uses single latest run, not period aggregation | `intelligence.ts:520` — period comparison only uses `runs[0]!` (the LATEST run per period) instead of aggregating all runs within that period. | User expects a period average but receives a single arbitrary snapshot. This makes period-over-period comparison unreliable and misleading when multiple analyses exist within a period. | N | Y |
| 2 | ![S1](https://img.shields.io/badge/S1-Major-orange) | No benchmark trend chart in compare page | The compare view is advertised as a feature but lacks trend visualization. Only tabular data is shown; the `BenchmarkTrendChart` component is not rendered in the compare route. | Users cannot visually compare benchmark evolution between two periods or keywords, reducing the compare page's analytical value. | Y | N |
| 3 | ![S2](https://img.shields.io/badge/S2-Moderate-yellow) | No anomaly markers on chart | Trend summary computes and reports VOLATILE status, but the `BenchmarkTrendChart` renders no visual markers on the specific data points that contribute to volatility. | Users see a "volatile" label but cannot identify which points are anomalous without manually inspecting the curve. Reduces actionability of the volatility signal. | Y | N |
| 4 | ![S1](https://img.shields.io/badge/S1-Major-orange) | Snapshot overwrite within same day | A second analysis on the same day overwrites the first `BenchmarkSnapshot`. No version tracking or append logic exists for intra-day runs. | Historical data is silently lost if a user runs multiple analyses per day. Trend accuracy degrades because data points disappear. | N | Y |

---

## Summary

- **Total verified items:** 10
- **Total issues:** 4
- **By severity:** S0: 1 | S1: 2 | S2: 1
- **Blocking for launch:** S0 #1 (period aggregation) must be resolved before period comparison can be trusted.
