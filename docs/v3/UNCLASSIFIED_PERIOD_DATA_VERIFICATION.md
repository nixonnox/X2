# UNCLASSIFIED_PERIOD_DATA_VERIFICATION.md

> Generated: 2026-03-15
> Verification method: Code inspection + build verification
> Status: FIXED (code-level) / UNVERIFIED (DB round-trip)

---

## Problem Statement

The `unclassifiedCount` field was missing from the `PeriodComparisonData`
TypeScript type and from the data mapping function that loads period snapshots.
This meant that even when the database stored unclassified mention counts,
the frontend would never receive them. The data was silently dropped.

---

## 1. Live Mentions Counter — Data Collection Side

### What the code does

| Check                                    | Status | Evidence                                        |
|------------------------------------------|--------|-------------------------------------------------|
| Positive counter tracked                 | PASS   | `liveMentions.positiveCount++`                  |
| Neutral counter tracked                  | PASS   | `liveMentions.neutralCount++`                   |
| Negative counter tracked                 | PASS   | `liveMentions.negativeCount++`                  |
| Unclassified counter tracked             | PASS   | `liveMentions.unclassifiedCount++`              |
| All 4 counters initialized to 0         | PASS   | Object literal with all four fields             |
| Sentiment classification logic           | PASS   | Switch/if with explicit unclassified branch     |

**HONEST NOTE**: The classification logic determines unclassified by exclusion
(not positive, not neutral, not negative). If the classification enum adds
new values in the future, they would fall into unclassified silently. This
is acceptable behavior but worth knowing. Also: we have never observed
actual sentiment classification running. We are reading code, not watching
data flow.

---

## 2. saveSocialSnapshot — Persistence Side

### What the code does

| Check                                    | Status | Evidence                                        |
|------------------------------------------|--------|-------------------------------------------------|
| Calls prisma.socialMentionSnapshot.create| PASS   | Standard Prisma create call                     |
| Includes positiveCount                   | PASS   | Mapped from liveMentions                        |
| Includes neutralCount                    | PASS   | Mapped from liveMentions                        |
| Includes negativeCount                   | PASS   | Mapped from liveMentions                        |
| Includes unclassifiedCount               | PASS   | Mapped from liveMentions                        |
| Includes timestamp                       | PASS   | new Date() or passed parameter                  |
| Includes projectId                       | PASS   | Foreign key reference                           |

**HONEST NOTE**: We have not observed a single row being written because
PostgreSQL is not running. The `create` call is syntactically correct and
type-safe against the Prisma schema, but we have zero evidence it works
at runtime. Zero rows have been persisted. Zero rows have been read back.

---

## 3. Database Schema — SocialMentionSnapshot

### Prisma model definition

| Field              | Type     | Present | Default |
|--------------------|----------|---------|---------|
| id                 | String   | YES     | cuid()  |
| projectId          | String   | YES     | —       |
| positiveCount      | Int      | YES     | 0       |
| neutralCount       | Int      | YES     | 0       |
| negativeCount      | Int      | YES     | 0       |
| unclassifiedCount  | Int      | YES     | 0       |
| createdAt          | DateTime | YES     | now()   |

**HONEST NOTE**: This model exists in the Prisma schema file. The actual
database table does NOT exist because `prisma db push` has never been run
successfully (PostgreSQL not running). The schema is a blueprint, not a
deployed artifact. There is no table. There are no rows. There is no data.

---

## 4. PeriodComparisonData Type — THE FIX

### Before this session

```typescript
// MISSING: unclassifiedCount was not in this type
type PeriodComparisonData = {
  socialSnapshots: Array<{
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
    // unclassifiedCount was ABSENT — data silently dropped here
    createdAt: string;
  }>;
};
```

### After fix

```typescript
type PeriodComparisonData = {
  socialSnapshots: Array<{
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
    unclassifiedCount: number;  // ADDED
    createdAt: string;
  }>;
};
```

| Check                                    | Status | Evidence                                        |
|------------------------------------------|--------|-------------------------------------------------|
| Type definition includes field           | PASS   | Added `unclassifiedCount: number`               |
| No type errors after change              | PASS   | `tsc --noEmit` passes                           |
| Downstream consumers updated            | PASS   | Components expecting this type now see the field |

---

## 5. loadPeriodComparisonData Mapping — THE FIX

### Before this session

```typescript
// BEFORE: unclassifiedCount NOT mapped — silently dropped
const mapped = snapshots.map(s => ({
  positiveCount: s.positiveCount,
  neutralCount: s.neutralCount,
  negativeCount: s.negativeCount,
  createdAt: s.createdAt.toISOString(),
}));
```

### After fix

```typescript
// AFTER: unclassifiedCount mapped with null-safe fallback
const mapped = snapshots.map(s => ({
  positiveCount: s.positiveCount,
  neutralCount: s.neutralCount,
  negativeCount: s.negativeCount,
  unclassifiedCount: s.unclassifiedCount ?? 0,  // ADDED
  createdAt: s.createdAt.toISOString(),
}));
```

| Check                                    | Status | Evidence                                        |
|------------------------------------------|--------|-------------------------------------------------|
| Maps unclassifiedCount from DB record    | PASS   | `s.unclassifiedCount`                           |
| Nullish fallback to 0                    | PASS   | `?? 0` handles null/undefined from old rows     |
| Consistent with other count fields       | PASS   | Same pattern as positive/neutral/negative       |
| Type-safe                                | PASS   | Prisma type includes the field                  |

**HONEST NOTE**: The `?? 0` fallback is defensive. We do not actually know
if there are "old rows" because there are NO rows at all. The fallback is
good practice but its necessity is theoretical, not observed.

---

## 6. API Response — periodData Endpoint

| Check                                    | Status | Evidence                                        |
|------------------------------------------|--------|-------------------------------------------------|
| Returns socialSnapshots array            | PASS   | Part of the API response body                   |
| Each snapshot includes unclassifiedCount | PASS   | Mapped in step 5 above                          |
| JSON serialization correct               | PASS   | number type serializes cleanly                  |
| No API version conflict                  | PASS   | Same endpoint, additive field                   |

**HONEST NOTE**: We have not called this API endpoint. We have not seen
its JSON response. We are inferring the response shape from reading the
handler code. The endpoint may have other issues (auth, middleware, error
handling) that we have not tested.

---

## 7. Frontend Display — LiveMentionStatusPanel

| Check                                    | Status | Evidence                                        |
|------------------------------------------|--------|-------------------------------------------------|
| Shows positive badge + count             | PASS   | Green badge in component JSX                    |
| Shows neutral badge + count              | PASS   | Gray badge in component JSX                     |
| Shows negative badge + count             | PASS   | Red badge in component JSX                      |
| Shows unclassified badge + count         | PASS   | Yellow/muted badge with label in component JSX  |
| Handles 0 gracefully                     | PASS   | Displays "0" (does not hide)                    |
| Handles undefined gracefully             | PASS   | `?? 0` fallback at data layer                   |

**HONEST NOTE**: We have not rendered this component in a browser. We are
reading JSX and asserting what it would render. Visual bugs (overlapping
badges, wrong colors, broken layout on mobile) cannot be caught by code
inspection.

---

## 8. End-to-End Data Flow (Code Path)

```
1. Social mention collected          — code exists, never ran
2. Sentiment classified              — code exists, never ran
3. Counter incremented               — code exists, never ran
4. saveSocialSnapshot()              — code exists, DB not available
5. loadPeriodComparisonData()        — code exists, DB not available
6. API returns PeriodComparisonData  — code exists, never called
7. LiveMentionStatusPanel renders    — code exists, never rendered with real data
```

Every step in this pipeline exists in code. No step in this pipeline has
been observed running with real data. The fixes we applied (steps 5-6)
close a gap that would have caused data loss IF the pipeline were running.
But the pipeline is not running.

---

## 9. What Was Actually Fixed This Session

| Fix                                      | File(s) affected               | Risk  |
|------------------------------------------|---------------------------------|-------|
| Added unclassifiedCount to type          | PeriodComparisonData type file  | LOW   |
| Added mapping in loadPeriodComparisonData| Data loading service            | LOW   |

Both fixes are additive (new field, new mapping line). They do not change
existing behavior for positive/neutral/negative counts. The `?? 0` fallback
ensures backward compatibility with any existing rows that lack the field
(though no rows exist currently).

---

## 10. Confidence Assessment

```
Type fix correctness:        HIGH   — additive change, TypeScript confirms
Mapping fix correctness:     HIGH   — mirrors existing pattern exactly
Data collection correctness: HIGH   — all 4 counters are parallel code
DB round-trip correctness:   ZERO   — no database to test against
API response correctness:    ZERO   — never called the endpoint
Frontend rendering:          ZERO   — never rendered with real data
End-to-end:                  ZERO   — never ran the full pipeline
```

### Bottom line

The unclassifiedCount data gap is FIXED at the code level. The type, the
mapping, the save, the load, and the display all include the field. But
"fixed in code" and "verified working" are different claims. We are making
the first claim only. The second claim requires PostgreSQL to be running,
data to be collected, the API to be called, and the UI to render.

Four out of seven confidence items are ZERO. That is the honest state.

---

_Code-level fix verified. DB round-trip unverified. Do not confuse the two._
