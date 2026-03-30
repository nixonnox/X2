# Intelligence Pre-QA Fix List

> Issues that MUST be fixed before QA | 2026-03-15

## Summary

| Priority | Count | Time Budget | Description |
|----------|-------|-------------|-------------|
| **P1 — Must fix now** | 5 | ~2.5 hours | Blocks QA or causes incorrect data |
| **P2 — Fix before QA** | 3 | ~2.5 hours | Correctness and reliability improvements |
| **P3 — Can wait for beta** | 4 | ~6+ hours | Feature completeness, not blocking |
| **Total** | **12** | ~11+ hours | |

---

## Priority 1 — Must Fix Now (< 30 min each)

These issues block QA or cause visibly incorrect behavior.

| # | Issue | Gap Ref | What to Do | Est. Time | Severity |
|---|-------|---------|-----------|-----------|----------|
| 1 | **Bell dropdown not functional** | S0-1 | Add `onClick` handler to bell icon; query `GET /notifications?unread=true`; render simple dropdown list with mark-as-read action | 30 min | `S0` |
| 2 | **sourceId missing projectId in dedup** | S1-1 | Include `projectId` in the SHA-256 hash input string: `${projectId}:${keyword}:${conditionType}:${value}` | 15 min | `S1` |
| 3 | **createAlertNotification no try-catch** | S1-2 | Wrap the `prisma.notification.create` call in try-catch; log error with context; return `null` instead of throwing | 15 min | `S1` |
| 4 | **providerCoverage never populated** | S1-4 | After bridge collects adapter responses, build `providerCoverage` object (`{ youtube: true, instagram: true, ... }`) and pass it to `saveAnalysisRun` | 20 min | `S1` |
| 5 | **Null sentiment counted as neutral** | S1-5 | In sentiment distribution computation, add explicit `null` bucket separate from `NEUTRAL`; update UI to show "unanalyzed" count | 20 min | `S1` |

**Subtotal: ~1 hour 40 minutes**

---

## Priority 2 — Fix Before QA (< 1 hour each)

These improve correctness and prevent confusing QA results.

| # | Issue | Gap Ref | What to Do | Est. Time | Severity |
|---|-------|---------|-----------|-----------|----------|
| 6 | **Generic SYSTEM_ALERT type** | S1-3 | Add `INTELLIGENCE_ALERT` to `NotificationType` enum in Prisma schema; run migration; update `createAlertNotification` to use it; update notification list query to filter by type | 45 min | `S1` |
| 7 | **Date normalization in period comparison** | S1-6 | Replace `new Date(dateString)` with explicit UTC parsing: `new Date(dateString + 'T00:00:00Z')`; ensure all date comparisons use UTC consistently | 30 min | `S1` |
| 8 | **Silent fallback to live analysis** | S1-7 | When `period_vs_period` falls back to live analysis, add `comparisonReliability: 'LOW'` and `fallbackReason: 'insufficient_historical_data'` to the response; surface this in the UI as an info banner | 45 min | `S1` |

**Subtotal: ~2 hours**

---

## Priority 3 — Can Wait for Beta

These are feature completeness items. They do not block QA.

| # | Issue | Gap Ref | What to Do | Est. Time | Severity |
|---|-------|---------|-----------|-----------|----------|
| 9 | **Email delivery** | S2-6 | Implement email notification handler using existing mail service; add email template for intelligence alerts; wire into notification dispatch | 2 hr | `S2` |
| 10 | **Period aggregation** | S2-4 | Replace single-latest-run logic with aggregation across all runs in window; compute mean/median for each metric; add `sampleSize` to response | 2 hr | `S2` |
| 11 | **Trend chart anomaly markers** | S2-3 | Add recharts `ReferenceDot` markers at data points where value exceeds 1.5 standard deviations from rolling average; tooltip shows anomaly description | 1 hr | `S2` |
| 12 | **Dashboard card warning drill-down** | S3-5 | Replace string-matching warning count with structured `warningCount` field from analysis run; add click handler to navigate to filtered history view | 1 hr | `S3` |

**Subtotal: ~6 hours**

---

## Execution Order

```
Phase A (before QA starts):
  P1-1 Bell dropdown          ████████████████ 30m
  P1-2 sourceId fix           ████████ 15m
  P1-3 try-catch              ████████ 15m
  P1-4 providerCoverage       ██████████ 20m
  P1-5 Null sentiment         ██████████ 20m
  P2-6 NotificationType enum  ██████████████████████ 45m
  P2-7 Date normalization     ████████████████ 30m
  P2-8 Fallback warning       ██████████████████████ 45m
                               ─────────────────────────
                               Total: ~3h 40m

Phase B (before beta):
  P3-9  Email delivery         ████████████████████████████████████████ 2h
  P3-10 Period aggregation     ████████████████████████████████████████ 2h
  P3-11 Anomaly markers        ████████████████████ 1h
  P3-12 Warning drill-down     ████████████████████ 1h
                               ─────────────────────────
                               Total: ~6h
```

---

## Cross-Reference

- Gap Register: `INTELLIGENCE_RUNTIME_GAP_REGISTER.md`
- End-to-End Verification: `INTELLIGENCE_END_TO_END_VERIFICATION.md`
- Product Readiness: `INTELLIGENCE_PRODUCT_READINESS_CHECK.md`
