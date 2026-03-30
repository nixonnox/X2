# Notification History Page Spec

## Route

- Path: `/notifications`
- File: `apps/web/src/app/(dashboard)/notifications/page.tsx`
- Layout: uses the standard `(dashboard)` layout with sidebar and top-bar
- Access: authenticated users only (session guard from layout)

---

## Purpose

Provides a full-page view of all notifications for the current user.
The Bell dropdown in the top-bar shows the most recent items; this page
serves as the complete, filterable, paginated archive.

---

## Page Header

| Element              | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| Title                | "알림" (Notifications)                                       |
| Unread count summary | e.g. "읽지 않은 알림 12건" — hidden when count is 0          |
| Mark-all-read button | "모두 읽음 처리" — calls `markAllRead`, disabled when 0 unread |
| Filter toggle        | Icon button that expands/collapses the filter panel           |

The header is sticky so it remains visible while scrolling through the list.

---

## Filter Panel

Rendered below the header when the filter toggle is active.
All filter values are kept in local component state and sent as query
params to `notification.list`.

### Filter Controls

| Control       | Type           | Options / Behavior                                       |
| ------------- | -------------- | -------------------------------------------------------- |
| Read/Unread   | Toggle group   | "전체", "읽지 않음", "읽음"                               |
| Priority      | Select         | ALL (default), URGENT, HIGH, NORMAL, LOW                 |
| Source Type   | Select         | ALL (default), intelligence_alert, system                |
| Period        | Select         | 전체 (all), 오늘 (today/1d), 7일 (7d), 30일 (30d)        |
| Keyword       | Text input     | Free-text search across title and message fields         |

- Changing any filter resets the page back to 1.
- A "필터 초기화" (Clear filters) button appears when any filter is active.
- `hasActiveFilters` is a computed boolean that drives a badge dot on the
  filter toggle icon.

---

## Notification List

### Item Layout

Each notification row contains the following elements arranged horizontally:

```
[ Unread dot ] [ Severity icon ] [ Content block ] [ Meta block ] [ Action ]
```

#### Unread Dot
- Small colored circle (blue) displayed only for unread items.
- Positioned at the leading edge of the row.

#### Severity Icon
- Maps to `priority`: URGENT = red alert icon, HIGH = orange warning,
  NORMAL = blue info, LOW = gray info.
- Fixed width column so items align vertically.

#### Content Block
- **Title**: single line, font-medium, truncated with ellipsis if too long.
- **Message**: up to 2 lines, text-sm text-muted-foreground, truncated.
- Clicking the content area triggers the read-and-navigate action.

#### Meta Block
- **Relative time**: uses `formatTime` helper — "방금 전", "3분 전",
  "2시간 전", "3일 전", or formatted date for older items.
- **Priority badge**: small colored badge showing priority level text.
  Only shown for URGENT and HIGH to reduce visual noise.
- **Source badge**: shows "Intelligence" when `sourceType` is
  `intelligence_alert`. System notifications have no badge.

#### Action Area
- If `actionUrl` is present: a small arrow/link icon appears.
  Clicking it calls `markRead` and then navigates via `router.push`.
- "읽음" button: marks the single notification as read without navigating.
  Hidden for already-read items.

### Row Interaction
- Entire row is clickable.
- On click: calls `markRead({ id })` then navigates to `actionUrl`.
- If no `actionUrl` exists, clicking only marks as read.
- Hover state: subtle background highlight.

---

## Pagination

Server-side pagination via `skip` / `take` on the tRPC query.

| Element         | Description                                         |
| --------------- | --------------------------------------------------- |
| Page size       | Fixed at 20 items per page                          |
| Prev button     | Disabled on page 1                                  |
| Next button     | Disabled on last page                               |
| Page indicator  | "페이지 {current} / {total}"                         |
| Total count     | "{totalCount}건" displayed next to the indicator     |

Page state is kept in a `useState` hook. Changing the page triggers a
new `notification.list` query with the updated `skip` value.

---

## States

### Loading
- Centered spinner with "알림을 불러오는 중..." text.
- Shown on initial load and when page/filter changes.
- Uses the shared `Spinner` component.

### Error
- Centered error icon with message "알림을 불러오지 못했습니다."
- "다시 시도" (Retry) button that calls `refetch()`.

### Empty — No Filters Active
- Illustration or icon (bell with checkmark).
- Text: "알림이 없습니다."
- Subtext: "새로운 알림이 생기면 여기에 표시됩니다."

### Empty — Filters Active
- Icon (filter with X).
- Text: "조건에 맞는 알림이 없습니다."
- "필터 초기화" button to clear all filters.

### Items
- Standard list rendering described above.

---

## Data Flow

```
page state (page, filters)
  → notification.list({ skip, take: 20, ...filters })
  → server: Prisma query with where clause
  → returns { items, totalCount }

markRead({ id })
  → server: updateMany isRead + readAt
  → client: invalidate notification.list + notification.unreadCount

markAllRead()
  → server: updateMany all user unread
  → client: invalidate notification.list + notification.unreadCount
```

Both the Bell badge in the top-bar and this page consume the same
`notification.unreadCount` query, so marking items read here
automatically updates the badge.

---

## Footer

Below the pagination controls, a small informational text block:

> "알림은 인텔리전스 분석 결과 및 시스템 이벤트에 의해 자동 생성됩니다."
> (Notifications are auto-generated by intelligence analysis results
> and system events.)

Rendered in `text-xs text-muted-foreground` to keep it unobtrusive.

---

## Responsive Behavior

- **Desktop (>=1024px)**: full layout with filter panel inline.
- **Tablet (768-1023px)**: filter panel stacks vertically.
- **Mobile (<768px)**: filter panel becomes a slide-down sheet,
  priority and source badges hidden to save space, message preview
  limited to 1 line.

---

## Accessibility

- Notification rows use `role="listitem"` within a `role="list"` container.
- Unread items have `aria-label` suffix indicating unread status.
- Filter controls are wrapped in a `fieldset` with a descriptive `legend`.
- Pagination buttons include `aria-label` with page numbers.
- Mark-all-read button includes `aria-disabled` when no unread items exist.

---

## Related Files

| File                                      | Role                            |
| ----------------------------------------- | ------------------------------- |
| `apps/web/src/app/(dashboard)/notifications/page.tsx` | Page component         |
| `apps/web/src/components/layout/top-bar.tsx`           | Bell dropdown + link   |
| `packages/db/prisma/schema.prisma`                     | Notification model     |
| `apps/web/src/server/routers/notification.ts`          | tRPC router            |
