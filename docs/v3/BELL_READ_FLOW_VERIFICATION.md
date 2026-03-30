# Bell Read Flow Verification Report

> **Date**: 2026-03-15
> **Scope**: markRead and markAllRead mutation flows across Bell dropdown and /notifications page
> **Status**: VERIFIED — All read flows trigger proper cache invalidation

---

## 1. Read Action Matrix

### Bell Dropdown

| Action                    | Trigger                  | Mutation          | Side Effect              |
|---------------------------|--------------------------|-------------------|--------------------------|
| Click notification item   | `onClick` on item row    | `markRead({ id })` | `router.push(actionUrl)` |
| "모두 읽음" button        | `onClick` on header btn  | `markAllRead()`   | none (stays in dropdown) |

### /notifications Page

| Action                    | Trigger                  | Mutation          | Side Effect              |
|---------------------------|--------------------------|-------------------|--------------------------|
| Click notification item   | `onClick` on item row    | `markRead({ id })` | `router.push(actionUrl)` |
| Individual read button    | `onClick` on icon button | `markRead({ id })` | `stopPropagation` (no nav) |
| "모두 읽음 처리" button   | `onClick` on header btn  | `markAllRead()`   | none (stays on page)     |

---

## 2. markRead Flow (Single Notification)

### Sequence

```
User clicks item
  → markRead.mutate({ id: notification.id })
  → Backend: UPDATE notification SET read = true WHERE id = ?
  → onSuccess callback fires
      → utils.notification.unreadCount.invalidate()
      → utils.notification.list.invalidate()
  → router.push(notification.actionUrl)  // if triggered by item click
```

### Individual Read Button (/notifications Page)

```
User clicks read icon button
  → event.stopPropagation()  // prevents row click / navigation
  → markRead.mutate({ id: notification.id })
  → Backend: UPDATE notification SET read = true WHERE id = ?
  → onSuccess callback fires
      → utils.notification.unreadCount.invalidate()
      → utils.notification.list.invalidate()
  // No navigation — item stays in place, dot disappears
```

The `stopPropagation` call is critical: without it, the click would
bubble to the row's `onClick` handler and trigger both `markRead` and
`router.push`, causing an unwanted navigation.

---

## 3. markAllRead Flow (Bulk)

### Sequence

```
User clicks "모두 읽음" / "모두 읽음 처리" button
  → markAllRead.mutate()
  → Backend: UPDATE notification SET read = true WHERE userId = ? AND read = false
  → onSuccess callback fires
      → utils.notification.unreadCount.invalidate()
      → utils.notification.list.invalidate()
  // No navigation — user stays in current view
```

### Affected Scope

| Parameter     | Value                          |
|---------------|--------------------------------|
| User scope    | Current authenticated user     |
| Read filter   | Only `read = false` records    |
| Project scope | All projects (global)          |

---

## 4. Cache Invalidation Cascade

Both `markRead` and `markAllRead` invalidate the same two query keys:

| Query Key                    | Effect After Invalidation              |
|------------------------------|----------------------------------------|
| `notification.unreadCount`   | Refetch → badge/card count updates     |
| `notification.list`          | Refetch → item read status updates     |

### Cross-Component Sync

```
markRead/markAllRead onSuccess
  ├── invalidate("notification.unreadCount")
  │     ├── Bell badge → re-renders with new count
  │     ├── Dashboard card → re-renders with new count
  │     └── /notifications header → re-renders with new count
  └── invalidate("notification.list")
        ├── Bell dropdown → re-renders item list
        └── /notifications page → re-renders item list
```

Because React Query uses the query key as the cache identity, **all
mounted components** that consume these queries update automatically.
No manual state synchronisation is needed.

---

## 5. Count Display Rules

| Count Value | Bell Badge  | Dashboard Card | /notifications |
|-------------|-------------|----------------|----------------|
| `0`         | **hidden**  | **hidden**     | "0"            |
| `1–9`       | exact number| exact number   | exact number   |
| `10+`       | **"9+"**    | **"9+"**       | exact number   |

### Implementation

```
// Bell and Dashboard
count === 0 → badge not rendered
count > 9   → display "9+"
else        → display count.toString()

// /notifications page header
Always displays exact count (no cap)
```

---

## 6. Edge Cases

| Scenario                                  | Behaviour                           |
|-------------------------------------------|-------------------------------------|
| markRead on already-read notification     | No-op on backend, no error          |
| markAllRead with 0 unread                 | No-op, count stays 0               |
| actionUrl is null/undefined               | markRead fires, no navigation       |
| Network error on markRead                 | Toast error, count unchanged        |
| Rapid double-click on item                | Mutation deduped by React Query     |
| markRead during markAllRead in-flight     | Both resolve, final state correct   |

---

## 7. Button Visibility Rules

| Button              | Location          | Visible When               |
|---------------------|-------------------|-----------------------------|
| "모두 읽음"         | Bell dropdown     | `unreadCount > 0`           |
| "모두 읽음 처리"    | /notifications    | `unreadCount > 0`           |
| Individual read btn | /notifications    | `item.read === false`       |

When `unreadCount === 0`, bulk-read buttons are either hidden or disabled
to prevent unnecessary mutations.

---

## 8. Data Flow Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│ Bell Item    │────▶│ markRead({ id }) │────▶│ invalidate:       │
│ Click        │     │                  │     │  • unreadCount    │
└─────────────┘     └──────────────────┘     │  • list           │
                                              └───────┬───────────┘
┌─────────────┐     ┌──────────────────┐              │
│ Page Item   │────▶│ markRead({ id }) │──────────────┤
│ Click       │     │                  │              │
└─────────────┘     └──────────────────┘              ▼
                                              ┌───────────────────┐
┌─────────────┐     ┌──────────────────┐      │ All consumers     │
│ Bulk Read   │────▶│ markAllRead()    │─────▶│ re-render with    │
│ Button      │     │                  │      │ fresh data        │
└─────────────┘     └──────────────────┘      └───────────────────┘
```

---

## 9. Summary

All read flows (single item click, individual read button, bulk mark-all)
correctly trigger `markRead` or `markAllRead` mutations. Every mutation's
`onSuccess` handler invalidates both `unreadCount` and `list` query caches,
ensuring the Bell badge, Dashboard card, and /notifications page stay
synchronised without manual state management. Count displays hide at 0 and
cap at "9+" for compact UI contexts.
