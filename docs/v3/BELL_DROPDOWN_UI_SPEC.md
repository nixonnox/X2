# Bell Dropdown UI Specification

## Overview

This document specifies the visual design, interaction behavior, and state
management of the notification Bell dropdown component rendered in the
application's top-bar. The dropdown surfaces the most recent notifications,
allows the user to mark items as read, and provides navigation to the
relevant detail pages.

---

## Dimensions and Positioning

| Property          | Value                                                  |
| ----------------- | ------------------------------------------------------ |
| Trigger           | Bell icon button in top-bar                            |
| Dropdown width    | 320px (`w-80`)                                         |
| Max height        | 360px (scrollable overflow)                            |
| Position          | Anchored below-right of the Bell icon                  |
| Border radius     | 8px (`rounded-lg`)                                     |
| Shadow            | `shadow-lg`                                            |
| Background        | White (light) / `zinc-900` (dark)                      |
| Z-index           | 50 (above page content, below modals)                  |

---

## Badge

The Bell icon displays a badge indicating the number of unread notifications.

| Condition         | Rendering                                              |
| ----------------- | ------------------------------------------------------ |
| count = 0         | Badge hidden entirely                                  |
| 1 <= count <= 9   | Badge shows the exact number                           |
| count > 9         | Badge shows "9+"                                       |

The badge is a small red circle (`bg-red-500 text-white`) positioned at the
top-right corner of the Bell icon with a slight negative offset so it
overlaps the icon edge. Font size is `text-xs` with `min-w-[18px]` to
ensure the circle does not collapse on single digits.

### Badge Data Source

The badge value comes from `notification.unreadCount` tRPC query with a
30-second polling interval. See `NOTIFICATION_COUNT_SOURCE_OF_TRUTH.md`
for the full rationale.

---

## Dropdown States

The dropdown body transitions through four mutually exclusive states:
loading, error, empty, and items.

### 1. Loading State

Displayed while `notification.list` is fetching for the first time after
the dropdown opens.

```
┌──────────────────────────────────┐
│  알림                            │
│──────────────────────────────────│
│                                  │
│         [Spinner]                │
│   알림을 불러오는 중입니다       │
│                                  │
└──────────────────────────────────┘
```

- Spinner: `Loader2` icon from lucide-react with `animate-spin` class.
- Text: "알림을 불러오는 중입니다" in `text-sm text-muted-foreground`.
- Centered vertically and horizontally within the dropdown body.

### 2. Error State

Displayed when `notification.list` returns an error.

```
┌──────────────────────────────────┐
│  알림                            │
│──────────────────────────────────│
│                                  │
│      [AlertTriangle icon]        │
│  알림 목록을 가져오지 못했습니다  │
│       [다시 시도] button         │
│                                  │
└──────────────────────────────────┘
```

- Icon: `AlertTriangle` from lucide-react in `text-yellow-500`.
- Message: "알림 목록을 가져오지 못했습니다" in `text-sm text-muted-foreground`.
- Retry button: Text button labeled "다시 시도" that calls `refetch()`.
- Centered vertically and horizontally.

### 3. Empty State

Displayed when the query succeeds but returns zero items.

```
┌──────────────────────────────────┐
│  알림                            │
│──────────────────────────────────│
│                                  │
│    새로운 알림이 없습니다        │
│                                  │
└──────────────────────────────────┘
```

- Text: "새로운 알림이 없습니다" in `text-sm text-muted-foreground`.
- Centered vertically and horizontally.
- No icon is shown in the empty state.

### 4. Items State

Displayed when the query succeeds and returns one or more notification items.
Items are rendered in a scrollable list with `max-h-[360px] overflow-y-auto`.

---

## Header

The dropdown header is always visible regardless of state.

```
┌──────────────────────────────────┐
│  알림                 모두 읽음  │
│──────────────────────────────────│
```

- Title: "알림" in `font-semibold text-sm`.
- "모두 읽음" button: Text button in `text-xs text-primary`. Calls the
  `markAllRead` mutation. Only rendered when `unreadCount > 0`. Hidden
  when all notifications are already read.
- Separator: 1px border-bottom (`border-b`).

---

## Notification Item Structure

Each notification item is rendered as a clickable row. The entire row area
is the click target.

```
┌──────────────────────────────────┐
│ [Icon] Title           [Badge]   │
│        Message text...     3분 전│
│        [Source badge]            │
└──────────────────────────────────┘
```

### Layout Detail

| Element            | Description                                           |
| ------------------ | ----------------------------------------------------- |
| Severity icon      | Left-aligned, 16px. See Severity Icon table below.    |
| Unread dot         | Blue dot (`bg-blue-500`) 8px, left of icon if unread. |
| Title              | `text-sm font-medium`, single line, truncated.        |
| Severity badge     | Right-aligned pill next to title. See below.          |
| Message            | `text-xs text-muted-foreground`, max 2 lines.        |
| Relative time      | `text-xs text-muted-foreground`, right-aligned.       |
| Source badge       | Small pill below message. See below.                  |

### Severity Icon

| Severity        | Icon           | Color                                   |
| --------------- | -------------- | --------------------------------------- |
| `HIGH`          | AlertTriangle  | `text-orange-500`                       |
| `URGENT`        | AlertTriangle  | `text-red-500`                          |
| `NORMAL`        | Bell           | `text-muted-foreground`                 |
| (fallback)      | Bell           | `text-muted-foreground`                 |

### Severity Badge

| Severity        | Label    | Style                                     |
| --------------- | -------- | ----------------------------------------- |
| `HIGH`          | 중요     | `bg-orange-100 text-orange-700`           |
| `URGENT`        | 긴급     | `bg-red-100 text-red-700`                 |
| `NORMAL`        | (hidden) | Badge not rendered for NORMAL severity.   |

Badge styling: `text-[10px] px-1.5 py-0.5 rounded-full font-medium`.

### Title Cleaning

The title string is cleaned before display by removing the prefix
"Intelligence Alert: " if present. This prefix is an internal convention
from the alert generation pipeline and is not meaningful to end users.

```typescript
function cleanTitle(raw: string): string {
  return raw.replace(/^Intelligence Alert:\s*/i, "");
}
```

### Unread Dot

A small blue dot is rendered to the left of the severity icon when the
notification's `isRead` field is `false`. Once the notification is marked
as read (either individually or via "모두 읽음"), the dot is removed.

| State   | Dot                                                        |
| ------- | ---------------------------------------------------------- |
| Unread  | `w-2 h-2 rounded-full bg-blue-500`                        |
| Read    | No dot, space preserved for alignment                      |

### Relative Time Display

The `formatNotificationTime` helper converts a notification's `createdAt`
timestamp into a Korean-language relative time string.

| Condition                      | Output                              |
| ------------------------------ | ----------------------------------- |
| Less than 1 minute ago         | "방금 전"                           |
| Less than 60 minutes ago       | "N분 전" (e.g., "3분 전")          |
| Less than 24 hours ago         | "N시간 전" (e.g., "2시간 전")      |
| Less than 7 days ago           | "N일 전" (e.g., "5일 전")          |
| 7 days or more                 | "M월 D일" (e.g., "3월 10일")       |

### Source Badge

When the notification's `sourceType` is `"intelligence_alert"`, a source
badge is rendered below the message text.

| sourceType              | Label          | Style                        |
| ----------------------- | -------------- | ---------------------------- |
| `intelligence_alert`    | Intelligence   | `bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full` |
| (other / undefined)     | (hidden)       | No badge rendered.           |

---

## Click Behavior

The entire notification row is wrapped in a clickable container. Clicking
any part of the row triggers two actions in sequence:

1. **markRead** -- The `notification.markRead({ id })` mutation is called
   to set `isRead = true` on the server. On success, both
   `notification.unreadCount` and `notification.list` queries are
   invalidated.
2. **Navigate** -- `router.push(actionUrl)` is called to navigate the user
   to the relevant detail page. The `actionUrl` is stored on the
   Notification row and is typically an intelligence detail route such as
   `/intelligence/alert/:id`.

If the notification is already read (`isRead = true`), step 1 is skipped
and only navigation occurs.

The dropdown closes automatically after navigation begins.

---

## Hover and Focus States

| Element             | Hover                                              |
| ------------------- | -------------------------------------------------- |
| Notification row    | `bg-muted/50` background                          |
| "모두 읽음" button  | Underline                                          |
| "다시 시도" button  | Underline                                          |
| Bell icon trigger   | `bg-muted` circular background                    |

Keyboard accessibility: Each notification row is a focusable element.
Enter key triggers the same click behavior. Tab order follows the visual
list order top-to-bottom.

---

## Scroll Behavior

When the list exceeds 360px in height, a vertical scrollbar appears. The
scrollbar uses the browser's native rendering (no custom scrollbar styles).
The header remains fixed at the top of the dropdown and does not scroll
with the list.

---

## Dark Mode

All colors reference Tailwind semantic tokens (`text-muted-foreground`,
`bg-muted`, `border`, etc.) which automatically adapt to the active theme.
The explicit color values listed in this document (e.g., `bg-red-500`)
are used for severity-specific elements that do not change between themes.

---

## Responsive Notes

The dropdown width is fixed at 320px regardless of viewport size. On
mobile viewports (< 640px), the dropdown may need to be repositioned to
avoid overflow. The current implementation does not include mobile-specific
adjustments; this is a known limitation.

---

## Related Documents

- `NOTIFICATION_COUNT_SOURCE_OF_TRUTH.md` -- Count data flow
- `BELL_DROPDOWN_RUNTIME_NOTES.md` -- tRPC queries and mutation details
- `NOTIFICATION_BELL_IMPLEMENTATION_NOTES.md` -- Component implementation
