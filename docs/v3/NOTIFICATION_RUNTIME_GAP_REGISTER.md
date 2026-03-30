# Notification Runtime Gap Register

Date: 2026-03-15
S0 Issues: NONE

---

## Purpose

Comprehensive register of known gaps in the notification subsystem,
classified by severity. This document is the single tracking point
referenced by the product readiness and QA fix-list reports.

---

## Severity Definitions

| Level | Meaning                                    | SLA          |
|-------|--------------------------------------------|--------------|
| S0    | Data loss or security — blocks release     | Immediate    |
| S1    | Functional gap — fix before GA             | < 1 sprint   |
| S2    | Operational gap — fix before beta          | < 2 sprints  |
| S3    | Enhancement — can wait for v2              | Backlog      |

---

## S0 — Critical (Blocks Release)

**None identified.**

The notification system has no data-loss vectors, no auth bypass,
and no path that could corrupt user data. All mutations are
transactional via Prisma.

---

## S1 — Functional Gaps (Fix Before GA)

### S1-1: maxAlertsPerDay Not Enforced at Runtime

**Location:** `evaluateAndAlert` in the alert evaluation pipeline

**Description:**
The `UserAlertPreference` model stores `maxAlertsPerDay` and the
Settings UI allows users to configure it. However, the runtime
evaluation path does not perform a daily count check before creating
a new alert notification. A user could receive unlimited alerts per
day regardless of their configured maximum.

**Impact:** Users who set a daily cap will not see it honored.
Alert fatigue risk for high-frequency keywords.

**Fix:** Add a `count()` query for today's alerts (filtered by
`userId` + `createdAt >= startOfDay`) before `createAlertNotification`.
Skip creation if count >= `maxAlertsPerDay`.

**Estimated effort:** 20 minutes

---

### S1-2: No Retry for External Delivery

**Location:** `dispatchExternal` function

**Description:**
Email (Resend API) and webhook (HTTP POST) deliveries use a single
`fetch()` call. If the request fails (network error, 5xx response,
timeout), the failure is caught and logged but never retried. The
notification row in the database is still marked as created, but
the external channel delivery is permanently lost.

**Impact:** Transient network issues cause silent loss of email
and webhook notifications. Users have no visibility into failures.

**Fix:** Implement a retry queue with exponential backoff
(3 attempts, 1s / 4s / 16s delays). Log each attempt outcome.

**Estimated effort:** 45 minutes

---

## S2 — Operational Gaps (Fix Before Beta)

### S2-1: No Persistent Delivery Log

**Location:** External delivery pipeline

**Description:**
Delivery outcomes (success, failure, HTTP status, response body)
are logged to the application console but not persisted to the
database. There is no `DeliveryLog` table or equivalent. Operations
cannot audit whether a specific notification was successfully
delivered to email or webhook.

**Impact:** No audit trail for external deliveries. Debugging
delivery failures requires log file access.

**Fix:** Create a `DeliveryLog` table with columns: `notificationId`,
`channel`, `status`, `httpStatus`, `responseBody`, `attemptedAt`.
Write a row after each delivery attempt.

**Estimated effort:** 40 minutes

---

### S2-2: Channel Preferences Not Verified at Dispatch Time

**Location:** `dispatchExternal` function

**Description:**
The dispatch function checks environment variables (`RESEND_API_KEY`,
`WEBHOOK_URL`) to decide whether to send. It does not check the
user's `channelEmail` or `channelWebhook` preference flags. A user
who has disabled email notifications in Settings will still receive
emails if the env var is configured.

**Impact:** Users cannot selectively disable channels. Privacy
expectation violation.

**Fix:** Load `UserAlertPreference` in `dispatchExternal` and check
`channelEmail` / `channelWebhook` before each `fetch()` call.

**Estimated effort:** 15 minutes

---

### S2-3: .env.example Missing NOTIFICATION_* Variables

**Location:** `.env.example` at repository root

**Description:**
The `.env.example` file does not include entries for notification-
related environment variables: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
`WEBHOOK_URL`, `WEBHOOK_SECRET`. New developers must discover these
by reading source code.

**Impact:** Onboarding friction. External delivery silently skipped
in development environments without clear guidance.

**Fix:** Add a `# Notification / External Delivery` section to
`.env.example` with placeholder values and comments.

**Estimated effort:** 5 minutes

---

## S3 — Enhancements (Can Wait for v2)

### S3-1: No Per-Project Preferences

**Description:**
`UserAlertPreference` is scoped to the user only. There is no
`projectId` column. Users with multiple projects cannot configure
different thresholds, cooldowns, or channel preferences per project.
All projects share a single preference set.

**Impact:** Power users with multiple projects cannot fine-tune
alert behavior. Low severity because most users manage one project.

**Estimated effort:** 2 hours (schema change + UI + migration)

---

### S3-2: Webhook URL Not Verified on Save

**Description:**
The Settings UI accepts any string as the webhook URL. There is no
validation (URL format check, reachability probe, or test ping) when
the user saves the preference. Invalid URLs cause silent delivery
failures at runtime.

**Impact:** Users may configure invalid webhooks and not discover
the issue until they miss an important alert.

**Estimated effort:** 30 minutes (URL validation + optional test ping)

---

### S3-3: No Notification Deletion

**Description:**
Users can mark notifications as read but cannot delete them. The
`/notifications` history grows indefinitely. There is no bulk delete,
no auto-archive, and no retention policy.

**Impact:** Long-term users accumulate thousands of notification
rows. UI performance may degrade; storage grows unbounded.

**Estimated effort:** 1 hour (mutation + UI + optional retention cron)

---

### S3-4: No Preference Change Audit Log

**Description:**
Changes to `UserAlertPreference` are applied immediately via the
`savePreferences` mutation but not logged. There is no history of
what changed, when, or by whom. In a team context, one member could
alter shared notification settings without traceability.

**Impact:** No accountability for preference changes. Low severity
in single-user scenarios.

**Estimated effort:** 30 minutes (audit log table + write-on-save)

---

## Summary

| Severity | Count | Blocking? |
|----------|-------|-----------|
| S0       | 0     | —         |
| S1       | 2     | GA        |
| S2       | 3     | Beta      |
| S3       | 4     | No        |

Total: 9 gaps. No S0 blockers. The system is shippable for internal
QA with the S1 and S2 items tracked for resolution before GA/beta
milestones respectively.
