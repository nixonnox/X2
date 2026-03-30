# Intelligence Re-entry Flow Verification

> Generated: 2026-03-15
> Scope: Manual analysis, quick keyword, bookmark toggle, trend tab, empty state flows

---

## Verified Flows

| # | Flow | Steps | Status |
|---|------|-------|--------|
| 1 | Manual analysis | Type keyword -> click "분석" -> `analyzeMutation` -> `onSuccess` -> `recordKeyword` -> `keywordsQuery.refetch` -> UI updates | PASS |
| 2 | Quick keyword | Click DB keyword button -> `handleQuickKeyword(keyword, industryHint)` -> auto-analyze | PASS |
| 3 | Bookmark toggle | Click star -> `toggleSaveKeyword` -> refetch | PASS |
| 4 | Trend tab | Shows `BenchmarkTrendChart` + `KeywordHistoryPanel` together | PASS |
| 5 | Empty state | Shows `KeywordHistoryPanel` if keywords exist | PASS |

---

## Issues Found

| # | Severity | Title | Description | Actual Impact | Quick Fix | Structural Fix |
|---|----------|-------|-------------|---------------|-----------|----------------|
| 1 | ![S0](https://img.shields.io/badge/S0-Critical-red) | `period_vs_period` compare has no date picker UI | Backend supports `periodStart`/`periodEnd` parameters for period-based comparison, but the frontend compare page (`compare/page.tsx`) never renders date picker inputs and never passes these parameters. The compare button stays disabled for period mode. | The period comparison mode is completely non-functional from the user's perspective. Users can see the option but cannot use it, creating a broken UX promise. | N | Y |
| 2 | ![S2](https://img.shields.io/badge/S2-Moderate-yellow) | No keyword search/filter UI | `KeywordHistoryPanel` renders all keywords in a flat list. With many keywords accumulated over time, there is no search box, filter dropdown, or pagination. | Users with extensive analysis history cannot efficiently locate a specific keyword. List becomes unwieldy beyond ~20 items. | Y | N |
| 3 | ![S2](https://img.shields.io/badge/S2-Moderate-yellow) | Dashboard landing has no keyword integration | The main dashboard route does not import or display any keyword-related component. Users must navigate to `/intelligence` to access keyword history or re-run analyses. | Breaks the "single pane of glass" dashboard concept. Re-entry to previous analyses requires extra navigation steps. | Y | N |

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Intelligence Page                      │
│                                                          │
│  ┌──────────────┐    ┌──────────────────────────────┐   │
│  │ Keyword Input │───>│ analyzeMutation.mutate()     │   │
│  └──────────────┘    └──────────┬───────────────────┘   │
│                                  │ onSuccess             │
│  ┌──────────────┐    ┌──────────▼───────────────────┐   │
│  │ Quick Keyword │───>│ recordKeyword() + refetch   │   │
│  │ (from panel)  │    └──────────┬───────────────────┘   │
│  └──────────────┘               │                        │
│                       ┌─────────▼────────────────────┐  │
│                       │ KeywordHistoryPanel (updated) │  │
│                       │  ★ star = toggleSave          │  │
│                       │  click = handleQuickKeyword   │  │
│                       └──────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Trend Tab                                         │   │
│  │  BenchmarkTrendChart + KeywordHistoryPanel        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Compare Tab                                       │   │
│  │  ⚠ period_vs_period: NO date picker UI (S0)      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Summary

- **Total verified flows:** 5
- **Total issues:** 3
- **By severity:** S0: 1 | S1: 0 | S2: 2
- **Blocking for launch:** S0 #1 (missing date picker) makes period comparison unusable. Must be implemented or the mode should be hidden.
