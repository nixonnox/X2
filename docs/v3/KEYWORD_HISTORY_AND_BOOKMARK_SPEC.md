# Keyword History and Bookmark Spec

## Overview

The keyword history system tracks every keyword a user analyzes, recording metadata
about each analysis run (industry, confidence, signal quality) and allowing users to
bookmark frequently used keywords. This replaces the previous hardcoded
`RECENT_KEYWORDS` array with a database-backed, per-user keyword list.

---

## Prisma Model: IntelligenceKeyword

**File:** `packages/db/prisma/schema.prisma`

```prisma
/// Intelligence keyword history -- recent analysis keywords + user bookmarks
model IntelligenceKeyword {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId    String

  keyword       String
  industryType  String?    // Industry used in last analysis
  industryLabel String?

  // State
  isSaved       Boolean  @default(false)   // User-bookmarked keyword
  analysisCount Int      @default(1)        // Total analysis count

  // Last analysis summary
  lastConfidence Float?
  lastFreshness  String?
  lastSignalHint String?   // "RICH" | "MODERATE" | "MINIMAL"

  lastAnalyzedAt DateTime @default(now())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([projectId, userId, keyword])
  @@index([projectId, userId, lastAnalyzedAt(sort: Desc)])
  @@index([projectId, userId, isSaved])
  @@map("intelligence_keywords")
}
```

### Composite Unique Constraint

`[projectId, userId, keyword]` -- each user within a project has at most one record
per keyword. Re-analyzing the same keyword increments `analysisCount` and updates
the `last*` fields via upsert.

### Indexes

- `[projectId, userId, lastAnalyzedAt DESC]` -- efficient ordering for "recent" filter
- `[projectId, userId, isSaved]` -- efficient filtering for "saved" filter

---

## Endpoints

### 1. `intelligence.keywords` (Query)

Lists keywords for the current user in the given project.

**Input:**

```typescript
z.object({
  projectId: z.string(),
  filter: z.enum(["all", "saved", "recent"]).default("all"),
  limit: z.number().min(1).max(50).default(20),
})
```

**Behavior:**

| Filter   | Where clause              | Order by                    |
|----------|---------------------------|-----------------------------|
| `all`    | `{ projectId, userId }`   | `lastAnalyzedAt desc`       |
| `saved`  | `{ projectId, userId, isSaved: true }` | `updatedAt desc` |
| `recent` | `{ projectId, userId }`   | `lastAnalyzedAt desc`       |

**Output:**

```typescript
{
  keywords: Array<{
    id: string;
    keyword: string;
    industryType: string | null;
    industryLabel: string | null;
    isSaved: boolean;
    analysisCount: number;
    lastConfidence: number | null;
    lastFreshness: string | null;
    lastSignalHint: string | null;  // "RICH" | "MODERATE" | "MINIMAL"
    lastAnalyzedAt: string;
  }>;
  totalCount: number;
}
```

### 2. `intelligence.recordKeyword` (Mutation)

Upserts a keyword record when analysis completes. Called automatically in the
`onSuccess` callback of `analyzeMutation`.

**Input:**

```typescript
z.object({
  projectId: z.string(),
  keyword: z.string().min(1),
  industryType: z.string().optional(),
  industryLabel: z.string().optional(),
  confidence: z.number().optional(),
  freshness: z.string().optional(),
  signalHint: z.string().optional(),
})
```

**Behavior:**

- Uses Prisma `upsert` on the composite key `projectId_userId_keyword`
- **Update:** Overwrites `industryType`, `industryLabel`, `lastConfidence`,
  `lastFreshness`, `lastSignalHint`, sets `lastAnalyzedAt` to now, and
  increments `analysisCount` by 1
- **Create:** Sets `analysisCount` to 1 (default), `isSaved` to false

**Output:** `{ id: string; analysisCount: number }`

### 3. `intelligence.toggleSaveKeyword` (Mutation)

Toggles the bookmark state of a keyword.

**Input:**

```typescript
z.object({
  projectId: z.string(),
  keyword: z.string().min(1),
})
```

**Behavior:**

1. Looks up existing record by composite key `projectId_userId_keyword`
2. If found: flips `isSaved` to `!existing.isSaved`
3. If not found: creates a new record with `isSaved: true` and `analysisCount: 0`

**Output:** `{ id: string; isSaved: boolean }`

---

## UI: KeywordHistoryPanel Component

**File:** `apps/web/src/components/intelligence/KeywordHistoryPanel.tsx`

### Props

```typescript
type KeywordHistoryPanelProps = {
  keywords: Array<{
    id: string;
    keyword: string;
    industryType: string | null;
    industryLabel: string | null;
    isSaved: boolean;
    analysisCount: number;
    lastConfidence: number | null;
    lastFreshness: string | null;
    lastSignalHint: string | null;
    lastAnalyzedAt: string | Date;
  }>;
  onSelectKeyword: (keyword: string, industryType?: string) => void;
  onToggleSave: (keyword: string) => void;
  activeKeyword?: string;
  isLoading?: boolean;
};
```

### Visual Layout

Each keyword row contains (left to right):

1. **Signal dot** -- colored circle indicating `lastSignalHint`:
   - `RICH` = emerald (`bg-emerald-500`)
   - `MODERATE` = amber (`bg-amber-500`)
   - `MINIMAL` = red (`bg-red-500`)

2. **Keyword text** -- truncated, bold if active

3. **Industry badge** -- colored pill based on industry type:
   - `BEAUTY` = pink
   - `FNB` = orange
   - `FINANCE` = blue
   - `ENTERTAINMENT` = purple

4. **Analysis count** -- `BarChart3` icon + "N회"

5. **Relative time** -- `Clock` icon + Korean relative time (e.g., "3일 전", "2시간 전")

6. **Save star** -- `Star` icon, filled amber when `isSaved`, gray outline otherwise.
   Click is isolated with `e.stopPropagation()` to prevent row click.

### Active State

When `keyword === activeKeyword`, the row shows a left blue border (`border-l-blue-500`)
and light blue background (`bg-blue-50/50`).

### Loading State

Shows 3 animated skeleton rows using `animate-pulse`.

### Empty State

Shows centered text: "아직 분석한 키워드가 없습니다."

---

## Integration: Quick Keyword Buttons

In `intelligence/page.tsx`, the hardcoded `RECENT_KEYWORDS` constant was removed.
The input section now renders keyword buttons from the DB query:

```typescript
{(keywordsQuery.data?.keywords ?? []).slice(0, 6).map((kw) => (
  <button
    key={kw.keyword}
    onClick={() => handleQuickKeyword(kw.keyword, kw.industryType ?? undefined)}
    className={kw.isSaved
      ? "bg-violet-100 text-violet-700 hover:bg-violet-200"
      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }
  >
    {kw.keyword}
    {kw.lastSignalHint === "RICH" && <span className="bg-emerald-500" />}
  </button>
))}
```

Saved keywords appear with violet background; unsaved with gray. Keywords with
`RICH` signal quality show a green dot indicator.

When no keywords exist, a placeholder text reads:
"키워드를 입력하면 최근 분석 기록이 여기에 표시됩니다"

---

## File References

- Schema: `packages/db/prisma/schema.prisma` (IntelligenceKeyword model, lines 2217-2244)
- Router: `packages/api/src/routers/intelligence.ts` (lines 891-1034)
- Component: `apps/web/src/components/intelligence/KeywordHistoryPanel.tsx`
- Page: `apps/web/src/app/(dashboard)/intelligence/page.tsx`
