# Keyword History DB Verification Report

> Generated: 2026-03-15
> Scope: `IntelligenceKeyword` Prisma model, keyword CRUD endpoints, `KeywordHistoryPanel` UI

---

## Verified Correct

| # | Item | Status |
|---|------|--------|
| 1 | `IntelligenceKeyword` Prisma model with all required fields | PASS |
| 2 | Composite unique constraint: `[projectId, userId, keyword]` | PASS |
| 3 | Project relation with cascade delete | PASS |
| 4 | `keywords` endpoint: real DB query (`intelligenceKeyword.findMany`) | PASS |
| 5 | `recordKeyword`: real DB upsert (increments `analysisCount` on update) | PASS |
| 6 | `toggleSaveKeyword`: real DB toggle (creates if not exists) | PASS |
| 7 | No localStorage, no mock data, no hardcoded arrays | PASS |
| 8 | `RECENT_KEYWORDS` constant removed, replaced with DB query | PASS |
| 9 | `KeywordHistoryPanel`: keyword list with star, industry badge, signal dot, relative time, analysis count | PASS |
| 10 | Empty state and loading skeleton | PASS |
| 11 | `recordKeyword` called after analysis success (`onSuccess` callback) | PASS |
| 12 | `toggleSave` connected to star click with `stopPropagation` | PASS |

---

## Issues Found

| # | Severity | Title | Description | Actual Impact | Quick Fix | Structural Fix |
|---|----------|-------|-------------|---------------|-----------|----------------|
| 1 | ![S1](https://img.shields.io/badge/S1-Major-orange) | No `userId` in `BenchmarkSnapshot` (multi-user data isolation gap) | `IntelligenceKeyword` correctly scopes data to `[projectId, userId]`, but `BenchmarkSnapshot` only has `projectId` — no `userId` column. | In a multi-user project, all users share the same benchmark snapshots. User A's analysis results are visible to (and overwritten by) User B. Keywords are isolated but the benchmark data they reference is not. | N | Y |
| 2 | ![S2](https://img.shields.io/badge/S2-Moderate-yellow) | `KeywordHistoryPanel` hidden in empty state until first analysis | The panel component exists but is not rendered when the keyword list is empty. Users see a blank area with no indication that keyword history will appear after their first analysis. | First-time users may not discover the keyword history feature. No affordance or onboarding hint is shown. | Y | N |
| 3 | ![S2](https://img.shields.io/badge/S2-Moderate-yellow) | Dashboard view not updated with keyword history | The main dashboard landing page has no keyword history widget or quick-access link. Users must navigate to the Intelligence page to see their keyword history. | Reduces discoverability. Power users who start from the dashboard cannot quickly re-run a previous keyword analysis without navigating away. | Y | N |

---

## Summary

- **Total verified items:** 12
- **Total issues:** 3
- **By severity:** S0: 0 | S1: 1 | S2: 2
- **Key risk:** S1 #1 (userId isolation gap) can cause data leakage in multi-user projects. Must be addressed before multi-tenancy is enabled.
