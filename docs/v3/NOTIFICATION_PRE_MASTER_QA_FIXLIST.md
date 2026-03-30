# Notification Pre-Master QA Fix List

Date: 2026-03-15
Total Items: 8
P1 (must-fix): 2 | P2 (should-fix): 2 | P3 (can-wait): 4

---

## Purpose

Prioritized action list for resolving all known notification gaps
before the master QA pass. Items are ordered by priority and include
location, description, fix approach, and estimated effort.

---

## Priority Definitions

| Level | Meaning                        | Timeline        |
|-------|--------------------------------|-----------------|
| P1    | Must fix before QA sign-off    | < 30 min each   |
| P2    | Should fix before beta launch  | < 1 hour each   |
| P3    | Can wait for beta / v2         | Backlog         |

---

## P1 — Must Fix (< 30 min each)

### Fix 1: maxAlertsPerDay Enforcement

**Gap ref:** S1-1 in `NOTIFICATION_RUNTIME_GAP_REGISTER.md`

**Location:**
`evaluateAndAlert` function in the alert evaluation pipeline

**Current behavior:**
`maxAlertsPerDay` is stored in `UserAlertPreference` and editable
in the Settings UI. However, the evaluation path never checks how
many alerts have already been created today. Users receive unlimited
daily alerts regardless of their configured cap.

**Fix approach:**
1. Before calling `createAlertNotification`, query the count of
   notifications created today for the current user:
   ```
   const todayCount = await prisma.notification.count({
     where: {
       userId,
       type: 'ALERT',
       createdAt: { gte: startOfDay(new Date()) }
     }
   })
   ```
2. Compare `todayCount` against `preference.maxAlertsPerDay`.
3. If `todayCount >= maxAlertsPerDay`, skip alert creation and
   log the suppression reason.
4. Add a unit test covering the boundary condition (count === max).

**Files to modify:**
- Alert evaluation service (evaluateAndAlert function)
- Corresponding test file

**Estimated effort:** 20 minutes

---

### Fix 2: Channel Preferences at Dispatch Time

**Gap ref:** S2-2 in `NOTIFICATION_RUNTIME_GAP_REGISTER.md`

**Location:**
`dispatchExternal` function in the delivery pipeline

**Current behavior:**
Dispatch checks environment variables (`RESEND_API_KEY`,
`WEBHOOK_URL`) to decide whether to send. It does not consult the
user's `channelEmail` or `channelWebhook` preference flags. A user
who disables email in Settings still receives emails.

**Fix approach:**
1. Accept `userId` as a parameter to `dispatchExternal`.
2. Load `UserAlertPreference` for the user at the start of dispatch.
3. Before the email `fetch()`, check `preference.channelEmail`.
   Skip if false.
4. Before the webhook `fetch()`, check `preference.channelWebhook`.
   Skip if false.
5. Log which channels were skipped due to user preference.
6. Add tests: user with email disabled should not trigger email
   fetch; user with webhook disabled should not trigger webhook.

**Files to modify:**
- External delivery service (dispatchExternal function)
- Corresponding test file

**Estimated effort:** 15 minutes

---

## P2 — Should Fix (< 1 hour each)

### Fix 3: Retry Queue for External Delivery

**Gap ref:** S1-2 in `NOTIFICATION_RUNTIME_GAP_REGISTER.md`

**Location:**
`dispatchExternal` function in the delivery pipeline

**Current behavior:**
A single `fetch()` call is made for each channel. If it fails
(network error, 5xx, timeout), the failure is caught and logged
but the delivery is permanently lost. No retry is attempted.

**Fix approach:**
1. Create a `retryWithBackoff` utility:
   ```
   async function retryWithBackoff(
     fn: () => Promise<Response>,
     maxAttempts = 3,
     baseDelay = 1000
   )
   ```
2. Implement exponential backoff: 1s, 4s, 16s between attempts.
3. On each attempt, log the attempt number and outcome.
4. After all attempts exhausted, log a final failure with full
   context (channel, notificationId, last error).
5. Wrap both email and webhook `fetch()` calls with this utility.
6. Add tests:
   - Succeeds on first attempt: no retry triggered
   - Fails then succeeds: retry works correctly
   - All attempts fail: final error logged

**Files to modify:**
- External delivery service
- New utility: `retryWithBackoff` (can be co-located)
- Corresponding test file

**Estimated effort:** 45 minutes

---

### Fix 4: Persistent Delivery Log

**Gap ref:** S2-1 in `NOTIFICATION_RUNTIME_GAP_REGISTER.md`

**Location:**
Database schema + external delivery service

**Current behavior:**
Delivery outcomes are written to `console.log` only. No database
record exists. Operations cannot audit delivery success or failure
for a specific notification.

**Fix approach:**
1. Add `DeliveryLog` model to Prisma schema:
   ```
   model DeliveryLog {
     id             String   @id @default(cuid())
     notificationId String
     channel        String   // EMAIL | WEBHOOK
     status         String   // SUCCESS | FAILURE
     httpStatus     Int?
     responseBody   String?
     attemptNumber  Int      @default(1)
     attemptedAt    DateTime @default(now())
     notification   Notification @relation(...)
   }
   ```
2. Run `prisma migrate dev` to create the table.
3. After each delivery attempt (including retries), write a
   `DeliveryLog` row with the outcome.
4. Add a `deliveryLogs` relation to the `Notification` model for
   easy querying from the admin side.
5. Add a test verifying that a log row is created on success and
   on failure.

**Files to modify:**
- Prisma schema
- External delivery service
- Migration file (auto-generated)
- Corresponding test file

**Estimated effort:** 40 minutes

---

## P3 — Can Wait for Beta

### Fix 5: .env.example Documentation

**Gap ref:** S2-3 in `NOTIFICATION_RUNTIME_GAP_REGISTER.md`

**Description:**
Add notification-related environment variables to `.env.example`
so new developers can discover and configure them without reading
source code.

**Variables to add:**
```
# Notification / External Delivery
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=alerts@yourdomain.com
WEBHOOK_URL=https://your-endpoint.com/webhook
WEBHOOK_SECRET=your-hmac-secret
```

**Estimated effort:** 5 minutes

---

### Fix 6: Per-Project Preferences

**Gap ref:** S3-1 in `NOTIFICATION_RUNTIME_GAP_REGISTER.md`

**Description:**
Add `projectId` column to `UserAlertPreference` so users with
multiple projects can configure independent thresholds, cooldowns,
and channel preferences per project.

**Scope:**
- Schema migration (add nullable `projectId` FK)
- Update `getPreferences` / `savePreferences` to accept `projectId`
- Update Settings UI to show project selector
- Update `evaluateAndAlert` to load project-scoped preference

**Estimated effort:** 2 hours

---

### Fix 7: Webhook URL Test on Save

**Gap ref:** S3-2 in `NOTIFICATION_RUNTIME_GAP_REGISTER.md`

**Description:**
Validate the webhook URL when the user saves preferences:
1. Check URL format (must be valid HTTPS URL)
2. Optionally send a test ping with a `X-Test: true` header
3. Show success/failure feedback in the Settings UI

**Estimated effort:** 30 minutes

---

### Fix 8: Notification Deletion

**Gap ref:** S3-3 in `NOTIFICATION_RUNTIME_GAP_REGISTER.md`

**Description:**
Allow users to delete individual notifications and bulk-delete
from the `/notifications` page. Optionally add a retention policy
cron that auto-deletes notifications older than N days.

**Scope:**
- Add `notification.delete` and `notification.bulkDelete` mutations
- Add delete button / swipe action to notification list items
- Add "Delete all read" bulk action
- Optional: cron job for retention policy (configurable days)

**Estimated effort:** 1 hour

---

## Execution Plan

### Sprint 1 (Pre-QA)

| Order | Fix | Priority | Time   | Dependency |
|-------|-----|----------|--------|------------|
| 1     | #2  | P1       | 15 min | None       |
| 2     | #1  | P1       | 20 min | None       |

Total: ~35 minutes. Both P1 items are independent and can be
implemented in parallel by two developers.

### Sprint 2 (Pre-Beta)

| Order | Fix | Priority | Time   | Dependency |
|-------|-----|----------|--------|------------|
| 3     | #3  | P2       | 45 min | None       |
| 4     | #4  | P2       | 40 min | Fix #3     |
| 5     | #5  | P3       | 5 min  | None       |

Total: ~1.5 hours. Fix #4 depends on Fix #3 because the delivery
log should capture retry attempt data.

### Backlog (Beta / v2)

| Fix | Priority | Time   |
|-----|----------|--------|
| #6  | P3       | 2 hr   |
| #7  | P3       | 30 min |
| #8  | P3       | 1 hr   |

---

## Verification Checklist

After implementing each fix, verify:

- [ ] Fix #1: Set maxAlertsPerDay=2, trigger 3 alerts, confirm 3rd is suppressed
- [ ] Fix #2: Disable email channel, trigger alert, confirm no email sent
- [ ] Fix #3: Kill network, trigger alert, confirm 3 retry attempts logged
- [ ] Fix #4: Trigger alert, check DeliveryLog table has a row
- [ ] Fix #5: Clone repo fresh, confirm .env.example has all notification vars
- [ ] Fix #6: Create two projects, set different thresholds, verify independent
- [ ] Fix #7: Save invalid webhook URL, confirm validation error shown
- [ ] Fix #8: Delete a notification, confirm it disappears from list and DB
