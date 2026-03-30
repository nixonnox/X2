# Notification Bell Implementation Notes

> **Date**: 2026-03-15
> **Component**: TopBar notification dropdown
> **File**: `apps/web/src/components/layout/top-bar.tsx`
> **Priority**: P1

---

## Context

The TopBar component previously had a static bell icon that did nothing when clicked.
Since the Intelligence alert pipeline now generates real notifications (see
`ALERT_RUNTIME_STABILITY_FIX.md`), users need a way to view and interact with them.

This fix replaces the placeholder with a fully functional notification dropdown using
existing tRPC notification endpoints.

---

## Component Architecture

### Location

```
apps/web/src/components/layout/top-bar.tsx
  TopBar (exported)
    -> Language switcher (existing)
    -> Notification bell + dropdown (this fix)
    -> User profile menu (existing)
```

### State Management

A single `bellOpen` boolean controls dropdown visibility:

```ts
const [bellOpen, setBellOpen] = useState(false);
```

No external state store (Zustand, etc.) is used. The notification data lives entirely
in tRPC query cache, which handles refetching and invalidation.

---

## tRPC Integration

### Queries

| Query | Purpose | Config |
|-------|---------|--------|
| `notification.unreadCount` | Badge count on bell icon | `refetchInterval: 30000` (30s polling) |
| `notification.list` | Dropdown content | `enabled: bellOpen`, page 1, pageSize 10 |

The `unreadCount` query runs continuously (30s interval) regardless of dropdown state.
This ensures the badge count stays current even when the dropdown is closed.

The `list` query only fires when the dropdown opens (`enabled: bellOpen`). This avoids
unnecessary data fetching when the user has not interacted with the bell.

### Mutations

| Mutation | Trigger | Side effects |
|----------|---------|-------------|
| `notification.markRead` | User clicks an actionUrl link | Refetches `unreadCount` + `list` |
| `notification.markAllRead` | User clicks "Mark all read" header button | Refetches `unreadCount` + `list` |

Both mutations use `onSuccess` callbacks to invalidate the relevant queries:

```ts
const markReadMutation = trpc.notification.markRead.useMutation({
  onSuccess: () => {
    unreadCountQuery.refetch();
    notificationsQuery.refetch();
  },
});
```

---

## Unread Count Badge

The badge appears on the top-right corner of the bell icon.

### Rendering Rules

| Condition | Display |
|-----------|---------|
| `unreadCount === 0` | Badge hidden entirely |
| `1 <= unreadCount <= 9` | Shows exact number |
| `unreadCount > 9` | Shows "9+" |

### Implementation

```tsx
{unreadCount > 0 && (
  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center
    justify-center rounded-full bg-[var(--destructive)] text-[9px] font-bold text-white">
    {unreadCount > 9 ? "9+" : unreadCount}
  </span>
)}
```

The count value is extracted from the query response:
```ts
const unreadCount = (unreadCountQuery.data as any)?.count ?? 0;
```

The `as any` cast is used because the tRPC response type is not fully typed at the
TopBar level. This is acceptable for a layout component.

---

## Dropdown Structure

### Header

```
+------------------------------------------+
| Notifications              [Mark all read] |
+------------------------------------------+
```

- Title: "Notifications" (Korean: "알림")
- "Mark all read" button: Only visible when `unreadCount > 0`
- Calls `markAllReadMutation.mutate()` on click

### Notification List

Scrollable container with `max-h-[360px] overflow-y-auto`. Each item layout:

```
+------------------------------------------+
| [icon]  Notification message text that    |
|         may wrap to multiple lines        |
|         3월 15일 14:30   [View ->]        |
+------------------------------------------+
```

### Priority Icons

| Priority | Icon | Color |
|----------|------|-------|
| HIGH | `AlertTriangle` | amber-500 |
| URGENT | `AlertTriangle` | amber-500 |
| NORMAL | `Bell` | gray-400 |
| LOW | `Bell` | gray-400 |

Icons are rendered at 3.5x3.5 (14px) with `shrink-0` to prevent compression.

### Read/Unread Visual State

| State | Background | Text weight |
|-------|-----------|-------------|
| Unread | `bg-blue-50/40` | `font-medium text-gray-800` |
| Read | transparent | `text-gray-600` (normal weight) |

### Date Format

Uses `toLocaleDateString` with Korean locale:

```ts
new Date(n.createdAt).toLocaleDateString("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})
```

Output example: `3월 15일 오후 02:30`

### Action Links

When a notification has an `actionUrl`:

```tsx
<a
  href={n.actionUrl}
  onClick={() => {
    if (!n.isRead) markReadMutation.mutate({ id: n.id });
    setBellOpen(false);
  }}
  className="flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline"
>
  View <ExternalLink className="h-2.5 w-2.5" />
</a>
```

Clicking the link:
1. Marks the notification as read (if not already)
2. Closes the dropdown
3. Navigates to the actionUrl

When there is no `actionUrl` but the notification is unread, a simple "Mark as read"
button with a `Check` icon is shown instead.

---

## Empty and Loading States

### Loading

Shown while `notificationsQuery.isLoading` is true:

```tsx
<div className="flex items-center justify-center py-8">
  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
</div>
```

### Empty

Shown when the query resolves with zero items:

```tsx
<div className="py-8 text-center">
  <Bell className="mx-auto h-5 w-5 text-gray-300 mb-2" />
  <p className="text-[12px] text-gray-400">No new notifications</p>
</div>
```

Korean text: "새로운 알림이 없습니다"

---

## Backdrop and Dismiss

A transparent full-screen backdrop (`fixed inset-0 z-40`) is rendered behind the dropdown.
Clicking anywhere outside the dropdown triggers `setBellOpen(false)`.

The dropdown itself sits at `z-50` to appear above the backdrop.

---

## Imported Dependencies

All icons are from `lucide-react` (already a project dependency):

```ts
import {
  Bell,           // Bell icon (button + priority fallback + empty state)
  ExternalLink,   // Action URL indicator
  AlertTriangle,  // HIGH/URGENT priority indicator
  Loader2,        // Loading spinner
  Check,          // "Mark as read" button icon
} from "lucide-react";
```

tRPC client:
```ts
import { trpc } from "@/lib/trpc";
```

---

## Design Decisions

1. **No Zustand store**: Notification state is ephemeral UI state. The tRPC query cache
   handles data freshness, and the dropdown re-queries on every open. No global store needed.

2. **30s polling vs WebSocket**: Polling was chosen for simplicity. The current notification
   volume (alert-driven only) does not justify WebSocket infrastructure. This can be
   upgraded later if real-time requirements increase.

3. **Page 1 only**: The dropdown shows at most 10 items (page 1). A "View all" link to a
   dedicated notifications page can be added in a future iteration. For the current
   alert-only use case, 10 items is sufficient.

4. **Korean locale hardcoded**: Date formatting uses `"ko-KR"`. This should be updated to
   use the app's current locale (`useLocale()`) when i18n for notifications is implemented.

5. **Type casting**: `(notificationsQuery.data as any)?.items` and similar casts are used
   because the notification router types are not fully inferred at the component level.
   This is a known limitation that can be addressed with end-to-end type inference.

---

## Related Files

```
apps/web/src/components/layout/top-bar.tsx           (this component)
packages/api/src/routers/notification.ts             (tRPC router)
packages/api/src/services/intelligence/
  intelligence-alert.service.ts                      (alert notification creator)
packages/db/prisma/schema.prisma                     (Notification model)
```
