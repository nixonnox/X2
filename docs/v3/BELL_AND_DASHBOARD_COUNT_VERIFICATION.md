# Bell & Dashboard Unread Count Verification Report

> **Date**: 2026-03-15
> **Scope**: unreadCount query usage in Bell dropdown, Dashboard card, and /notifications page
> **Status**: VERIFIED — CRITICAL FIX APPLIED

---

## 1. Query Source of Truth

| Consumer          | tRPC Query Key             | Payload Shape      | Access Pattern   |
|--------------------|----------------------------|--------------------|------------------|
| Dashboard card     | `notification.unreadCount` | `{ count: number }` | `.count`         |
| Bell dropdown      | `notification.unreadCount` | `{ count: number }` | `.count`         |
| /notifications     | `notification.unreadCount` | `{ count: number }` | `.count`         |

All three consumers call the **same** tRPC query (`notification.unreadCount`).
Because they share an identical query key, React Query deduplicates and
automatically synchronises the cached value across every mounted component.

---

## 2. CRITICAL FIX APPLIED

### Problem

| Layer    | Before Fix                | Expected by Frontend     |
|----------|---------------------------|--------------------------|
| Backend  | `return count` (plain `number`) | `{ count: number }` object |
| Frontend | `data?.count`             | `undefined` (always)     |

The backend `unreadCount` procedure returned a **plain number** (e.g. `5`).
The frontend destructured it as `data?.count`, which evaluated to `undefined`
because a primitive number has no `.count` property.

**Result**: The bell badge and dashboard count **always displayed 0 or were hidden**,
regardless of how many unread notifications existed.

### Fix Applied

```
// Backend — notification router, unreadCount procedure
- return count;
+ return { count };
```

The `/notifications` page also had a raw access pattern that was corrected
to use `.count` consistently.

### Verification After Fix

| Scenario                  | Bell Badge | Dashboard Card | /notifications header |
|---------------------------|------------|----------------|-----------------------|
| 0 unread                  | hidden     | hidden         | "0"                   |
| 3 unread                  | "3"        | "3"            | "3"                   |
| 10+ unread                | "9+"       | "9+"           | exact number          |
| After markAllRead         | hidden     | hidden         | "0"                   |

---

## 3. Polling Configuration

| Parameter       | Value  | Notes                                    |
|-----------------|--------|------------------------------------------|
| `refetchInterval` | 30 000 ms | Active polling while component is mounted |
| `staleTime`     | default | Immediate refetch on window focus         |
| `enabled`       | `true` | Always active (not gated by dropdown open)|

The Bell component polls every 30 seconds. The Dashboard card shares the
same cached value via React Query, so no additional network request is made
when both are mounted simultaneously.

---

## 4. Signal Hint Matching — REMOVED from Count

Signal hints (keyword-based alert indicators) were previously merged into
the unread count, inflating the badge number with non-notification items.

**Current behaviour**:
- `unreadCount` returns **only** database-persisted notification records
  where `read = false`.
- Signal hints remain as **visual-only keyword indicator dots** on the
  Intelligence cards. They do not contribute to any numeric count.
- No signal hint logic exists in the `unreadCount` procedure.

---

## 5. Mutation → Refetch Flow

### markRead (single notification)

```
onSuccess → invalidateQueries("notification.unreadCount")
          → invalidateQueries("notification.list")
```

### markAllRead (bulk)

```
onSuccess → invalidateQueries("notification.unreadCount")
          → invalidateQueries("notification.list")
```

Both mutations trigger an immediate cache invalidation, which causes
React Query to refetch the `unreadCount` and `list` queries. Because all
consumers share the same query key, the Bell badge, Dashboard card, and
/notifications page update in lockstep.

---

## 6. Data Integrity Checklist

| Check                                | Result |
|--------------------------------------|--------|
| No mock data in unreadCount          | PASS   |
| No localStorage fallback for count   | PASS   |
| No hardcoded count values            | PASS   |
| No client-side count computation     | PASS   |
| Count derived from DB query only     | PASS   |
| Return type matches frontend access  | PASS (after fix) |

---

## 7. Component File Map

| Component / File         | Role                         |
|--------------------------|------------------------------|
| `NotificationBell`       | Bell icon + badge + dropdown |
| `DashboardNotificationCard` | Dashboard summary card    |
| `/notifications` page    | Full notification list       |
| `notification.unreadCount` (router) | Backend procedure   |

---

## 8. Summary

The **critical type mismatch** between backend (plain number) and frontend
(`{ count }` object) has been fixed. All three consumers now correctly
read `data.count` from an identical tRPC query key, ensuring automatic
synchronisation via React Query's shared cache. Signal hints are excluded
from the count. No mock data, localStorage, or hardcoded values are used.
