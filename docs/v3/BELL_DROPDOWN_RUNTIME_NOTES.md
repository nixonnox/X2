# Bell Dropdown Runtime Notes

## Overview

This document captures the runtime behavior of the notification Bell dropdown,
including tRPC query and mutation configurations, helper function logic,
integration with the Dashboard IntelligenceSummaryCard, and known remaining
gaps. It serves as the technical companion to `BELL_DROPDOWN_UI_SPEC.md`.

---

## tRPC Queries

### notification.unreadCount

This query is **always active** regardless of whether the dropdown is open
or closed. It drives the badge number on the Bell icon.

| Property           | Value                                               |
| ------------------ | --------------------------------------------------- |
| Query key          | `["notification", "unreadCount"]`                   |
| Enabled            | Always (`true`)                                     |
| Polling interval   | 30,000ms (30 seconds)                               |
| refetchOnWindowFocus | `true`                                            |
| staleTime          | 15,000ms (15 seconds)                               |
| Return shape       | `{ count: number }`                                 |

```typescript
const { data: unreadData } = api.notification.unreadCount.useQuery(
  undefined,
  {
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  }
);
const unreadCount = unreadData?.count ?? 0;
```

The `staleTime` of 15 seconds prevents redundant refetches when the user
rapidly switches tabs. Combined with the 30-second poll, this means the
count is never more than ~45 seconds stale under normal conditions.

### notification.list

This query is **conditionally enabled** -- it only fires when the Bell
dropdown is open. This avoids fetching the full notification list on every
page load.

| Property           | Value                                               |
| ------------------ | --------------------------------------------------- |
| Query key          | `["notification", "list", { page: 1, pageSize: 10 }]` |
| Enabled            | `bellOpen === true`                                 |
| Polling interval   | None (only fetches on open or invalidation)         |
| Parameters         | `{ page: 1, pageSize: 10 }`                        |
| Return shape       | `{ items: Notification[], total: number, page: number, pageSize: number }` |

```typescript
const { data, isLoading, isError, refetch } = api.notification.list.useQuery(
  { page: 1, pageSize: 10 },
  {
    enabled: bellOpen,
  }
);
```

The query fetches the first page of 10 notifications sorted by `createdAt`
descending (newest first). When the dropdown is closed, the query is
disabled and no network requests are made.

### Query Lifecycle

```
Page load
  └─ notification.unreadCount starts polling (every 30s)
  └─ notification.list is DISABLED (bellOpen = false)

User clicks Bell icon
  └─ bellOpen = true
  └─ notification.list ENABLED → initial fetch fires
  └─ Dropdown renders loading → items/empty/error

User closes dropdown
  └─ bellOpen = false
  └─ notification.list DISABLED (cached data retained)

markRead or markAllRead succeeds
  └─ both queries invalidated → immediate refetch
  └─ unreadCount updates badge
  └─ list updates dropdown contents (if open)
```

---

## tRPC Mutations

### notification.markRead

Marks a single notification as read by its ID.

| Property           | Value                                               |
| ------------------ | --------------------------------------------------- |
| Input              | `{ id: string }`                                    |
| Server effect      | `UPDATE Notification SET isRead = true WHERE id = :id` |
| onSuccess          | Invalidates `unreadCount` and `list` queries        |

```typescript
const markRead = api.notification.markRead.useMutation({
  onSuccess: () => {
    utils.notification.unreadCount.invalidate();
    utils.notification.list.invalidate();
  },
});
```

This mutation is called when the user clicks a notification row. The click
handler first calls `markRead`, then navigates to the `actionUrl`. If the
notification is already read (`isRead = true`), the mutation call is skipped
and only navigation occurs.

### notification.markAllRead

Marks all notifications for the current user as read.

| Property           | Value                                               |
| ------------------ | --------------------------------------------------- |
| Input              | None (uses session userId)                          |
| Server effect      | `UPDATE Notification SET isRead = true WHERE userId = :currentUserId` |
| onSuccess          | Invalidates `unreadCount` and `list` queries        |

```typescript
const markAllRead = api.notification.markAllRead.useMutation({
  onSuccess: () => {
    utils.notification.unreadCount.invalidate();
    utils.notification.list.invalidate();
  },
});
```

This mutation is triggered by the "모두 읽음" button in the dropdown header.
The button is only rendered when `unreadCount > 0`.

### Optimistic Updates

Neither mutation currently implements optimistic updates. The invalidation
approach was chosen for simplicity and correctness:

- `markRead`: The badge decrements and the blue dot disappears after the
  server confirms. The delay is typically imperceptible (<100ms).
- `markAllRead`: The badge drops to 0 and all dots disappear after server
  confirmation. For users with many unread notifications, a brief flash
  of the old count may be visible.

If latency becomes a UX concern, optimistic updates can be added by
setting the count to `count - 1` (for markRead) or `0` (for markAllRead)
in the `onMutate` callback, with rollback in `onError`.

---

## formatNotificationTime Helper

This utility function converts a `Date` or ISO string into a Korean-language
relative time label. It is used in the notification item row to display
when the notification was created.

### Logic

```typescript
function formatNotificationTime(createdAt: Date | string): string {
  const now = new Date();
  const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}월 ${day}일`;
}
```

### Boundary Behavior

| Input (relative to now)     | Output                                   |
| --------------------------- | ---------------------------------------- |
| 0 seconds ago               | "방금 전"                                |
| 30 seconds ago              | "방금 전"                                |
| 59 seconds ago              | "방금 전"                                |
| 1 minute ago                | "1분 전"                                 |
| 59 minutes ago              | "59분 전"                                |
| 60 minutes ago              | "1시간 전"                               |
| 23 hours ago                | "23시간 전"                              |
| 24 hours ago                | "1일 전"                                 |
| 6 days ago                  | "6일 전"                                 |
| 7 days ago                  | "3월 8일" (example for March 8)          |
| 30 days ago                 | "2월 13일" (example for Feb 13)          |

The function does not handle future dates. If `createdAt` is in the future
(clock skew), `diffMin` will be negative and the function falls through
to the absolute date format, which is acceptable.

---

## Dashboard IntelligenceSummaryCard Integration

The Dashboard's IntelligenceSummaryCard previously derived its alert count
from signal hint string matching. It now uses the same
`notification.unreadCount` tRPC query as the Bell badge.

### Before

```typescript
// Old approach -- signal hint string matching
const alertCount = signals.filter((s) =>
  s.hint?.includes("급등") || s.hint?.includes("이상")
).length;
```

### After

```typescript
// New approach -- notification table query
const { data } = api.notification.unreadCount.useQuery(undefined, {
  refetchInterval: 30_000,
});
const alertCount = data?.count ?? 0;
```

### Behavioral Changes

| Aspect               | Before (hint matching)          | After (unreadCount query)     |
| -------------------- | ------------------------------- | ----------------------------- |
| Data source          | In-memory signal hints          | Notification table            |
| Read-state aware     | No                              | Yes                           |
| Synced with Bell     | No                              | Yes                           |
| Affected by markRead | No                              | Yes                           |
| Coverage             | Only signal-derived hints       | All notification types        |

The card's "알림 보기" action still opens the Bell dropdown rather than
navigating to a dedicated page, since no `/notifications` page exists yet.

---

## Known Remaining Gaps

The following features are not yet implemented. They are documented here
so that future work can be planned without re-analyzing the current state.

### 1. No /notifications Page

There is no dedicated full-page notifications view. Users can only see
notifications through the Bell dropdown, which is limited to the 10 most
recent items. Older notifications are invisible.

**Impact**: Users with high notification volume cannot access their full
history. The `total` field from the list query is available but not
surfaced in the UI.

### 2. No Pagination in Dropdown

The dropdown always fetches `page: 1, pageSize: 10`. There is no "load
more" button or infinite scroll. The list query already supports pagination
parameters, so the backend work is done -- only the frontend needs updating.

### 3. No Filter by sourceType

All notification types are shown in a single list. There is no tab or
filter to show only intelligence alerts, only benchmark alerts, etc. The
`sourceType` field is available on each notification and is used to render
the source badge, but filtering is not exposed to the user.

### 4. No Dismiss or Snooze

Notifications cannot be dismissed (deleted) or snoozed (hidden temporarily).
The only state transition is unread to read. Dismissed notifications would
require either a soft-delete flag (`isDismissed`) or a hard delete, neither
of which exists in the current schema.

### 5. No Real-Time WebSocket

Notification delivery relies on 30-second polling. There is no WebSocket
or Server-Sent Events channel for push-based updates. When a new
intelligence alert is generated, the user will not see it for up to 30
seconds (or until they refocus the tab).

**Migration path**: See `NOTIFICATION_COUNT_SOURCE_OF_TRUTH.md` for the
planned WebSocket integration approach. The key insight is that both Bell
and Dashboard already share the same query key, so a single WebSocket
handler calling `invalidate()` will update both.

### 6. No Sound or Browser Notification

There is no audible alert or browser Notification API integration. The
badge count change is the only signal to the user that new notifications
have arrived.

### 7. No Batch Operations

Beyond "모두 읽음", there are no batch operations (e.g., select multiple
and mark read, select multiple and dismiss). This is acceptable for the
current notification volume but may become a pain point as usage grows.

---

## Performance Considerations

- The `unreadCount` query is a simple COUNT with a WHERE clause on an
  indexed column (`isRead`). Response time is sub-millisecond for typical
  notification volumes (< 10,000 rows per user).
- The `list` query uses LIMIT/OFFSET pagination. For page 1 this is
  efficient. If pagination is added later, cursor-based pagination should
  be considered for large datasets.
- The 30-second polling interval produces at most 2 requests per minute
  per active tab for the count query. The list query only fires when the
  dropdown is open, which is infrequent.
- React Query's deduplication ensures that if multiple components mount
  the same query, only one network request is made.

---

## Related Documents

- `NOTIFICATION_COUNT_SOURCE_OF_TRUTH.md` -- Why unreadCount is the single source
- `BELL_DROPDOWN_UI_SPEC.md` -- Visual and interaction specification
- `NOTIFICATION_BELL_IMPLEMENTATION_NOTES.md` -- Component code details
- `INTELLIGENCE_ALERT_TRIGGER_POLICY.md` -- When notifications are created
- `INTELLIGENCE_NOTIFICATION_DELIVERY_SPEC.md` -- Delivery pipeline
