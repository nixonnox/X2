# Notification End-to-End Verification

Date: 2026-03-15
Status: ALL 12 STEPS VERIFIED

---

## Purpose

Step-by-step verification of the notification lifecycle from alert
trigger through external delivery. Each step confirms that production
code (not mocks) handles the flow.

---

## Step 1 — Alert Trigger

**Verified**

`evaluateAndAlert` is the single entry point. It receives a metric
delta event and loads the caller's `UserAlertPreference` before
deciding whether to create a notification. Thresholds, enablement
flags, and cooldown values are all read from the preference row.

---

## Step 2 — Source of Truth

**Verified**

`notification.unreadCount` returns `{ count }` computed directly
from the `Notification` table (`where: { readAt: null, userId }`).
The count is never cached or derived from an in-memory counter.
Every surface that displays the count queries this single endpoint.

---

## Step 3 — Bell Badge + Dropdown

**Verified**

The Bell component in the global header:
- Subscribes to `trpc.notification.unreadCount` (polling interval)
- Renders a red badge when `count > 0`
- Opens a dropdown listing recent unread notifications
- Each item calls `markRead` on click and navigates via `actionUrl`

---

## Step 4 — Dashboard Count

**Verified**

The Dashboard "unread alerts" card calls the same
`trpc.notification.unreadCount` query. Display text:
"읽지 않은 알림 N건". The count is guaranteed identical to the
Bell badge because both surfaces share the React-Query cache key.

---

## Step 5 — History Page

**Verified**

`/notifications` page features:
- Five filter tabs: ALL, ALERT, INSIGHT, SYSTEM, UNREAD
- Cursor-based pagination via `notification.list`
- Per-row `markRead` mutation (click or swipe)
- Bulk "mark all as read" button
- Empty state per filter category

All filtering is server-side (Prisma `where` clause).

---

## Step 6 — External Delivery

**Verified**

After the notification row is persisted, `dispatchExternal` fires
for enabled channels:

| Channel | Implementation                              |
|---------|---------------------------------------------|
| EMAIL   | `fetch()` to Resend API with JSON body      |
| WEBHOOK | `fetch()` HTTP POST with HMAC-SHA256 header |

Both use the native `fetch()` function — no SDK wrapper, no mock.

---

## Step 7 — User Preferences

**Verified**

`evaluateAndAlert` loads `UserAlertPreference` and applies:
- `enabled` — gate: if false, no notification is created
- `threshold` — minimum delta to trigger an alert
- `cooldownMinutes` — minimum interval between same-source alerts
- `globalCooldownMinutes` — user-wide minimum interval

Preferences are persisted in the database and survive restarts.

---

## Step 8 — Settings UI

**Verified**

Settings page at `/settings/notifications`:
- Loads current preferences via `getPreferences` tRPC query
- Saves changes via `savePreferences` tRPC mutation
- UI fields map flat to DB columns (no nested transform)
- Toggle switches for channel enable/disable
- Numeric inputs for thresholds and cooldown values

---

## Step 9 — Navigation

**Verified**

Two navigation entries exist:
- `/notifications` — listed in the main sidebar
- `/settings/notifications` — listed in `NAV_ACCOUNT` settings group

Both routes are registered in the app router and render without
redirect or fallback.

---

## Step 10 — Mock Detection

**Verdict: CLEAN**

Searched for hardcoded notification data, fake counts, and stub
responses across the notification module. Results:

- No `mockNotifications` array
- No hardcoded `count` return value
- No `faker` or `seed` usage in notification code
- All data flows through Prisma queries to the database

---

## Step 11 — Deep-Link

**Verified**

Every alert notification includes `actionUrl` in the format
`/intelligence?keyword={kw}`. Navigation occurs from:

1. Bell dropdown — item click triggers `router.push(actionUrl)`
2. `/notifications` — row click triggers `router.push(actionUrl)`

The Intelligence page reads the `keyword` query parameter and
loads the relevant analysis context automatically.

---

## Step 12 — Consistency

**Verified**

All three notification surfaces consume the same data:

| Surface         | Query                              | Cache Key       |
|-----------------|------------------------------------|-----------------|
| Bell badge      | `trpc.notification.unreadCount`    | `unreadCount`   |
| Dashboard card  | `trpc.notification.unreadCount`    | `unreadCount`   |
| /notifications  | `trpc.notification.list`           | `notification`  |

`markRead` mutations invalidate both cache keys, ensuring all
surfaces update simultaneously after a read action.

---

## Summary

All 12 verification steps pass. The notification flow is fully
wired from trigger to delivery with no mock data in the path.
Remaining gaps (maxAlertsPerDay enforcement, retry logic, delivery
logging) are tracked in `NOTIFICATION_RUNTIME_GAP_REGISTER.md`.
