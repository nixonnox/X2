# MIGRATION_STRATEGY — Database Migration Execution Plan

> Created: 2026-03-10
> Scope: schema.prisma v3 changes (3 new models, 12 Workspace fields, 4 new enums, 5 enum extensions, 6 indexes)
> Status: Pre-migration (schema modified, DB unchanged)
> Prerequisite: MIGRATION_PRECHECK_FINAL.md, SCHEMA_CHANGE_SUMMARY.md

---

## 1. Migration Phases

All schema changes are **additive** and **backward-compatible**. They are split into 3 independent migrations to minimize risk and allow incremental deployment.

---

### Phase M-1: Infrastructure Foundation (Workspace + Ops)

**Migration name:** `v3_workspace_capabilities`

#### What changes

| Target            | Change      | Detail                                                                                                                                                                                                                                                                                  |
| ----------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspaces`      | +12 columns | 9 plan limits (`maxChannels`, `maxContentsPerMonth`, `maxCommentsPerMonth`, `maxAiTokensPerDay`, `maxMembers`, `maxReportsPerMonth`, `canExportData`, `canAccessApi`, `maxVerticalPacks`) + 3 feature flags (`geoAeoEnabled`, `influencerExecutionEnabled`, `evidenceReportingEnabled`) |
| `scheduled_jobs`  | +2 columns  | `durationMs` (Int?, nullable), `jobGroup` (String?, nullable)                                                                                                                                                                                                                           |
| `usage_metrics`   | +3 columns  | `aiCostUsd` (Float, @default(0)), `reportCount` (Int, @default(0)), `exportCount` (Int, @default(0))                                                                                                                                                                                    |
| `contents`        | +1 index    | `[channelId, publishedAt DESC]`                                                                                                                                                                                                                                                         |
| `insight_actions` | +1 index    | `[sourceModule]`                                                                                                                                                                                                                                                                        |
| `scheduled_jobs`  | +1 index    | `[jobGroup]`                                                                                                                                                                                                                                                                            |

#### Risk assessment: LOW

- All new columns have `@default` values or are nullable
- No existing column modified or removed
- No data type changes
- Indexes on relatively small tables (Content, InsightAction, ScheduledJob)

#### Backfill: REQUIRED

Workspace plan-based UPDATE **must** run immediately after migration. Without it, existing PRO/BUSINESS workspaces get FREE-tier defaults (3 channels, 1 member).

```sql
UPDATE workspaces SET
  "maxChannels" = CASE plan
    WHEN 'FREE' THEN 3
    WHEN 'PRO' THEN 50
    WHEN 'BUSINESS' THEN 200
  END,
  "maxContentsPerMonth" = CASE plan
    WHEN 'FREE' THEN 500
    WHEN 'PRO' THEN 10000
    WHEN 'BUSINESS' THEN 50000
  END,
  "maxCommentsPerMonth" = CASE plan
    WHEN 'FREE' THEN 1000
    WHEN 'PRO' THEN 50000
    WHEN 'BUSINESS' THEN 200000
  END,
  "maxAiTokensPerDay" = CASE plan
    WHEN 'FREE' THEN 5000
    WHEN 'PRO' THEN 100000
    WHEN 'BUSINESS' THEN 500000
  END,
  "maxMembers" = CASE plan
    WHEN 'FREE' THEN 1
    WHEN 'PRO' THEN 5
    WHEN 'BUSINESS' THEN 999
  END,
  "maxReportsPerMonth" = CASE plan
    WHEN 'FREE' THEN 3
    WHEN 'PRO' THEN 999
    WHEN 'BUSINESS' THEN 999
  END,
  "canExportData" = CASE WHEN plan IN ('PRO', 'BUSINESS') THEN true ELSE false END,
  "canAccessApi" = CASE WHEN plan = 'BUSINESS' THEN true ELSE false END,
  "maxVerticalPacks" = CASE plan
    WHEN 'FREE' THEN 0
    WHEN 'PRO' THEN 1
    WHEN 'BUSINESS' THEN 999
  END,
  "geoAeoEnabled" = CASE WHEN plan IN ('PRO', 'BUSINESS') THEN true ELSE false END,
  "influencerExecutionEnabled" = CASE WHEN plan IN ('PRO', 'BUSINESS') THEN true ELSE false END
WHERE plan IS NOT NULL;
```

#### Deployment: Can deploy independently

No code changes required for the migration itself. The new columns exist but are unused until tRPC middleware reads them. Existing code continues to work unchanged.

---

### Phase M-2: Intelligence Models (FAQ / Risk / Notification)

**Migration name:** `v3_faq_risk_notification`

#### What changes

| Target                | Change       | Detail                                                                                                                                                                                                                                          |
| --------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `faq_candidates`      | New table    | FAQCandidate model with question, variants, mentionCount, status, urgencyScore                                                                                                                                                                  |
| `risk_signals`        | New table    | RiskSignal model with title, riskType, severity, status, rootCauseAnalysis                                                                                                                                                                      |
| `notifications`       | New table    | Notification model with type, priority, isRead, channels                                                                                                                                                                                        |
| Enums                 | +4 new       | `FAQStatus`, `RiskSignalStatus`, `NotificationType`, `NotificationPriority`                                                                                                                                                                     |
| Enums                 | +5 extended  | `JobType` +3 (FAQ_EXTRACT, RISK_DETECT, NOTIFICATION_SEND), `InsightType` +2 (RISK_REPORT, FAQ_REPORT), `DataSourceType` +2 (FAQ_CANDIDATE, RISK_SIGNAL), `SourceModule` +2 (FAQ_ENGINE, RISK_ENGINE), `ExplorerDataType` +2 (FAQ, RISK_SIGNAL) |
| `comment_analysis`    | +1 index     | `[sentiment, isRisk]`                                                                                                                                                                                                                           |
| `raw_social_mentions` | +1 index     | `[sentiment]`                                                                                                                                                                                                                                   |
| `users`               | +1 relation  | `notifications Notification[]`                                                                                                                                                                                                                  |
| `projects`            | +2 relations | `faqCandidates FAQCandidate[]`, `riskSignals RiskSignal[]`                                                                                                                                                                                      |

#### Risk assessment: LOW-MEDIUM

- New tables: safe (no existing data affected)
- Enum extensions: **check for exhaustive switch/case statements** in TypeScript. Any `switch` on `JobType`, `InsightType`, `DataSourceType`, `SourceModule`, or `ExplorerDataType` without a `default` case will cause compile errors after `prisma generate`.
- The `[sentiment, isRisk]` and `[sentiment]` indexes are on tables that may have data. If these tables have > 10k rows at migration time, consider moving indexes to Phase M-3.

#### Backfill: None

All three tables start empty. No existing data transformation needed.

#### Deployment: Requires code changes

This migration only makes sense when deployed alongside:

1. tRPC routers for `faq`, `risk`, `notification` (CRUD + list/filter)
2. BullMQ job handlers for `FAQ_EXTRACT`, `RISK_DETECT`, `NOTIFICATION_SEND`
3. Exhaustive switch updates for extended enums
4. (Optional) UI components for FAQ dashboard, risk dashboard, notification bell

**Do not run this migration without at minimum the enum switch updates**, or the TypeScript build will fail.

---

### Phase M-3: Performance Indexes (Large Table)

**Migration name:** Manual SQL (not Prisma migrate)

#### What changes

| Target                | Index                           | Concern                     |
| --------------------- | ------------------------------- | --------------------------- |
| `comment_analysis`    | `[sentiment, isRisk]`           | Large table, potential lock |
| `raw_social_mentions` | `[sentiment]`                   | Large table, potential lock |
| `contents`            | `[channelId, publishedAt DESC]` | Large table, potential lock |

> **Note:** If these indexes were already included in M-1 or M-2 (as specified in the schema), and your tables are small (< 10k rows), you can skip M-3 entirely. M-3 exists as a fallback for production environments with significant data.

#### Risk assessment: MEDIUM

- Standard `CREATE INDEX` acquires a lock on the table for the duration of index creation
- On large tables (> 10k rows), this can block reads/writes for seconds to minutes
- PostgreSQL `CREATE INDEX CONCURRENTLY` avoids the lock but cannot run inside a transaction (which Prisma migrate uses)

#### Recommendation: Manual SQL with CONCURRENTLY

```sql
-- Run these outside of Prisma migrate, directly against PostgreSQL
-- Each statement must run individually (not in a transaction)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comment_analysis_sentiment_risk
  ON comment_analysis (sentiment, "isRisk");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_social_mentions_sentiment
  ON raw_social_mentions (sentiment);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contents_channel_published
  ON contents ("channelId", "publishedAt" DESC);
```

After running manually, create an empty Prisma migration to mark the schema as in sync:

```bash
npx --package=prisma@6 prisma migrate resolve --applied v3_performance_indexes
```

#### Deployment: Can go anytime after M-2

- No code dependency
- Ideally run during low-traffic window
- If data < 10k rows, just include in M-1 or M-2 instead

---

## 2. Migration Execution Commands

All commands must be run from `packages/db/`.

### Environment setup

```bash
cd packages/db

# Required environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/x2"
export DIRECT_URL="postgresql://user:pass@host:5432/x2"
```

### Phase M-1

```bash
# 1. Run migration
npx --package=prisma@6 prisma migrate dev --name v3_workspace_capabilities

# 2. Regenerate client
npx --package=prisma@6 prisma generate

# 3. Run backfill SQL (see Section 5)
# Use psql, pgAdmin, or any PostgreSQL client

# 4. Verify
npx --package=prisma@6 prisma migrate status
```

### Phase M-2

```bash
# 1. Run migration
npx --package=prisma@6 prisma migrate dev --name v3_faq_risk_notification

# 2. Regenerate client
npx --package=prisma@6 prisma generate

# 3. TypeScript build check (critical for enum changes)
cd ../..
npx turbo build
```

### Phase M-3 (manual)

```bash
# 1. Connect to PostgreSQL directly
psql $DATABASE_URL

# 2. Run CONCURRENTLY indexes (see SQL above)

# 3. Mark as applied in Prisma
cd packages/db
npx --package=prisma@6 prisma migrate resolve --applied v3_performance_indexes
```

### Important

- **Always use `npx --package=prisma@6 prisma`** — never use a globally installed `prisma` (may be v7, incompatible)
- Both `DATABASE_URL` and `DIRECT_URL` must be set (Prisma 6 requirement)
- Run `prisma generate` after every migration to update the TypeScript client

---

## 3. Rollback Strategy

### Phase M-1 Rollback

| Change                  | Rollback                                                                       | Risk                            |
| ----------------------- | ------------------------------------------------------------------------------ | ------------------------------- |
| Workspace +12 columns   | `ALTER TABLE workspaces DROP COLUMN "maxChannels", ...;` (12 columns)          | LOW — but backfill data is lost |
| ScheduledJob +2 columns | `ALTER TABLE scheduled_jobs DROP COLUMN "durationMs", DROP COLUMN "jobGroup";` | LOW — nullable, no data loss    |
| UsageMetric +3 columns  | `ALTER TABLE usage_metrics DROP COLUMN "aiCostUsd", ...;`                      | LOW — default(0) data is lost   |
| 3 indexes               | `DROP INDEX idx_name;`                                                         | SAFE — always safe to drop      |

**Procedure:**

1. Remove the columns/indexes via SQL
2. Revert `schema.prisma` to pre-M-1 state
3. Run `npx --package=prisma@6 prisma migrate resolve --rolled-back v3_workspace_capabilities`
4. Run `npx --package=prisma@6 prisma generate`

### Phase M-2 Rollback

| Change            | Rollback                                                                                 | Risk                                     |
| ----------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------- |
| 3 new tables      | `DROP TABLE faq_candidates, risk_signals, notifications;`                                | SAFE — if no data, or data is expendable |
| 4 new enums       | `DROP TYPE "FAQStatus", "RiskSignalStatus", "NotificationType", "NotificationPriority";` | SAFE — only used by dropped tables       |
| 5 enum extensions | Remove added values (requires no rows using those values)                                | MEDIUM — check for rows first            |
| 2 indexes         | `DROP INDEX ...;`                                                                        | SAFE                                     |

**Procedure:**

1. Verify no rows use the new enum values: `SELECT COUNT(*) FROM scheduled_jobs WHERE "jobType" IN ('FAQ_EXTRACT', 'RISK_DETECT', 'NOTIFICATION_SEND');`
2. Drop tables, then drop enums
3. For enum value removal in PostgreSQL, use: `ALTER TYPE "JobType" RENAME TO "JobType_old"; CREATE TYPE "JobType" AS ENUM (...without new values...); ALTER TABLE ... ALTER COLUMN ... TYPE "JobType" USING ...; DROP TYPE "JobType_old";`
4. Revert `schema.prisma` and resolve migration

### Phase M-3 Rollback

```sql
DROP INDEX IF EXISTS idx_comment_analysis_sentiment_risk;
DROP INDEX IF EXISTS idx_raw_social_mentions_sentiment;
DROP INDEX IF EXISTS idx_contents_channel_published;
```

Always safe. No data impact.

---

## 4. Deployment Order

```
                    ┌──────────────────────┐
                    │  Phase M-1           │
                    │  Infrastructure      │
                    │  (no code dependency)│
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Backfill Script     │
                    │  (run immediately)   │
                    └──────────┬───────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
    ┌─────────▼──────────┐           ┌──────────▼─────────┐
    │  Code: tRPC routers│           │  Code: enum switch  │
    │  faq, risk, notif  │           │  updates            │
    └─────────┬──────────┘           └──────────┬──────────┘
              │                                 │
              └────────────────┬────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Phase M-2           │
                    │  Intelligence Models │
                    │  (requires code)     │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Phase M-3           │
                    │  Performance Indexes │
                    │  (during low-traffic)│
                    └──────────────────────┘
```

### Key ordering constraints

1. **M-1 can go first** — no code dependency, all defaults/nullable. Deploy and backfill immediately.
2. **M-2 requires code ready** — at minimum, enum exhaustive switch updates must be in place. Ideally, tRPC routers for FAQ/Risk/Notification are also ready, plus BullMQ handlers.
3. **M-3 can go anytime after M-2** — or skip entirely if tables are small. Best during low-traffic.
4. **Backfill must run immediately after M-1** — do not wait. PRO/BUSINESS workspaces will be broken until backfill runs.

---

## 5. Backfill Scripts

### 5.1 Workspace Plan-Based Backfill (after M-1)

See the full SQL in Phase M-1 section above. This is the **only required backfill** across all phases.

**When to run:** Immediately after M-1 migration completes.

**Verification query:**

```sql
-- Verify backfill correctness
SELECT plan,
       "maxChannels", "maxMembers", "maxContentsPerMonth",
       "canExportData", "canAccessApi"
FROM workspaces
ORDER BY plan;
```

Expected results:

- FREE: maxChannels=3, maxMembers=1, canExportData=false, canAccessApi=false
- PRO: maxChannels=50, maxMembers=5, canExportData=true, canAccessApi=false
- BUSINESS: maxChannels=200, maxMembers=999, canExportData=true, canAccessApi=true

### 5.2 No Backfill Needed for M-2 or M-3

- M-2 creates empty tables — nothing to backfill
- M-3 adds indexes — no data changes

---

## 6. Pre-Migration Checklist

### Before ANY migration

- [ ] PostgreSQL instance is running and accessible
- [ ] `DATABASE_URL` environment variable is set correctly
- [ ] `DIRECT_URL` environment variable is set correctly
- [ ] Database backup completed (if data exists)
- [ ] `prisma validate` passes: `npx --package=prisma@6 prisma validate`
- [ ] `prisma format` passes: `npx --package=prisma@6 prisma format`
- [ ] Current migration status is clean: `npx --package=prisma@6 prisma migrate status`

### Before M-1 specifically

- [ ] Check if workspaces table has existing data: `SELECT COUNT(*), plan FROM workspaces GROUP BY plan;`
- [ ] Backfill SQL script is ready to execute immediately after migration
- [ ] No active transactions or long-running queries on workspaces table

### Before M-2 specifically

- [ ] TypeScript exhaustive switch audit completed for: `JobType`, `InsightType`, `DataSourceType`, `SourceModule`, `ExplorerDataType`
- [ ] tRPC routers for faq/risk/notification are at least stubbed out
- [ ] TypeScript build passes after `prisma generate` with updated schema
- [ ] Verify M-1 migration and backfill were successful

### Before M-3 specifically

- [ ] Check table sizes: `SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE relname IN ('comment_analysis', 'raw_social_mentions', 'contents');`
- [ ] If any table > 10k rows, use `CREATE INDEX CONCURRENTLY` (manual SQL)
- [ ] If all tables < 10k rows, Prisma migrate is fine
- [ ] Plan a low-traffic window if tables are large

### After EVERY migration

- [ ] `prisma generate` completed successfully
- [ ] `npx turbo build` passes (TypeScript compilation)
- [ ] Existing user login works
- [ ] Existing workspace/channel/content queries work
- [ ] New Prisma Client types include the changes
- [ ] seed.ts updated if needed

---

## 7. Timeline Summary

```
Week 1:  M-1 migration + backfill + deploy
         (independent, no code changes needed)

Week 2+: Develop tRPC routers, BullMQ handlers, enum switch updates
         (can start before M-1 using prisma generate locally)

Week N:  M-2 migration + deploy (when code is ready)
         (requires tRPC routers + enum updates at minimum)

Week N+: M-3 manual indexes (if needed)
         (during low-traffic, only if tables are large)
```
