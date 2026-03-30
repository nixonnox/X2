# Intelligence Navigation & Entry Point Specification

> Describes how users discover and enter the Intelligence Hub from the sidebar navigation and the dashboard summary card.

---

## 1. Sidebar Navigation

The Intelligence section is defined in `apps/web/src/lib/constants.ts` within the `NAV_SECTIONS` array.

### NAV_SECTIONS Entry

| Property    | Value                      |
|-------------|----------------------------|
| `titleKey`  | `"nav.intelligence"`       |

### Navigation Items

| labelKey                    | href                    | icon               |
|-----------------------------|-------------------------|--------------------|
| `nav.intelligenceHub`       | `/intelligence`         | `Brain`            |
| `nav.intelligenceCompare`   | `/intelligence/compare` | `GitCompareArrows` |
| `nav.verticalPreview`       | `/vertical-preview`     | `GitBranch`        |

```ts
// apps/web/src/lib/constants.ts  (line 86-104)
{
  titleKey: "nav.intelligence",
  items: [
    { labelKey: "nav.intelligenceHub",      href: "/intelligence",         icon: "Brain" },
    { labelKey: "nav.intelligenceCompare",  href: "/intelligence/compare", icon: "GitCompareArrows" },
    { labelKey: "nav.verticalPreview",      href: "/vertical-preview",     icon: "GitBranch" },
  ],
}
```

The sidebar renderer iterates `NAV_SECTIONS` and renders each section with a translated title and clickable items.
Translation keys (e.g. `nav.intelligenceHub`) are resolved by `next-intl` at render time.

---

## 2. Dashboard Summary Card  (`IntelligenceSummaryCard`)

**Location:** `apps/web/src/app/(dashboard)/dashboard/dashboard-view.tsx` (lines 477-613)

The card is rendered unconditionally inside `DashboardView`, between the Search Intelligence Status Bar and the "Core Discovery" section.

```tsx
{/* 4.5 Intelligence 인사이트 */}
<IntelligenceSummaryCard />
```

### 2.1 Data Source

| Query                              | Parameters                                         |
|------------------------------------|----------------------------------------------------|
| `trpc.intelligence.keywords`       | `{ projectId, filter: "all", limit: 3 }`           |

The query is enabled only when `projectId` is available (via `useCurrentProject()` hook).

### 2.2 Card Layout

#### Header Row

| Element          | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| Icon             | `Brain` icon in an indigo-50 background circle (`h-8 w-8`)                 |
| Title            | **"Intelligence Hub"** (`14px` font-semibold)                               |
| Subtitle         | "Intelligence 인사이트" (`11px` muted)                                      |
| A/B Compare link | `GitCompareArrows` icon + "A/B 비교" button linking to `/intelligence/compare` |
| Full view link   | "전체 보기" text link to `/intelligence`                                     |

#### Body: Empty State (no keywords)

When `keywords.length === 0`:

| Element       | Detail                                                       |
|---------------|--------------------------------------------------------------|
| Icon          | `Brain` icon (`h-7 w-7`, muted)                             |
| Text          | "아직 분석한 키워드가 없습니다. Intelligence Hub에서 시작하세요." |
| CTA button    | "분석 시작" with `ArrowRight` icon, links to `/intelligence`  |

#### Body: Keywords Present

When `keywords.length > 0`, the card renders:

1. **Keyword List** (up to 3 items), each row containing:

   | Element          | Description                                                   |
   |------------------|---------------------------------------------------------------|
   | Signal hint dot  | `h-2 w-2` colored circle based on `lastSignalHint`           |
   | Keyword text     | `13px` font-medium, truncated                                 |
   | Industry badge   | `industryLabel` if present (secondary bg, `10px`)             |
   | Timestamp        | `Clock` icon + `lastAnalyzedAt` formatted in Korean locale    |

2. **Alert summary + CTA row**

### 2.3 Signal Hint Dot Colors

The dot color is determined by string matching on `lastSignalHint`:

| Condition                                              | CSS Class         | Visual  |
|--------------------------------------------------------|-------------------|---------|
| `lastSignalHint` includes "warning" or "risk"          | `bg-amber-400`    | Amber   |
| `lastSignalHint` includes "opportunity"                | `bg-emerald-400`  | Green   |
| All other cases                                        | `bg-blue-400`     | Blue    |

```tsx
<span className={`h-2 w-2 flex-shrink-0 rounded-full ${
  kw.lastSignalHint?.toLowerCase().includes("warning") ||
  kw.lastSignalHint?.toLowerCase().includes("risk")
    ? "bg-amber-400"
    : kw.lastSignalHint?.toLowerCase().includes("opportunity")
      ? "bg-emerald-400"
      : "bg-blue-400"
}`} />
```

### 2.4 Warning Count Badge

The warning count is computed client-side by filtering the returned keywords:

```ts
const warningCount = keywords.filter(
  (k: any) =>
    k.lastSignalHint?.toLowerCase().includes("warning") ||
    k.lastSignalHint?.toLowerCase().includes("risk") ||
    (k.lastConfidence != null && k.lastConfidence < 0.4),
).length;
```

| Condition                          | Trigger                                           |
|------------------------------------|----------------------------------------------------|
| `lastSignalHint` contains "warning" | Counted as warning                                |
| `lastSignalHint` contains "risk"   | Counted as warning                                |
| `lastConfidence < 0.4`            | Counted as warning (low confidence threshold)      |

**Display logic:**

| warningCount | Rendered Element                                              |
|--------------|---------------------------------------------------------------|
| `> 0`        | `AlertTriangle` icon + "최근 경고 {N}건" (amber-600)         |
| `=== 0`      | `CheckCircle2` icon + "이상 신호 없음" (emerald-600)          |

### 2.5 CTA Button

Always visible when keywords exist:

| Label     | Icon          | Target          | Style                      |
|-----------|---------------|-----------------|----------------------------|
| 분석 시작  | `ArrowRight`  | `/intelligence` | `bg-indigo-600` rounded-lg |

---

## 3. Entry Point Summary

| Entry Point               | Target URL                | Trigger                                |
|---------------------------|---------------------------|----------------------------------------|
| Sidebar: Intelligence Hub | `/intelligence`           | Click nav item                         |
| Sidebar: Compare          | `/intelligence/compare`   | Click nav item                         |
| Sidebar: Vertical Preview | `/vertical-preview`       | Click nav item                         |
| Dashboard card: CTA       | `/intelligence`           | Click "분석 시작" button               |
| Dashboard card: header    | `/intelligence`           | Click "전체 보기" link                 |
| Dashboard card: A/B       | `/intelligence/compare`   | Click "A/B 비교" button               |

---

## 4. Related Components

| Component                     | File Path                                                                |
|-------------------------------|--------------------------------------------------------------------------|
| `IntelligenceSummaryCards`     | `apps/web/src/components/intelligence/IntelligenceSummaryCards.tsx`       |
| `IntelligenceSummaryCard`     | `apps/web/src/app/(dashboard)/dashboard/dashboard-view.tsx` (inline)     |
| Navigation constants          | `apps/web/src/lib/constants.ts`                                          |

> **Note:** `IntelligenceSummaryCards` (plural) is a separate component used inside the Intelligence Hub page itself to display signal quality, taxonomy, benchmark, and social mini-cards. It is distinct from the dashboard's `IntelligenceSummaryCard` (singular).

---

## 5. Known Considerations

- The dashboard card queries with `limit: 3`, so at most 3 keywords are shown regardless of total count.
- Warning counting relies on string matching against `lastSignalHint` text, which is fragile if signal hint wording changes.
- The `lastSignalHint` values are set during `intelligence.recordKeyword` mutation and originate from `signalQuality.overallRichness` in the analysis pipeline.
- No deep-link to a specific keyword analysis from the dashboard card; all CTAs go to the hub's root page.
