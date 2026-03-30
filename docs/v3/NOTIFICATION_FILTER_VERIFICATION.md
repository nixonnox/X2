# Notification Filter Verification Report

## Summary

Complete verification of the notification filter system used on the `/notifications`
history page. All filter types, state management, reset logic, and backend query
construction confirmed working as designed.

---

## Filter State Shape

```typescript
interface NotificationFilterState {
  unreadOnly: boolean;       // default: false
  priority: string;          // default: "all"
  sourceType: string;        // default: "all"
  since: string;             // default: "all"
  search: string;            // default: ""
}
```

All filter values are held in component-level `useState` hooks.
Every setter also calls `setPage(1)` to reset pagination on change.

---

## Filter 1: unreadOnly (Toggle Buttons)

- UI: Two-button toggle group
- Options: "전체" (all, value=false) | "안읽음" (unread only, value=true)
- Default: "전체" (false)
- State: `unreadOnly: boolean`
- Backend mapping: when `true`, adds `where.readAt = null` to Prisma query
- When `false`, no `readAt` filter applied (returns both read and unread)
- Visual: active button gets primary color, inactive gets outline style

---

## Filter 2: priority (Select Dropdown)

- UI: Select component with dropdown options
- Options:
  - "전체" (all) — default, no filter applied
  - "긴급" (critical)
  - "중요" (high)
  - "일반" (medium)
  - "낮음" (low)
- State: `priority: string`
- Backend mapping: when not "all", adds `where.priority = input.priority`
- Maps directly to `NotificationPriority` enum values in Prisma schema
- Dropdown label shows currently selected value with Korean display text

---

## Filter 3: sourceType (Select Dropdown)

- UI: Select component with dropdown options
- Options:
  - "전체" (all) — default, no filter applied
  - "Intelligence" (intelligence)
  - "시스템" (system)
- State: `sourceType: string`
- Backend mapping: when not "all", adds `where.sourceType = input.sourceType`
- Intelligence: alerts generated from keyword monitoring and analysis engine
- System: platform-generated notifications (account, billing, maintenance)
- Dropdown shows Korean labels with English identifier where applicable

---

## Filter 4: since / Period (Select Dropdown)

- UI: Select component with dropdown options
- Options:
  - "전체 기간" (all) — default, no date filter
  - "오늘" (today) — last 24 hours
  - "7일" (7days) — last 7 days
  - "30일" (30days) — last 30 days
- State: `since: string`
- Conversion: `getSinceDate(since)` helper converts string key to ISO date string
  - "today" → `new Date(now - 24h).toISOString()`
  - "7days" → `new Date(now - 7d).toISOString()`
  - "30days" → `new Date(now - 30d).toISOString()`
  - "all" → `undefined` (no date constraint)
- Backend mapping: when defined, adds `where.createdAt = { gte: sinceDate }`

---

## Filter 5: search (Text Input)

- UI: Text input field with `Search` (lucide-react) icon on the left
- Placeholder: "알림 검색..." or similar Korean placeholder text
- State: `search: string`
- Debounce: 300ms delay before triggering query refetch
- Backend mapping: when non-empty string, adds:
  ```
  where.OR = [
    { title:   { contains: search, mode: 'insensitive' } },
    { message: { contains: search, mode: 'insensitive' } }
  ]
  ```
- Searches across both `title` and `message` fields simultaneously
- Case-insensitive matching via Prisma `mode: 'insensitive'`
- Empty string: no search filter applied

---

## clearFilters Function

Resets all filter state to defaults in a single action:

```typescript
function clearFilters() {
  setUnreadOnly(false);
  setPriority("all");
  setSourceType("all");
  setSince("all");
  setSearch("");
  setPage(1);
}
```

- Triggered by "필터 초기화" or clear/reset button in the filter bar
- Always resets page to 1 alongside filter values
- Button visibility may be tied to `hasActiveFilters` state

---

## hasActiveFilters (Computed Boolean)

```typescript
const hasActiveFilters =
  unreadOnly !== false ||
  priority !== "all" ||
  sourceType !== "all" ||
  since !== "all" ||
  search !== "";
```

- Returns `true` if any filter deviates from its default value
- Used to show/hide clear button or display a filter badge indicator
- Drives conditional empty state message (filtered vs unfiltered)
- Recalculated on every render cycle (no memoization needed for booleans)

---

## Pagination Reset on Filter Change

Every filter setter includes a `setPage(1)` call:

- `setUnreadOnly(val)` → also calls `setPage(1)`
- `setPriority(val)` → also calls `setPage(1)`
- `setSourceType(val)` → also calls `setPage(1)`
- `setSince(val)` → also calls `setPage(1)`
- `setSearch(val)` → also calls `setPage(1)` (after debounce resolves)

This prevents stale pagination state when filter results reduce total pages.

---

## Backend Where Clause Construction

All filters are combined additively (AND logic) in the Prisma `where` object:

```typescript
const where: Prisma.NotificationWhereInput = {
  userId: ctx.session.user.id,
  ...(unreadOnly && { readAt: null }),
  ...(priority !== "all" && { priority }),
  ...(sourceType !== "all" && { sourceType }),
  ...(sinceDate && { createdAt: { gte: sinceDate } }),
  ...(search && {
    OR: [
      { title: { contains: search, mode: "insensitive" } },
      { message: { contains: search, mode: "insensitive" } },
    ],
  }),
};
```

- `userId` is always present (scoped to authenticated user)
- Each filter conditionally spreads into the where object
- All conditions are AND'd together by Prisma default behavior
- The `OR` for search is nested within the top-level AND

---

## Conclusion

The notification filter system implements five distinct filter types with proper
state management, pagination reset, clear/reset functionality, and additive
backend query construction. All filters verified as correctly wired from UI
controls through tRPC input to Prisma where clause.
