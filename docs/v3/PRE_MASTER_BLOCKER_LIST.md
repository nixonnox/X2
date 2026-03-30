# PRE_MASTER_BLOCKER_LIST.md

> Generated: 2026-03-15
> Purpose: Honest enumeration of what blocks master merge and production use
> Policy: No false greens. If it was not runtime-tested, it is not verified.

---

## ENVIRONMENT BLOCKERS (Cannot be fixed by code changes)

### BLOCKER 1: PostgreSQL Server Not Running

```
Severity:    CRITICAL — blocks ALL database features
Category:    Infrastructure
Error:       P1001 — Can't reach database server at localhost:5432
```

**Impact — what actually breaks:**
- Intelligence reports cannot be saved or loaded
- Notification history does not persist across page refreshes
- Alert deduplication has no storage — cooldown logic is dead code
- Keyword history and bookmarks vanish on server restart
- User preferences are not stored
- Social mention snapshots are not persisted
- Period comparison has no historical data to compare

This is not "degraded functionality." This is "the database features do
not function at all." The app will start (Next.js lazy-connects), but any
route touching Prisma will return a 500 error or empty results.

**Resolution:**
```bash
# Pick ONE:
docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
# OR: sudo service postgresql start  (WSL)
# OR: Start PostgreSQL Windows service

# Then:
cd packages/db && npx prisma db push
npx prisma studio  # verify tables exist
```

**Time estimate**: 5-15 minutes depending on PostgreSQL availability.

---

### BLOCKER 2: YouTube API Key Not Configured

```
Severity:    HIGH (non-blocking for non-YouTube features)
Category:    External credential
Error:       YOUTUBE_API_KEY is empty or not set
```

**Impact:**
- YouTube channel data returns empty arrays
- Dashboard shows "No data" for YouTube metrics
- Other platforms (Instagram, TikTok, X) are NOT affected

**Resolution:**
1. Google Cloud Console -> Enable YouTube Data API v3
2. Create API key -> restrict to YouTube Data API v3
3. Add to `apps/web/.env.local`: `YOUTUBE_API_KEY=AIza...`
4. Restart dev server

**Time estimate**: 5-10 minutes.

---

## CODE FIXES APPLIED THIS SESSION

These are actual changes made. Each one is real and committed.

### FIX 1: unclassifiedCount in PeriodComparisonData type

```
Status:      APPLIED
Risk:        LOW (additive field)
Build:       Passes
What:        Added `unclassifiedCount: number` to PeriodComparisonData
Why:         Field existed in DB schema but was silently dropped during
             type mapping — frontend could never access it
```

### FIX 2: unclassifiedCount mapping in loadPeriodComparisonData

```
Status:      APPLIED
Risk:        LOW (new mapping line with ?? 0 fallback)
Build:       Passes
What:        Added `unclassifiedCount: s.unclassifiedCount ?? 0`
Why:         Even after type fix, the actual data was not being
             extracted from the Prisma query result
```

### FIX 3: Alert cooldown skip logging

```
Status:      APPLIED
Risk:        NONE (console.info only)
Build:       Passes
What:        Added console.info when alert is suppressed by cooldown
Why:         Cooldown suppressions were invisible — impossible to
             debug "why didn't my alert fire?"
```

### FIX 4: .env.example NOTIFICATION variables documented

```
Status:      APPLIED
Risk:        NONE (documentation file only)
What:        Added NOTIFICATION_EMAIL_*, NOTIFICATION_WEBHOOK_* vars
Why:         New developers had no way to discover these env vars
```

### FIX 5: packages/db/.env created

```
Status:      APPLIED
Risk:        LOW
What:        Created .env with DATABASE_URL + DIRECT_URL
Why:         Prisma CLI refused to run without this file —
             `prisma generate` and `prisma db push` both failed
```

---

## REMAINING S1 ISSUES (Not yet implemented)

### S1-1: maxAlertsPerDay Not Enforced at Runtime

```
Severity:    S1 — should fix before production
Location:    Alert engine
Problem:     User sets maxAlertsPerDay=10 in preferences.
             Alert engine ignores this setting completely.
             User can receive unlimited alerts per day.
Impact:      The preference UI makes a promise the backend breaks.
Fix:         ~30 minutes — COUNT query with date filter before create.
```

**HONEST NOTE**: This is not an edge case. The setting exists in the UI,
the value is saved to the database (if it were running), and the backend
simply never reads it during alert evaluation. This is a feature gap, not
a bug. The feature was designed but not implemented.

### S1-2: External Delivery Retry Not Implemented

```
Severity:    S1 — should fix before production
Location:    Notification delivery service
Problem:     Email/webhook delivery is fire-and-forget.
             If the first attempt fails, the notification is
             marked FAILED permanently. No retry.
Impact:      Transient network errors cause permanent notification loss.
             Users relying on email alerts may miss critical events.
Fix:         ~1-2 hours — retry queue with exponential backoff.
```

**HONEST NOTE**: The in-app notification (bell icon) still works because
it reads from the database. But external delivery (email, webhook) has
no resilience. A single timeout = permanent loss. This is the kind of
thing that looks fine in demo but fails in production.

---

## HONEST ASSESSMENT

### What IS true

| Claim                                          | Evidence              |
|------------------------------------------------|-----------------------|
| All targeted logic is implemented in code      | Source files exist    |
| TypeScript compiles without errors             | `tsc --noEmit` passes|
| Next.js build completes                        | `next build` passes  |
| No mock data in production code paths          | Code inspection       |
| Prisma schema covers all required models       | Schema file reviewed  |
| Alert cooldown follows correct dedup pattern   | Code inspection       |
| Unclassified count flows through pipeline      | Code inspection       |

### What is NOT true (despite what previous docs may have implied)

| Claim                                          | Reality                        |
|------------------------------------------------|--------------------------------|
| "Database integration is verified"             | NO — no DB server running      |
| "YouTube API works"                            | NO — no API key configured     |
| "Alerts are deduplicated"                      | NO — dedup needs DB, no DB     |
| "Period data includes unclassified counts"     | IN CODE ONLY — no data exists  |
| "Alert cooldown system is production-ready"    | NO — never executed at runtime |
| "All core logic verified end-to-end"           | NO — zero E2E tests run        |
| "Notification history persists"                | NO — no DB to persist to       |

### What this means for master merge

```
Can we merge the CODE to master?     YES — code quality is acceptable
Will it work after merge?            NO  — not without PostgreSQL
Is it tested?                        BUILD ONLY — no runtime, no E2E
Is it production-ready?              NO  — two S1 issues remain
Risk of merging code:                LOW — additive changes only
Risk of deploying to production:     HIGH — requires infra setup first
```

### Resolution path (ordered by priority)

```
Step 1: Start PostgreSQL server              [5 min]  -> unblocks ALL DB features
Step 2: Run prisma db push                   [1 min]  -> creates all tables
Step 3: Manual smoke test (save/load)        [10 min] -> proves DB round-trip
Step 4: Set YOUTUBE_API_KEY                  [5 min]  -> unblocks YouTube
Step 5: Fix maxAlertsPerDay enforcement      [30 min] -> closes S1-1
Step 6: Add delivery retry                   [1-2 hr] -> closes S1-2
Step 7: Full regression test                 [1-2 hr] -> actual QA sign-off
```

Steps 1-2 are infrastructure. Steps 3-4 are verification. Steps 5-7 are
code + QA work. Total estimated time: ~4-5 hours for full production
readiness, of which the first 15 minutes (Steps 1-3) will answer the
most important question: "does the database integration actually work?"

---

## Verification Matrix — The Uncomfortable Truth

| Feature                    | Code  | Build | Types | Runtime | E2E  |
|----------------------------|-------|-------|-------|---------|------|
| Intelligence CRUD          | DONE  | PASS  | PASS  | ZERO    | ZERO |
| Alert cooldown             | DONE  | PASS  | PASS  | ZERO    | ZERO |
| Alert deduplication        | DONE  | PASS  | PASS  | ZERO    | ZERO |
| Notification persistence   | DONE  | PASS  | PASS  | ZERO    | ZERO |
| Unclassified period data   | FIXED | PASS  | PASS  | ZERO    | ZERO |
| YouTube channel fetch      | DONE  | PASS  | PASS  | ZERO    | ZERO |
| Keyword history            | DONE  | PASS  | PASS  | ZERO    | ZERO |
| User preferences           | DONE  | PASS  | PASS  | ZERO    | ZERO |

Every single row has ZERO for Runtime and ZERO for E2E. That is eight
features with zero runtime verification. The pattern is clear: the code
is written, the types check, the build passes, and nothing has ever run
against a real database or real API.

This is not a code quality problem. It is an infrastructure gap. But the
result is the same: we do not know if these features work.

---

_This is an honest status report. It does not claim what has not been proven._
_Previous versions of these documents were more optimistic than warranted._
