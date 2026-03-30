# Persistence Runtime Gap List — Consolidated Issues

> Generated: 2026-03-15
> Scope: All issues from Social Runtime, Intelligence Persistence, and History/Period Comparison audits
> Total issues: 22 (S1: 8, S2: 8, S3: 7)

---

## S1 — Must Fix Before Release

These issues represent broken core functionality or hard blockers. The system cannot ship to production with these unresolved.

| # | Title | Source | Description | Quick Fix | Structural Fix |
|---|-------|--------|-------------|-----------|----------------|
| 1 | Sentiment always null for social mentions — no LLM integration | Bridge | The bridge layer outputs `sentiment: null` for every social mention. No sentiment analysis (LLM, lexicon, or otherwise) is integrated anywhere in the pipeline. | N | Y |
| 2 | providerCoverage never populated in analyze | Router | The `analyze` mutation never computes or assigns `providerCoverage` before saving. The field is always `null` in the database, making it impossible to audit which providers contributed data. | N | Y |
| 3 | Null sentiment counted as neutral in snapshot | Router | Mentions with `null` sentiment are bucketed as `"neutral"` in the `liveMentions` snapshot, falsely reporting 100% neutral sentiment distribution. | Y | N |
| 4 | Date timezone parsing risk in period comparison | History | `new Date("2026-03-10")` is parsed as UTC midnight, causing potential off-by-one-day errors on servers with negative UTC offsets. Period boundaries may be silently wrong. | Y | N |
| 5 | Silent fallback to live analysis in period_vs_period | History | When historical data is missing for a requested period, the system silently runs live analysis instead of reporting insufficient data. Users unknowingly compare live data against live data. | N | Y |
| 6 | Instagram Graph API version may be outdated | Instagram | The adapter targets Graph API v19.0, which may be deprecated under Meta's rolling 2-year deprecation policy. If deprecated, all Instagram calls fail. | Y | N |
| 7 | TikTok requires Research API approval | TikTok | TikTok's Research API is access-gated and requires explicit approval. The adapter is a scaffold that cannot function without approved credentials. Business blocker. | N | Y |
| 8 | X requires paid Basic tier ($100/mo) | X | The X API free tier does not include search endpoints. The adapter requires the Basic tier at $100/month minimum. Cost/business decision required. | N | Y |

---

## S2 — Limited Launch Possible

These issues degrade data quality or performance but do not prevent core functionality. A limited launch is possible with these present, but they should be addressed promptly.

| # | Title | Source | Description | Quick Fix | Structural Fix |
|---|-------|--------|-------------|-----------|----------------|
| 1 | Quota tracking per-instance, no cross-request persistence | YouTube | YouTube quota counter resets on every new request. No shared quota state exists. Concurrent requests can silently exceed the 10,000-unit daily limit. | N | Y |
| 2 | Sequential adapter calls in registry (slow) | Registry | Adapters are called sequentially with `for...of` + `await`. Multi-provider queries take N times longer than necessary. | Y | N |
| 3 | No author info from Instagram hashtag search | Instagram | Hashtag search endpoint does not return author/username metadata. Mentions have no attribution. | N | Y |
| 4 | No Instagram token refresh logic (60-day expiry) | Instagram | Long-lived tokens expire after 60 days with no refresh mechanism. Instagram collection silently breaks after expiry. | N | Y |
| 5 | author_id returned instead of @handle for X | X | The adapter returns numeric `author_id` instead of resolving the `@handle`. Users see IDs instead of names in the UI. | Y | N |
| 6 | Topics only from Instagram, other adapters empty | Bridge | Topic extraction relies solely on Instagram hashtags. YouTube, TikTok, and X return empty topic arrays, making cross-provider topic analysis meaningless. | N | Y |
| 7 | Freshness hardcoded to "fresh" | Bridge | Every mention is labeled `"fresh"` regardless of actual publication date. Freshness filtering and sorting are non-functional. | Y | N |
| 8 | isStaleBased always false in analyze | Router | The `isStaleBased` flag is hardcoded to `false`. Users cannot tell whether an analysis used cached or fresh data. | Y | N |

---

## S3 — Improvement Recommended

These are minor issues, edge cases, or hardcoded defaults that should be improved but do not affect core functionality or data integrity at launch.

| # | Title | Source | Description | Quick Fix | Structural Fix |
|---|-------|--------|-------------|-----------|----------------|
| 1 | DST bug in YouTube quota reset | YouTube | Quota reset time uses hardcoded UTC-8 instead of `America/Los_Angeles`, causing a 1-hour offset during PDT (~7 months/year). | Y | N |
| 2 | testConnection burns 100 quota units | YouTube | Health checks use `search.list` (100 units) instead of a zero-cost endpoint. Automated monitoring can drain quota. | Y | N |
| 3 | Korean lang filter hardcoded in X | X | Search query appends `lang:ko`, excluding all non-Korean tweets. International campaigns get incomplete coverage. | Y | N |
| 4 | No pagination in X and Instagram | X, Instagram | Both adapters return only the first page of results (max ~25-100 items). Older or additional results are missed. | Y | N |
| 5 | Coverage count inconsistent (+1 for comments) | Bridge | Comments are counted as additional coverage items, inflating mention counts. A post with 500 comments reports as 501 coverage items. | Y | N |
| 6 | String-matching error classification fragile | Registry | Error types are determined by substring matching on error messages. Provider message changes break classification silently. | N | Y |
| 7 | No global quota enforcement | Registry | No registry-level quota budget or circuit breaker exists. Individual adapters track quota independently with no organization-wide spend limits. | N | Y |

---

## Issue Distribution

```
S1 ████████ 8 issues — Must fix before release
S2 ████████ 8 issues — Limited launch possible
S3 ███████  7 issues — Improvement recommended
   ───────────────────
   Total:  22 issues
```

## Quick Fix vs Structural Fix Summary

| Category | Quick Fix (Y) | Structural Fix Only | Both Needed |
|----------|---------------|---------------------|-------------|
| S1       | 3             | 5                   | 0           |
| S2       | 4             | 4                   | 0           |
| S3       | 5             | 2                   | 0           |
| **Total**| **12**        | **11**              | **0**       |

> 12 of 22 issues have quick fixes available. Addressing all quick fixes would resolve 3 S1 issues, 4 S2 issues, and 5 S3 issues — a meaningful reduction in risk with minimal engineering effort.
