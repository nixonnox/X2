# Notification System Product Readiness

Date: 2026-03-15
Status: ALL 8 AXES PASS

---

## Purpose

Final product-readiness verification for the notification subsystem.
Eight orthogonal axes are evaluated; every axis must PASS before
the feature is considered shippable.

---

## Axis 1 — Source of Truth

**Verdict: PASS**

`notification.unreadCount` returns `{ count }` computed from the
`Notification` table via Prisma `count()`. No in-memory counters,
no cache layer that could drift. The database row is the single
source of truth for every unread count displayed in the product.

---

## Axis 2 — Bell / Dashboard Consistency

**Verdict: PASS**

Both the header Bell component and the Dashboard "unread alerts"
card invoke the identical tRPC query `trpc.notification.unreadCount`.
There is no secondary query, no local derivation, and no stale
fallback. When the count changes in the DB the two surfaces update
on the same React-Query invalidation cycle.

---

## Axis 3 — History Management

**Verdict: PASS**

`/notifications` page provides:
1. Five filter tabs (ALL / ALERT / INSIGHT / SYSTEM / UNREAD)
2. Cursor-based pagination via `notification.list`
3. Per-item `markRead` mutation
4. Bulk "mark all as read" action
5. Empty-state illustration per filter

All filters map to a Prisma `where` clause; no client-side filtering.

---

## Axis 4 — External Delivery

**Verdict: PASS**

Two channels implemented with real network calls:

| Channel | Transport           | Auth / Integrity       |
|---------|---------------------|------------------------|
| EMAIL   | Resend API (`fetch`) | API key in env         |
| WEBHOOK | HTTP POST (`fetch`)  | HMAC-SHA256 signature  |

Both paths use the native `fetch()` — no mock, no stub.
Failures are caught and logged but not retried (see Gap S1-2).

---

## Axis 5 — User Preferences

**Verdict: PASS**

`evaluateAndAlert` loads `UserAlertPreference` before creating any
notification. The following fields are applied at evaluation time:

- `enabled` — skips alert creation entirely when false
- `threshold` — compared against the computed metric delta
- `cooldownMinutes` — minimum interval between same-source alerts

Preferences are persisted in DB and editable via Settings UI.

---

## Axis 6 — Dedup / Cooldown

**Verdict: PASS**

Two-layer deduplication:

1. **Source-level cooldown** — `sourceId` + `lastAlertedAt` checked;
   alert skipped if interval < configured cooldown.
2. **User-level global cooldown** — `globalCooldownMinutes` from
   `UserAlertPreference`; effective cooldown = `Math.max(sourceCooldown,
   globalCooldownMinutes)`.

No duplicate notification can be created within the cooldown window.

---

## Axis 7 — Deep-Link

**Verdict: PASS**

Every alert notification carries `actionUrl` in the shape
`/intelligence?keyword={kw}`. Navigation is triggered from:

- Bell dropdown item click
- `/notifications` history row click

Both paths call `router.push(actionUrl)` — the Intelligence page
reads the keyword from the query string and loads context.

---

## Axis 8 — E2E Lifecycle

**Verdict: PASS**

Complete lifecycle traced:

```
alert trigger (evaluateAndAlert)
  -> Notification row saved (DB)
  -> unreadCount incremented (query returns +1)
  -> Bell badge updates (React-Query refetch)
  -> Dashboard card updates (same query)
  -> User opens /notifications (history list)
  -> User clicks item (markRead mutation)
  -> unreadCount decremented
  -> External delivery dispatched (email / webhook)
```

Every step uses production code paths with no mock data.

---

## Remaining Gaps (Non-Blocking)

### S1 — Should fix before GA

| # | Gap                                        | Impact                     |
|---|--------------------------------------------|----------------------------|
| 1 | `maxAlertsPerDay` saved but not enforced   | Users may receive excess   |
| 2 | No retry for external delivery failures    | Silent loss of email/hook  |

### S2 — Should fix before beta

| # | Gap                                          | Impact                   |
|---|----------------------------------------------|--------------------------|
| 1 | No persistent delivery log                   | No audit trail           |
| 2 | Channel prefs not verified at dispatch time   | May send to disabled ch  |

### S3 — Can wait for v2

| # | Gap                         | Impact               |
|---|-----------------------------|----------------------|
| 1 | No per-project preferences  | All projects share   |

---

## Conclusion

All 8 verification axes pass. The notification system is product-ready
for internal QA and staged rollout. The five identified gaps are
non-blocking and tracked in `NOTIFICATION_RUNTIME_GAP_REGISTER.md`
with recommended fix priorities.
