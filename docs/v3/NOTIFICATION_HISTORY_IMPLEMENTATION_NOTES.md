# Notification History Implementation Notes

## Overview

Documents the implementation details, integration points, and known
limitations for the Notification History feature. Covers router changes,
page component, Bell integration, navigation updates, pagination
mechanics, and shared state synchronization.

---

## Router Changes: notification.list

### Input Schema Extension

The `notification.list` procedure input was extended to support filtering:

```ts
// Before
input: z.object({ skip: z.number(), take: z.number() })

// After
input: z.object({
  skip: z.number().default(0),
  take: z.number().default(20),
  unreadOnly: z.boolean().optional(),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]).optional(),
  sourceType: z.string().optional(),
  since: z.string().optional(),
  search: z.string().optional(),
})
```

### Query Construction

The where clause is built conditionally. Each filter param, when present,
adds a condition to the Prisma `where` object. The `search` param
creates an `OR` across `title` and `message` using `contains` with
`mode: "insensitive"`.

### Return Shape

```ts
{
  items: Notification[];   // paginated results
  totalCount: number;      // total matching items (for pagination)
}
```

The `totalCount` is fetched via a parallel `prisma.notification.count()`
call with the same `where` clause to avoid a second round trip.

---

## Page Component: /notifications/page.tsx

### File Location
`apps/web/src/app/(dashboard)/notifications/page.tsx`

### Component Type
Client component (`"use client"`) — required for interactive state
management (filters, pagination, click handlers).

### Key Hooks and State

| Hook / State     | Purpose                                            |
| ---------------- | -------------------------------------------------- |
| `useState(1)`    | Current page number                                |
| `useState({})`   | Filter state object                                |
| `useState(false)`| Filter panel visibility toggle                     |
| `trpc.notification.list.useQuery` | Fetches paginated notification list |
| `trpc.notification.unreadCount.useQuery` | Unread count for header   |
| `trpc.notification.markRead.useMutation` | Mark single as read      |
| `trpc.notification.markAllRead.useMutation` | Mark all as read      |
| `useRouter()`    | Navigation to actionUrl after marking read         |

### Query Key Dependencies
The `notification.list` query key includes `page` and all filter values,
so React Query automatically refetches when any of these change.

---

## Bell Integration

### Change in top-bar.tsx
A footer link was added to the Bell dropdown component:

```tsx
<Link href="/notifications" className="...">
  모든 알림 보기
</Link>
```

This link appears at the bottom of the dropdown, below the notification
items. Clicking it closes the dropdown and navigates to the full
notification history page.

### Shared Query
Both the Bell badge and the notifications page use the same
`notification.unreadCount` tRPC query. This means:

- Marking a notification as read on the history page immediately
  updates the Bell badge count (via query invalidation).
- Reading a notification from the Bell dropdown and then visiting
  the history page shows the updated read state.
- No custom event bus or global state manager is needed — React Query
  cache acts as the single source of truth.

---

## Navigation: NAV_ACCOUNT Update

### Change
A new entry was added to `NAV_ACCOUNT` in the navigation config:

```ts
{
  title: "nav.notifications",
  href: "/notifications",
  icon: Bell,
}
```

### Translation Key
`nav.notifications` was added to all locale files:
- `ko.json`: "알림"
- `en.json`: "Notifications"
- `ja.json`: "通知"

### Placement
The notifications link appears in the account section of the sidebar,
grouped with other user-facing settings and profile links.

---

## Pagination

### Strategy
Client-side page state with server-side `skip` / `take`.

### Mechanics

```ts
const pageSize = 20;
const skip = (page - 1) * pageSize;

// Query
trpc.notification.list.useQuery({
  skip,
  take: pageSize,
  ...filters,
});

// Total pages
const totalPages = Math.ceil(totalCount / pageSize);
```

### Controls
- Previous and Next buttons with disabled states at boundaries.
- Page indicator: "페이지 {page} / {totalPages}".
- Total count display: "{totalCount}건".
- No jump-to-page or page number buttons (kept simple for now).

### Filter Interaction
When any filter changes, page is reset to 1 to avoid showing an
empty page if the filtered result set is smaller.

---

## Sync: Shared notification.unreadCount

### Consumers
1. **Bell badge** in `top-bar.tsx` — shows the count as a red badge.
2. **Notifications page header** — shows "읽지 않은 알림 N건".

### Invalidation Points
The `notification.unreadCount` query is invalidated after:
- `markRead` mutation succeeds
- `markAllRead` mutation succeeds

Both mutations also invalidate `notification.list` to refresh the
displayed items.

### Cache Behavior
React Query's default `staleTime` applies. The Bell component may
poll or refetch on window focus depending on configuration. The
notifications page always refetches on mount.

---

## formatTime Helper

Converts a notification's `createdAt` timestamp to a human-readable
relative time string.

### Logic

```ts
function formatTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 30) return `${days}일 전`;

  // Fallback: formatted date
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
```

### Usage
Called inline for each notification item in the list. No external
date library is used — the helper relies on native `Date` arithmetic.

### Locale Consideration
The fallback date format uses `ko-KR` locale. For multi-locale support,
this should eventually use the current locale from `next-intl`, but
is hardcoded for the initial implementation.

---

## Known Gaps

### No Bulk Select / Delete
Users cannot select multiple notifications and delete or mark them as
read in bulk. The only bulk action is "모두 읽음 처리" which marks
ALL unread items, not a selection.

### No Export
There is no way to export notification history as CSV, PDF, or other
formats. This could be useful for audit trails but is not prioritized.

### No Notification Preferences
Users cannot configure which types of notifications they receive or
set per-type delivery preferences (e.g., email vs in-app). All
notifications are delivered in-app only.

### No Real-Time Updates
The notification list does not update in real-time. New notifications
appear only on page refresh or query refetch (e.g., window focus).
WebSocket or SSE integration would be needed for live updates.

### No Notification Deletion
Individual or bulk deletion is not implemented. Notifications are
permanent once created. A cleanup job may be added later to archive
old notifications.

### No Category Grouping
Notifications are shown as a flat chronological list. Grouping by
date (Today / Yesterday / Earlier) or by source type could improve
readability but is deferred.

---

## File Reference

| File | Role |
| ---- | ---- |
| `apps/web/src/app/(dashboard)/notifications/page.tsx` | Page component |
| `apps/web/src/components/layout/top-bar.tsx` | Bell dropdown with "모든 알림 보기" link |
| `apps/web/src/server/routers/notification.ts` | tRPC notification router |
| `apps/web/src/config/nav.ts` | NAV_ACCOUNT with notifications entry |
| `packages/db/prisma/schema.prisma` | Notification model definition |
| `apps/web/src/messages/ko.json` | Korean translations |
| `apps/web/src/messages/en.json` | English translations |

---

## Testing Notes

### Manual Test Scenarios
1. Load page with no notifications — verify empty state.
2. Load page with 50+ notifications — verify pagination works.
3. Apply each filter individually — verify list updates correctly.
4. Combine multiple filters — verify AND logic.
5. Search for a keyword — verify matching items appear.
6. Click a notification with actionUrl — verify markRead + navigation.
7. Click "읽음" button — verify item updates without navigation.
8. Click "모두 읽음 처리" — verify all items update + Bell badge resets.
9. Clear filters after filtering — verify full list returns.
10. Verify Bell badge updates after marking items on this page.

### Automated Testing
No automated tests are in place for this feature yet. Unit tests for
`formatTime` and the filter state logic would be the easiest first step.
Integration tests for the tRPC procedures would cover the query and
mutation paths.
