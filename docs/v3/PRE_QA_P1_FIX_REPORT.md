# Pre-QA P1 Fix Report

> **Date**: 2026-03-15
> **Scope**: Intelligence module runtime stability, data accuracy, and UI completeness
> **Priority**: P1 (blocking QA entry)
> **Status**: All 5 items fixed and verified

---

## Summary

Five P1-level defects were identified during the pre-QA audit of the Intelligence module.
Each item either risked a runtime crash, caused data loss/misclassification, or left a
placeholder UI element that would fail in QA. All five have been resolved.

---

## 1. createAlertNotification try-catch (Runtime Stability)

**Problem**: A single failed Notification.create or previous-run query in
`IntelligenceAlertService.evaluateAndAlert()` would throw an unhandled exception,
propagating up to the `intelligence.analyze` tRPC mutation and causing the entire
analyze response to fail with a 500.

**Fix** (3 layers of error isolation):

| Layer | Location | Behavior on failure |
|-------|----------|---------------------|
| previousRun query | `evaluateAndAlert()` L76-86 | Catches error, logs via `console.error`, continues without comparison-based alerts |
| Per-condition loop | `evaluateAndAlert()` L96-127 | Wraps cooldown check + notification create per condition, logs and continues to next condition |
| createAlertNotification | `createAlertNotification()` L233-260 | Internal try-catch, returns `null` on failure, logs the error with type and keyword |

**Key guarantee**: Alert processing failure never blocks the analyze response. The caller
receives the analysis result regardless of notification delivery status.

**File**: `packages/api/src/services/intelligence/intelligence-alert.service.ts`

---

## 2. providerCoverage analyze Propagation (Data Completeness)

**Problem**: The analyze mutation computed social data but did not capture which providers
were connected at analysis time. Without this metadata, the frontend could not display
partial-data warnings or provider status breakdowns.

**Fix**:

1. Added `liveMentionService.getRegistry().getAllStatuses()` call in the analyze mutation
2. Built `providerCoverage` object with shape:
   ```ts
   {
     connectedProviders: number,
     totalProviders: number,
     isPartial: boolean,
     providers: Array<{ name, platform, status, error }>
   }
   ```
3. Passed `providerCoverage` to `IntelligencePersistenceService.saveAnalysisRun()`
4. Stored in `IntelligenceAnalysisRun.providerCoverage` (Prisma `Json?` field)
5. Included in the analyze response under `metadata.providerCoverage`

**Files**:
- `packages/api/src/routers/intelligence.ts` (mutation logic)
- `packages/api/src/services/intelligence/intelligence-persistence.service.ts` (save input type)
- `packages/db/prisma/schema.prisma` (model field)

---

## 3. Alert sourceId projectId Inclusion (Cross-Project Isolation)

**Problem**: The sourceId format was `{type}:{keyword}`, which meant two different projects
analyzing the same keyword would share cooldown windows and alert deduplication. This caused
missed alerts in multi-project workspaces.

**Fix**:

- Changed sourceId format from `{type}:{keyword}` to `{projectId}:{type}:{keyword}`
- Added `projectId` parameter to `createAlertNotification`
- Cooldown check (`isWithinCooldown`) uses `sourceType` + `sourceId` + `createdAt` filter
- Since sourceId now contains the projectId, each project has independent cooldown windows

**Example sourceId**: `proj_abc123:WARNING_SPIKE:brand_keyword`

**File**: `packages/api/src/services/intelligence/intelligence-alert.service.ts`

---

## 4. Null Sentiment Separation (Data Accuracy)

**Problem**: Mentions with `null`, `undefined`, or unknown sentiment values were silently
counted as NEUTRAL. This inflated the neutral count and hid data quality issues from the
user. There was no way to distinguish "analyzed and neutral" from "not analyzed."

**Fix**:

1. Added explicit NEUTRAL check: `m.sentiment === "NEUTRAL"` (string equality)
2. All other values (null, undefined, unknown strings) are counted as `unclassified`
3. Schema changes:
   - Added `unclassifiedCount Int @default(0)` to `SocialMentionSnapshot` model
   - Added `unclassifiedCount` to `SaveSocialSnapshotInput` type
   - Included in both `create` and `update` branches of `saveSocialSnapshot` upsert
4. Router passes the computed `unclassified` count to the persistence layer

**Sentiment buckets (4 total)**:
| Bucket | Condition |
|--------|-----------|
| POSITIVE | `m.sentiment === "POSITIVE"` |
| NEUTRAL | `m.sentiment === "NEUTRAL"` |
| NEGATIVE | `m.sentiment === "NEGATIVE"` |
| unclassified | Everything else (null, undefined, unknown) |

**Files**:
- `packages/api/src/routers/intelligence.ts` (classification logic)
- `packages/api/src/services/intelligence/intelligence-persistence.service.ts` (type + upsert)
- `packages/db/prisma/schema.prisma` (model field)

---

## 5. Bell Dropdown (UI Completeness)

**Problem**: The TopBar had a placeholder bell icon button with no functionality. Clicking it
did nothing. There was no way for users to see or interact with notifications.

**Fix**: Replaced the placeholder with a fully functional notification dropdown.

### Architecture

| Concern | Implementation |
|---------|---------------|
| State | `bellOpen` toggle via `useState` |
| Unread count | `trpc.notification.unreadCount` with 30s polling (`refetchInterval: 30000`) |
| Notification list | `trpc.notification.list` (page 1, 10 items), enabled only when dropdown is open |
| Mark single read | `trpc.notification.markRead` (triggered on actionUrl click) |
| Mark all read | `trpc.notification.markAllRead` (header button, visible when unreadCount > 0) |

### UI Details

- **Badge**: Dynamic unread count on bell icon; shows "9+" for counts exceeding 9; hidden when 0
- **Priority icons**: `AlertTriangle` (amber) for HIGH/URGENT, `Bell` (gray) for NORMAL/LOW
- **Notification item**: Message text, Korean-locale date (M/D HH:MM), read/unread background
- **Action links**: actionUrl with `ExternalLink` icon; marks as read on click, closes dropdown
- **Empty state**: Centered bell icon + "no new notifications" message
- **Loading state**: Centered `Loader2` spinner

**File**: `apps/web/src/components/layout/top-bar.tsx`

---

## Verification Checklist

| # | Item | Status |
|---|------|--------|
| 1 | Alert try-catch: analyze succeeds even if notification DB is down | Verified |
| 2 | providerCoverage saved to DB and returned in response | Verified |
| 3 | sourceId contains projectId, cooldown is project-scoped | Verified |
| 4 | Null sentiments counted as unclassified, not neutral | Verified |
| 5 | Bell dropdown renders, polls, marks read | Verified |

---

## Files Modified

```
packages/api/src/services/intelligence/intelligence-alert.service.ts
packages/api/src/routers/intelligence.ts
packages/api/src/services/intelligence/intelligence-persistence.service.ts
packages/db/prisma/schema.prisma
apps/web/src/components/layout/top-bar.tsx
```
