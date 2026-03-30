# Alert Count Gap List

> **Date**: 2026-03-15
> **Scope**: Known issues, gaps, and risks in the notification count system
> **Status**: S0 issues RESOLVED — remaining items are S2/S3

---

## Severity Legend

| Badge | Level | Definition                                    |
|-------|-------|-----------------------------------------------|
| S0    | Critical | Data wrong or feature broken for all users |
| S1    | High     | Significant degradation, workaround exists |
| S2    | Medium   | Noticeable limitation, no data loss        |
| S3    | Low      | Code quality or minor UX improvement       |

---

## FIXED Issues

### FIX-001: unreadCount return type mismatch

| Field       | Detail                                                       |
|-------------|--------------------------------------------------------------|
| **Severity**  | ~~S0 CRITICAL~~ → **FIXED**                               |
| **Component** | `notification.unreadCount` (backend router)                |
| **Symptom**   | Bell badge and Dashboard card always showed 0 / hidden     |
| **Root Cause**| Backend returned plain `number`, frontend expected `{ count: number }` |
| **Impact**    | 100% of users saw zero unread count regardless of actual state |
| **Fix**       | Wrapped backend return in `{ count }` object               |
| **Verified**  | Bell, Dashboard, and /notifications page all display correct count |

```
// Before (broken)
return count;          // → 5 (primitive)
// data?.count → undefined

// After (fixed)
return { count };      // → { count: 5 }
// data?.count → 5
```

Also fixed the `/notifications` page to use `.count` access consistently,
matching the Bell and Dashboard components.

---

## No Remaining S0 Issues

All critical (S0) issues have been resolved. The sections below document
known S2 and S3 items that do not affect correctness.

---

## S2 Issues (Medium)

### S2-001: Polling-based count (30s stale window)

| Field       | Detail                                                     |
|-------------|------------------------------------------------------------|
| **Severity**  | S2 MEDIUM                                                |
| **Component** | `notification.unreadCount` query config                  |
| **Symptom**   | New notifications may take up to 30 seconds to appear in badge |
| **Root Cause**| `refetchInterval: 30000` — no WebSocket / SSE push channel |
| **Impact**    | User may not see a new alert for up to 30s after it fires |
| **Workaround**| Window focus triggers immediate refetch via React Query   |

| Metric              | Value     |
|----------------------|-----------|
| Max staleness        | 30 seconds |
| Network cost         | 1 lightweight GET per 30s per mounted consumer |
| User-perceived delay | 0–30s depending on timing |

**Recommendation**: Acceptable for MVP. Consider WebSocket push for
real-time requirements in a future phase.

---

### S2-002: No project-scoped unread count

| Field       | Detail                                                     |
|-------------|------------------------------------------------------------|
| **Severity**  | S2 MEDIUM                                                |
| **Component** | `notification.unreadCount` procedure                     |
| **Symptom**   | Badge shows total unread across all projects              |
| **Root Cause**| Query filters by `userId` only, not by `projectId`       |
| **Impact**    | Users with multiple projects see aggregated count         |
| **Workaround**| /notifications page can filter by source after loading    |

**Recommendation**: Add optional `projectId` parameter to the
`unreadCount` procedure when multi-project UX is prioritised.

---

## S3 Issues (Low)

### S3-001: Type assertion on unreadCount data

| Field       | Detail                                                     |
|-------------|------------------------------------------------------------|
| **Severity**  | S3 LOW                                                   |
| **Component** | Bell and Dashboard components                            |
| **Symptom**   | `(data as any)?.count` pattern in some consumers         |
| **Root Cause**| tRPC inference not fully propagating return type          |
| **Impact**    | No runtime effect; reduces type safety at compile time   |
| **Fix**       | Ensure router output schema is typed, remove `as any`    |

---

### S3-002: No optimistic updates on markRead

| Field       | Detail                                                     |
|-------------|------------------------------------------------------------|
| **Severity**  | S3 LOW                                                   |
| **Component** | `markRead` / `markAllRead` mutations                     |
| **Symptom**   | Brief delay between click and visual update               |
| **Root Cause**| Waits for server round-trip before cache invalidation    |
| **Impact**    | ~100–300ms perceived lag on read actions                  |
| **Fix**       | Add `onMutate` optimistic cache update                   |

```
// Proposed optimistic update pattern
onMutate: async ({ id }) => {
  await utils.notification.unreadCount.cancel();
  const prev = utils.notification.unreadCount.getData();
  utils.notification.unreadCount.setData(undefined, {
    count: Math.max(0, (prev?.count ?? 0) - 1)
  });
  return { prev };
},
onError: (_err, _vars, ctx) => {
  utils.notification.unreadCount.setData(undefined, ctx?.prev);
},
```

---

### S3-003: Duplicate polling from Dashboard and Bell

| Field       | Detail                                                     |
|-------------|------------------------------------------------------------|
| **Severity**  | S3 LOW                                                   |
| **Component** | `notification.unreadCount` query instances                |
| **Symptom**   | Two components each set `refetchInterval: 30000`          |
| **Root Cause**| React Query creates separate interval timers per hook call|
| **Impact**    | Up to 2 polls per 30s instead of 1 (minor network waste) |
| **Fix**       | Centralise polling in a shared provider or custom hook    |

| Scenario              | Polls per 30s |
|------------------------|---------------|
| Dashboard only         | 1             |
| Bell only              | 1             |
| Both mounted (current) | 2             |
| With shared provider   | 1             |

**Note**: React Query may deduplicate if the intervals align, but this
is not guaranteed. A shared hook would ensure exactly one poll.

---

## Summary Table

| ID       | Severity | Title                          | Status   |
|----------|----------|--------------------------------|----------|
| FIX-001  | ~~S0~~   | unreadCount type mismatch      | **FIXED** |
| S2-001   | S2       | 30s polling stale window       | Known    |
| S2-002   | S2       | No project-scoped count        | Known    |
| S3-001   | S3       | `as any` type assertion        | Known    |
| S3-002   | S3       | No optimistic updates          | Known    |
| S3-003   | S3       | Duplicate polling instances    | Known    |

---

## Risk Assessment

| Risk Level | Count | Notes                                    |
|------------|-------|------------------------------------------|
| S0         | 0     | All critical issues resolved             |
| S1         | 0     | No high-severity items found             |
| S2         | 2     | Acceptable for MVP, plan for future      |
| S3         | 3     | Code quality improvements, non-blocking  |

**Overall**: The notification count system is **production-ready** after
the S0 fix. Remaining items are tracked for iterative improvement.
