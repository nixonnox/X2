# Notification Filter and Read Flow

## Overview

This document describes the filter state model, backend query extensions,
and read/mark-all-read flows used by the Notification History page.

---

## Filter State

The page maintains a single filter state object in `useState`:

```ts
interface NotificationFilters {
  unreadOnly: boolean | undefined;  // undefined = all, true = unread, false = read
  priority: "URGENT" | "HIGH" | "NORMAL" | "LOW" | undefined;
  sourceType: "intelligence_alert" | "system" | undefined;
  since: string | undefined;        // ISO date string or undefined
  search: string | undefined;       // keyword search term
}
```

### Default State

All fields default to `undefined`, meaning no filters are applied.
The `unreadOnly` toggle defaults to the "전체" (All) position.

### Filter Update Behavior

When any filter value changes:
1. The corresponding field in the filter state is updated.
2. The `page` state is reset to `1`.
3. The `notification.list` query re-fires with the new parameters.

---

## Backend: notification.list Input Extension

The `notification.list` procedure now accepts the following additional
input fields alongside the existing `skip` and `take`:

```ts
input: z.object({
  skip: z.number().default(0),
  take: z.number().default(20),
  unreadOnly: z.boolean().optional(),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]).optional(),
  sourceType: z.string().optional(),
  since: z.string().optional(),   // ISO date string
  search: z.string().optional(),
})
```

### Where Clause Construction

The Prisma `where` clause is built dynamically:

```ts
const where: Prisma.NotificationWhereInput = {
  userId: ctx.session.user.id,
};

if (input.unreadOnly === true)  where.isRead = false;
if (input.unreadOnly === false) where.isRead = true;

if (input.priority) {
  where.priority = input.priority;
}

if (input.sourceType) {
  where.sourceType = input.sourceType;
}

if (input.since) {
  where.createdAt = { gte: new Date(input.since) };
}

if (input.search) {
  where.OR = [
    { title:   { contains: input.search, mode: "insensitive" } },
    { message: { contains: input.search, mode: "insensitive" } },
  ];
}
```

---

## Since Filter: Period-to-Date Conversion

The frontend period selector presents human-readable options.
Conversion to ISO date strings happens on the client before sending:

| UI Label  | Value | Conversion Logic                                   |
| --------- | ----- | -------------------------------------------------- |
| 전체      | all   | `since` is set to `undefined`                       |
| 오늘      | 1d    | Start of today: `new Date().setHours(0,0,0,0)`     |
| 7일       | 7d    | `Date.now() - 7 * 24 * 60 * 60 * 1000`             |
| 30일      | 30d   | `Date.now() - 30 * 24 * 60 * 60 * 1000`            |

The resulting `Date` is converted to ISO string via `.toISOString()`
and passed as the `since` parameter.

---

## Search Filter

- Searches across both `title` and `message` fields using Prisma
  `contains` with `mode: "insensitive"`.
- The two conditions are combined with `OR` so a match in either
  field returns the notification.
- Search is debounced on the client (300ms) to avoid excessive queries.
- Empty string is normalized to `undefined` before sending.
- No full-text search index is used — this is a simple `LIKE` query.
  Acceptable for current scale but may need indexing later.

---

## Read Flow: markRead

### Trigger
- User clicks a notification row or the individual "읽음" button.

### Client-Side Steps
1. Call `notification.markRead({ id })` mutation.
2. On success, invalidate:
   - `notification.list` — to update the read status in the list.
   - `notification.unreadCount` — to update the Bell badge.
3. If `actionUrl` is present and the click was on the row (not just
   the read button), navigate to `actionUrl` via `router.push`.

### Server-Side Steps
1. Receive `{ id }` input.
2. Run `prisma.notification.updateMany` with:
   - `where: { id, userId: ctx.session.user.id }`
   - `data: { isRead: true, readAt: new Date() }`
3. The `userId` check ensures users cannot mark others' notifications.
4. `updateMany` is used instead of `update` to silently handle
   already-read or missing notifications (returns count: 0).
5. Return `{ success: true }`.

### Why updateMany Instead of update
- `update` throws if the record is not found; `updateMany` returns
  `{ count: 0 }` which is safer for race conditions (e.g., the item
  was already read in another tab).

---

## Read Flow: markAllRead

### Trigger
- User clicks "모두 읽음 처리" button in the page header.

### Client-Side Steps
1. Call `notification.markAllRead()` mutation (no input needed).
2. On success, invalidate:
   - `notification.list`
   - `notification.unreadCount`
3. Optionally show a brief toast: "모든 알림을 읽음 처리했습니다."

### Server-Side Steps
1. Run `prisma.notification.updateMany` with:
   - `where: { userId: ctx.session.user.id, isRead: false }`
   - `data: { isRead: true, readAt: new Date() }`
2. Return `{ success: true, count }` where `count` is the number
   of notifications that were actually updated.

### Edge Cases
- If called when there are no unread notifications, `updateMany`
  returns `{ count: 0 }` — no error, no side effects.
- The button is disabled client-side when unreadCount is 0 to prevent
  unnecessary calls.

---

## Clear Filters

### Trigger
- User clicks "필터 초기화" button in the filter panel.

### Behavior
1. All filter fields are reset to their defaults (`undefined`).
2. The `page` state is reset to `1`.
3. The `notification.list` query re-fires with no filter params.

---

## hasActiveFilters

A computed value derived from the filter state:

```ts
const hasActiveFilters = Boolean(
  filters.unreadOnly !== undefined ||
  filters.priority ||
  filters.sourceType ||
  filters.since ||
  filters.search
);
```

### Usage
- Drives a small badge dot on the filter toggle button.
- Controls visibility of the "필터 초기화" button.
- Determines which empty state to show (no-filters vs filters-active).

---

## Query Invalidation Summary

| Action       | Invalidated Queries                          |
| ------------ | -------------------------------------------- |
| markRead     | `notification.list`, `notification.unreadCount` |
| markAllRead  | `notification.list`, `notification.unreadCount` |
| filter change | `notification.list` (automatic via query key) |
| page change  | `notification.list` (automatic via query key) |

Both the Bell dropdown and the Notification History page consume
`notification.unreadCount`, ensuring the badge stays in sync regardless
of where the user marks notifications as read.

---

## Error Handling

- If `markRead` fails, show toast "알림 읽음 처리에 실패했습니다."
  and do not navigate. The item remains in its current state.
- If `markAllRead` fails, show toast with error and do not invalidate.
- If `notification.list` fetch fails, the page enters the error state
  with a retry button.
- Network errors during filter changes leave the previous results
  visible until retry succeeds.

---

## Performance Notes

- The `search` filter uses `contains` (SQL LIKE) which is not indexed.
  For the expected notification volume (hundreds per user), this is fine.
- If volume grows significantly, consider adding a GIN index on
  `title` and `message`, or switching to full-text search.
- The debounce on search input (300ms) prevents query storms during typing.
- `notification.list` returns `totalCount` alongside `items` so
  pagination controls render without a separate count query.
