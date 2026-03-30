# Intelligence Runtime Gap Register

> Final Integrated Audit — Consolidated from 3 verification rounds | 2026-03-15

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| **S0 — Blocker** | 1 | Prevents core functionality from being usable |
| **S1 — Significant** | 8 | Incorrect behavior, data integrity risk, or silent failure |
| **S2 — Moderate** | 8 | Performance, UX, or completeness gaps acceptable for alpha |
| **S3 — Minor** | 5 | Edge cases, hardcoded values, cosmetic issues |
| **Total** | **22** | |

---

## S0 — Blocker (1)

| # | Issue | Location | Impact | Discovered |
|---|-------|----------|--------|------------|
| S0-1 | Bell icon non-functional (no `onClick` handler, no dropdown component) | Header component | Alerts are persisted in DB but completely invisible to users — no way to discover or read alerts from the UI | Round 2 |

---

## S1 — Significant (8)

| # | Issue | Location | Impact | Discovered |
|---|-------|----------|--------|------------|
| S1-1 | `sourceId` missing `projectId` in alert deduplication hash | Alert service | Same keyword analyzed in different projects produces identical dedup hash — cross-project alert suppression | Round 3 |
| S1-2 | `createAlertNotification` has no internal try-catch | Alert service | Unhandled DB error during notification write crashes the entire analysis pipeline instead of gracefully degrading | Round 2 |
| S1-3 | Uses generic `SYSTEM_ALERT` notification type | Alert service | Cannot distinguish intelligence alerts from system notifications in queries or UI filtering | Round 2 |
| S1-4 | `providerCoverage` never populated in `analyze` result | Intelligence bridge | `saveAnalysisRun` writes `null` for provider coverage — historical runs lack adapter response metadata | Round 3 |
| S1-5 | Null sentiment counted as `NEUTRAL` in distribution | Signal fusion | Inflates neutral count; masks missing sentiment analysis — especially for social mentions where no LLM is attached | Round 1 |
| S1-6 | Date timezone parsing risk in period comparison | Period comparison service | `new Date(dateString)` without explicit timezone — server timezone affects which runs fall in which window | Round 3 |
| S1-7 | Silent fallback to live analysis in `period_vs_period` | Period comparison service | When no historical runs exist, falls back to live collection without informing the user — comparison result looks real but compares live vs live | Round 2 |
| S1-8 | Sentiment always `null` for social mentions (no LLM integration) | Social adapters | All 4 adapters return `sentiment: null`; no post-processing step assigns sentiment — the entire sentiment distribution feature depends on data that is never produced | Round 1 |

---

## S2 — Moderate (8)

| # | Issue | Location | Impact | Discovered |
|---|-------|----------|--------|------------|
| S2-1 | Quota tracking per-instance (no cross-request persistence) | YouTube adapter | In-memory quota counter resets on server restart; does not account for concurrent requests from multiple instances | Round 1 |
| S2-2 | Sequential adapter calls (slow) | Intelligence bridge | 4 adapters called sequentially; total latency = sum of all adapter response times (~3-8s typical) instead of max (~2-3s with parallel) | Round 1 |
| S2-3 | No anomaly markers on trend chart | BenchmarkTrendChart component | Spikes and drops in benchmark data are not visually highlighted — user must manually inspect the line | Round 2 |
| S2-4 | Period comparison uses single latest run per window | Period comparison service | One outlier run can skew the entire comparison; no aggregation across multiple runs within a window | Round 2 |
| S2-5 | No date picker UI for `period_vs_period` | Intelligence page | Period comparison is only accessible via API with manual date parameters; no frontend control exists | Round 2 |
| S2-6 | Email/WebSocket delivery not implemented | Notification service | Only `IN_APP` channel works; `EMAIL` and `WEBHOOK` are defined in schema but handler code is a stub | Round 1 |
| S2-7 | TikTok adapter requires Research API approval | TikTok adapter | Returns empty signal array until ByteDance grants access — external dependency, not a code bug | Round 1 |
| S2-8 | X adapter requires paid Basic tier | X adapter | Returns empty signal array on free-tier keys — external dependency, not a code bug | Round 1 |

---

## S3 — Minor (5)

| # | Issue | Location | Impact | Discovered |
|---|-------|----------|--------|------------|
| S3-1 | DST bug in YouTube quota reset logic | YouTube adapter | Uses `setHours(0,0,0,0)` for midnight PST reset — off by 1 hour during DST transitions (2 days/year) | Round 3 |
| S3-2 | Korean language filter hardcoded in X adapter | X adapter | `lang:ko` parameter is hardcoded — non-Korean projects get Korean-only results from X | Round 3 |
| S3-3 | Hardcoded cooldown values (24h) | Alert service | Cooldown period is a magic number, not configurable per project or per condition type | Round 2 |
| S3-4 | No alert history logging (audit trail) | Alert service | Triggered alerts are persisted as notifications but there is no separate log of condition evaluation results (including non-triggering evaluations) | Round 3 |
| S3-5 | Dashboard card warning count uses string matching | IntelligenceSummaryCard | Warning count is derived by string-matching `"warning"` in analysis text instead of using a structured field | Round 3 |

---

## Cross-Reference

- Pre-QA Fix List: `INTELLIGENCE_PRE_QA_FIXLIST.md`
- End-to-End Verification: `INTELLIGENCE_END_TO_END_VERIFICATION.md`
- Product Readiness: `INTELLIGENCE_PRODUCT_READINESS_CHECK.md`
