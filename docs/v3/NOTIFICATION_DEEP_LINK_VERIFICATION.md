# Notification Deep-Link Verification Report

## Summary

Verification of the notification deep-link system that allows users to navigate
directly from a notification item to its related content page. Covers both the
full history page and the Bell dropdown contexts.

---

## actionUrl Field in Data Model

- Field: `actionUrl` on the `Notification` Prisma model
- Type: `String?` (optional, nullable)
- Set during alert creation by the intelligence or system notification service
- Persisted in database alongside notification title, message, priority, etc.
- Not all notifications have an actionUrl (system notifications may omit it)

---

## actionUrl Format

Primary format for intelligence alerts:

```
/intelligence?keyword={keyword}
```

- Routes to the intelligence analysis page with the keyword pre-selected
- Query parameter preserves the search context for the user
- Additional query params may be appended for project or context scoping
- Format is a relative URL path (no absolute domain prefix)
- URL is constructed at notification creation time, not at render time

---

## Display in Notification History Page

When a notification item has a truthy `actionUrl`:

- Icon: `ExternalLink` from lucide-react displayed inline
- Text: "상세 보기" label next to or below the notification content
- Visual cue indicates the item is navigable to a detail view
- When `actionUrl` is falsy: no icon or link text rendered
- Item card still shows title, message, priority badge, and timestamp regardless

---

## Click Handler: handleItemClick

The click handler on each notification item performs two actions in sequence:

```typescript
async function handleItemClick(notification: Notification) {
  // Step 1: Mark as read
  await markRead({ id: notification.id });

  // Step 2: Navigate if actionUrl exists
  if (notification.actionUrl) {
    router.push(notification.actionUrl);
  }
}
```

- `markRead` mutation fires first to update read state
- `markRead.onSuccess` invalidates both `notification.list` and `notification.unreadCount`
- Navigation only occurs if `actionUrl` is present and truthy
- Uses Next.js `router.push` for client-side navigation (no full page reload)
- If `actionUrl` is absent, click still marks the item as read (no navigation)

---

## Bell Dropdown Click Behavior

The Bell dropdown notification items follow the same pattern:

1. User clicks a notification item in the dropdown list
2. `markRead({ id })` mutation is called
3. If `actionUrl` exists, `router.push(actionUrl)` navigates to the target
4. Dropdown panel closes after navigation (via state setter or click-outside)
5. Bell badge count updates via `unreadCount` query invalidation

Identical logic to the history page, ensuring consistent behavior across surfaces.

---

## Project and Context Preservation

- Project context is preserved via URL query parameters in the `actionUrl`
- Example: `/intelligence?keyword=브랜드&projectId=abc123`
- The target page reads query params to restore the correct view state
- No separate context-passing mechanism needed (URL is self-contained)
- Locale prefix is handled by Next.js middleware (not embedded in actionUrl)
- The `actionUrl` is locale-agnostic; `[locale]` segment is prepended by the router

---

## No actionUrl: Graceful Fallback

When a notification has no `actionUrl` (null or undefined):

- Item is still rendered in the list with full content (title, message, etc.)
- Item is still clickable — click triggers `markRead` to update read state
- No navigation occurs after marking as read
- No `ExternalLink` icon or "상세 보기" text displayed
- No error thrown or console warning emitted
- User experience: click marks item read, visual state updates, nothing else happens

---

## Notification Creation: actionUrl Assignment

During alert creation in the backend notification service:

```typescript
await prisma.notification.create({
  data: {
    userId: targetUserId,
    title: alertTitle,
    message: alertMessage,
    priority: alertPriority,
    sourceType: "intelligence",
    actionUrl: `/intelligence?keyword=${encodeURIComponent(keyword)}`,
  },
});
```

- `actionUrl` is set at creation time with the relevant navigation target
- Intelligence alerts always include an actionUrl pointing to the keyword view
- System notifications may or may not include an actionUrl depending on type
- The URL is stored as-is; no transformation applied at read time

---

## Edge Cases and Robustness

- **Deleted target**: If the intelligence keyword is later deleted, the URL still
  navigates but the target page shows its own empty/not-found state
- **Changed routes**: If route structure changes, old actionUrls may become stale;
  no automatic migration of stored URLs exists
- **Special characters**: Keywords are `encodeURIComponent`-encoded in the URL
- **Long URLs**: No truncation applied; full URL stored and used as-is
- **XSS prevention**: `router.push` with a relative path is safe; no raw HTML injection

---

## Verification Matrix

| Scenario                        | History Page | Bell Dropdown |
|---------------------------------|:------------:|:-------------:|
| actionUrl present → navigate    | PASS         | PASS          |
| actionUrl absent → no navigate  | PASS         | PASS          |
| markRead fires on click         | PASS         | PASS          |
| unreadCount refreshes           | PASS         | PASS          |
| ExternalLink icon shown         | PASS         | N/A (compact) |
| "상세 보기" text shown            | PASS         | N/A (compact) |
| Dropdown closes after navigate  | N/A          | PASS          |

---

## Conclusion

The deep-link system correctly stores `actionUrl` at notification creation time,
displays navigation affordances when present, handles click with markRead + navigate
sequence, and gracefully degrades when no URL is available. Both the history page
and Bell dropdown share identical click logic for consistent user experience.
