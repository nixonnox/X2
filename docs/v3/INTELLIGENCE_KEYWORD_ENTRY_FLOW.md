# Intelligence Keyword Entry Flow

## Overview

This document describes the end-to-end user interaction flows for keyword analysis,
bookmarking, and quick keyword selection on the Intelligence Hub page. All flows
converge on the same analysis pipeline and keyword history system.

---

## Flow 1: Manual Keyword Analysis

### Sequence

```
User types keyword
  -> clicks "분석" button (or presses Enter)
    -> handleAnalyze()
      -> analyzeMutation.mutate({ projectId, seedKeyword, industryType, socialData })
        -> onSuccess callback
          -> recordKeywordMutation.mutate({
               projectId, keyword, industryType, industryLabel,
               confidence, freshness, signalHint
             })
            -> onSuccess: keywordsQuery.refetch()
              -> UI updates: quick keyword buttons refresh
```

### Code Path

```typescript
const handleAnalyze = useCallback(() => {
  if (!projectId || !seedKeyword.trim()) return;
  analyzeMutation.mutate(
    {
      projectId,
      seedKeyword: seedKeyword.trim(),
      industryType: selectedIndustry,
      socialData: socialDataPayload,
    },
    {
      onSuccess: (data) => {
        recordKeywordMutation.mutate({
          projectId,
          keyword: data.seedKeyword,
          industryType: data.industryType,
          industryLabel: data.industryLabel,
          confidence: data.metadata.confidence,
          freshness: data.metadata.freshness as string,
          signalHint: data.intelligence.signalQuality.overallRichness,
        });
      },
    },
  );
}, [projectId, seedKeyword, selectedIndustry, socialDataPayload, analyzeMutation, recordKeywordMutation]);
```

### State Changes

1. `analyzeMutation.isPending` -> loading spinner on button
2. `analyzeMutation.data` populated -> result section renders
3. `recordKeywordMutation` fires -> keyword upserted in DB
4. `keywordsQuery.refetch()` -> quick keyword buttons update
5. `benchmarkTrendQuery` becomes enabled (depends on `analyzeMutation.data`)

---

## Flow 2: Bookmark Toggle

### Sequence

```
User clicks star icon on keyword row
  -> e.stopPropagation() (prevents row click)
    -> onToggleSave(keyword)
      -> toggleSaveMutation.mutate({ projectId, keyword })
        -> onSuccess: keywordsQuery.refetch()
          -> UI updates: star fills/unfills, quick buttons re-sorted
```

### Code Path

```typescript
const toggleSaveMutation = trpc.intelligence.toggleSaveKeyword.useMutation({
  onSuccess: () => keywordsQuery.refetch(),
});
```

In KeywordHistoryPanel:

```typescript
<button
  onClick={(e) => {
    e.stopPropagation();
    onToggleSave(kw.keyword);
  }}
>
  <Star className={kw.isSaved ? "fill-amber-400 text-amber-400" : "text-gray-400"} />
</button>
```

### Backend Behavior

1. Finds existing record by `[projectId, userId, keyword]`
2. If found: toggles `isSaved` boolean
3. If not found: creates new record with `isSaved: true`, `analysisCount: 0`
4. Returns `{ id, isSaved }` -- the new state

### Visual Result

- Saved keywords: star filled amber, quick buttons show violet background
- Unsaved keywords: star outline gray, quick buttons show gray background

---

## Flow 3: Quick Keyword Selection

### Sequence

```
User clicks keyword button (in input section or KeywordHistoryPanel)
  -> handleQuickKeyword(keyword, industryHint)
    -> setSeedKeyword(keyword)
    -> setSelectedIndustry(industryHint) if provided
    -> analyzeMutation.mutate({ projectId, seedKeyword, industryType, socialData })
      -> (same as Flow 1 from onSuccess onward)
```

### Code Path

```typescript
const handleQuickKeyword = useCallback(
  (kw: string, industryHint?: string) => {
    setSeedKeyword(kw);
    if (industryHint) {
      setSelectedIndustry(industryHint as typeof selectedIndustry);
    }
    if (!projectId) return;
    analyzeMutation.mutate({
      projectId,
      seedKeyword: kw,
      industryType: selectedIndustry,
      socialData: socialDataPayload,
    });
  },
  [projectId, selectedIndustry, socialDataPayload, analyzeMutation],
);
```

### Entry Points

Quick keyword selection is triggered from two locations:

1. **Input section quick buttons** -- top 6 keywords from `keywordsQuery.data`:
   ```typescript
   {(keywordsQuery.data?.keywords ?? []).slice(0, 6).map((kw) => (
     <button onClick={() => handleQuickKeyword(kw.keyword, kw.industryType ?? undefined)}>
       {kw.keyword}
     </button>
   ))}
   ```

2. **KeywordHistoryPanel row click** -- any keyword in the history list:
   ```typescript
   <KeywordHistoryPanel
     onSelectKeyword={(kw, ind) => handleQuickKeyword(kw, ind)}
     ...
   />
   ```

### Industry Pre-setting

When clicking a quick keyword that has a stored `industryType`, the industry
selector is automatically set to match. This ensures re-analysis uses the same
industry vertical the keyword was previously analyzed under.

---

## Empty State Behavior

When no analysis result exists (`screenState.isEmpty && !screenState.isLoading`):

1. Feature preview cards are shown (3 cards: Signal Fusion, Real-time Mentions, A/B Compare)
2. If `keywordsQuery.data.keywords.length > 0`:
   - A `KeywordHistoryPanel` is rendered below the feature cards
   - Header: "최근 분석 키워드"
   - Clicking any keyword triggers `handleQuickKeyword`
3. If no keywords exist:
   - Placeholder text in input section: "키워드를 입력하면 최근 분석 기록이 여기에 표시됩니다"

---

## Trend Tab Integration

When the user switches to the "트렌드" tab (after analysis), two components render:

1. **BenchmarkTrendChart** -- area chart of benchmark scores over 30 days
2. **KeywordHistoryPanel** -- full keyword history with bookmark/select functionality

```typescript
{activeSection === "trend" && (
  <div className="space-y-4">
    <div className="rounded-xl border ...">
      <h3>벤치마크 트렌드 (최근 30일)</h3>
      <BenchmarkTrendChart ... />
    </div>
    <div className="rounded-xl border ...">
      <h3>분석 키워드 기록</h3>
      <KeywordHistoryPanel
        keywords={keywordsQuery.data?.keywords ?? []}
        onSelectKeyword={(kw, ind) => handleQuickKeyword(kw, ind)}
        onToggleSave={(kw) => toggleSaveMutation.mutate({ projectId, keyword: kw })}
        activeKeyword={result.seedKeyword}
        isLoading={keywordsQuery.isLoading}
      />
    </div>
  </div>
)}
```

The `activeKeyword` prop is set to `result.seedKeyword`, so the currently analyzed
keyword is highlighted with a blue left border in the history list.

---

## Data Refresh Strategy

All three mutations (`analyze`, `recordKeyword`, `toggleSave`) trigger
`keywordsQuery.refetch()` on success, ensuring the keyword list stays synchronized:

```typescript
const recordKeywordMutation = trpc.intelligence.recordKeyword.useMutation({
  onSuccess: () => keywordsQuery.refetch(),
});
const toggleSaveMutation = trpc.intelligence.toggleSaveKeyword.useMutation({
  onSuccess: () => keywordsQuery.refetch(),
});
```

The `benchmarkTrendQuery` is conditionally enabled and auto-refreshes when the
analyzed keyword changes:

```typescript
const benchmarkTrendQuery = trpc.intelligence.benchmarkTrend.useQuery(
  { projectId, seedKeyword: analyzeMutation.data?.seedKeyword, industryType, days: 30 },
  { enabled: !!projectId && !!analyzeMutation.data?.seedKeyword },
);
```

---

## Section Navigation

The result area uses a tab bar with 6 sections:

| Key        | Label       | Components                                    |
|------------|-------------|-----------------------------------------------|
| `summary`  | 요약        | IntelligenceSummaryCards                       |
| `trend`    | 트렌드      | BenchmarkTrendChart + KeywordHistoryPanel      |
| `radial`   | 확장 그래프  | IntelligenceRadialGraph                       |
| `benchmark`| 벤치마크    | BenchmarkDifferentialRing                      |
| `signal`   | 시그널      | SignalFusionOverlayPanel                       |
| `social`   | 소셜 멘션   | LiveMentionStatusPanel                         |

---

## File References

- Page: `apps/web/src/app/(dashboard)/intelligence/page.tsx`
- BenchmarkTrendChart: `apps/web/src/components/intelligence/BenchmarkTrendChart.tsx`
- KeywordHistoryPanel: `apps/web/src/components/intelligence/KeywordHistoryPanel.tsx`
- Router: `packages/api/src/routers/intelligence.ts`
