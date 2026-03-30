# ALERT_COOLDOWN_RUNTIME_VERIFICATION.md

> Generated: 2026-03-15
> Verification method: Code inspection ONLY — not runtime
> Status: PASS (code-level) / UNVERIFIED (runtime-level)

---

## Verification Scope

This document covers the alert cooldown and deduplication logic that prevents
the same alert from firing repeatedly within a configured time window. Every
claim below is based on reading source code, NOT on observing runtime behavior.

---

## 1. isWithinCooldown Function

### What the code does

| Check                              | Status | Evidence                                             |
|------------------------------------|--------|------------------------------------------------------|
| Queries Notification table         | PASS   | `prisma.notification.findFirst()` with filters       |
| Filters by sourceType              | PASS   | `where: { sourceType: type }`                        |
| Filters by sourceId                | PASS   | `where: { sourceId: composedId }`                    |
| Filters by createdAt >= threshold  | PASS   | `createdAt: { gte: new Date(now - cooldownMs) }`    |
| Returns boolean                    | PASS   | `return !!existingNotification`                      |
| Does NOT delete old notifications  | PASS   | Read-only query, no side effects                     |

### sourceId format

```
Format: {projectId}:{alertType}:{keyword}
Example: "proj_abc:sentiment_drop:brand_name"
```

| Check                              | Status | Evidence                                             |
|------------------------------------|--------|------------------------------------------------------|
| Includes projectId                 | PASS   | First segment — ensures project isolation            |
| Includes alert type                | PASS   | Second segment — differentiates alert categories     |
| Includes keyword/trigger           | PASS   | Third segment — differentiates specific triggers     |
| Project A alert != Project B alert | PASS   | Different projectId prefix prevents collision        |

**HONEST NOTE**: We have not run this with two real projects to confirm
isolation. The string format LOOKS correct, but string formatting bugs
are invisible to code inspection. We are asserting correctness based on
reading, not observation.

---

## 2. Cooldown Duration Calculation

### What the code does

| Check                                       | Status | Evidence                                        |
|---------------------------------------------|--------|-------------------------------------------------|
| Reads condition's default cooldown          | PASS   | Each condition type has a `cooldownMs` default  |
| Reads user's globalCooldownMinutes          | PASS   | From Preference table (if DB were available)    |
| Converts minutes to milliseconds            | PASS   | `globalCooldownMinutes * 60000`                 |
| Takes Math.max of both                      | PASS   | User cannot reduce below condition minimum      |
| Falls back to default if no user pref       | PASS   | `?? conditionDefault`                           |

### Edge cases in code

| Scenario                           | Handling                    | Verified Runtime? |
|------------------------------------|-----------------------------|-------------------|
| globalCooldownMinutes = 0          | Uses condition default      | NO                |
| globalCooldownMinutes = null       | Uses condition default      | NO                |
| globalCooldownMinutes > 1440 (1d)  | Accepted as-is (no cap)     | NO                |
| Condition default = 0              | Would disable cooldown      | NO                |
| Negative values                    | Not guarded — potential bug | NO                |

**HONEST NOTE**: Negative cooldown values are not explicitly guarded. If
someone sets `globalCooldownMinutes = -5`, the Math.max would still use
the condition default (since condition defaults are positive), but this
is not tested. Every "Verified Runtime?" column says NO because we have
never executed this code path.

---

## 3. Skip and Logging Behavior

### What the code does when cooldown is active

| Check                                    | Status | Evidence                                       |
|------------------------------------------|--------|-------------------------------------------------|
| Skips alert creation                     | PASS   | `if (isWithinCooldown(...)) continue`           |
| Logs skip with console.info             | PASS   | `console.info('Alert cooldown active: ...')`    |
| Log includes alert type                  | PASS   | Interpolated in log message                     |
| Log includes keyword                     | PASS   | Interpolated in log message                     |
| Log includes cooldown duration           | PASS   | Shows remaining time or total window            |
| Does NOT log at console.error level     | PASS   | Correctly treats cooldown skip as expected flow |
| Does NOT throw                           | PASS   | continue, not throw                             |

### What the code does when cooldown is NOT active

| Check                                    | Status | Evidence                                       |
|------------------------------------------|--------|-------------------------------------------------|
| Creates Notification record              | PASS   | `prisma.notification.create({ data: ... })`    |
| Sets sourceType                          | PASS   | Matches the condition type                     |
| Sets sourceId                            | PASS   | Composite key as described above               |
| Sets createdAt                           | PASS   | `new Date()` or Prisma default                 |
| Proceeds to delivery                     | PASS   | Calls delivery function after create           |

**HONEST NOTE**: Every PASS above means "the code says this." We have not
observed a single console.info output from this code path. We have not
observed a single Notification record being created. These are code-reading
assertions, not runtime observations.

---

## 4. Deduplication Logic

### How dedup works (per code)

1. Alert engine iterates over active conditions
2. For each condition that evaluates to true (threshold breached):
   a. Compose sourceId = `{projectId}:{type}:{keyword}`
   b. Call `isWithinCooldown(sourceType, sourceId, cooldownMs)`
   c. If `findFirst` returns a record -> skip (duplicate within window)
   d. If `findFirst` returns null -> create new Notification -> deliver
3. Next condition

| Check                                    | Status | Evidence                                       |
|------------------------------------------|--------|-------------------------------------------------|
| Same sourceId within cooldown -> skipped | PASS   | findFirst returns record -> continue            |
| Same sourceId after cooldown -> fires    | PASS   | findFirst returns null -> create                |
| Different sourceId -> independent        | PASS   | Different where clause -> no collision          |
| Multiple conditions per project          | PASS   | Loop processes each independently              |

---

## 5. Error Handling

| Check                                    | Status | Evidence                                       |
|------------------------------------------|--------|-------------------------------------------------|
| try-catch per condition evaluation       | PASS   | One condition failing doesn't stop others      |
| try-catch per createAlertNotification    | PASS   | Delivery failure doesn't crash the engine      |
| DB query failure in isWithinCooldown     | PASS   | Caught, logs error, defaults to NOT in cooldown|
| Prisma connection error                  | PASS   | Caught at outer level                          |

**HONEST NOTE on error default**: When `isWithinCooldown` throws (e.g., DB
unreachable), the code defaults to `false` (NOT in cooldown), meaning the
alert WILL fire. This is a deliberate choice — better to send a duplicate
alert than to silently suppress a real alert. Whether this is correct
depends on product requirements. It means a DB outage could cause alert
spam. This has never been tested under failure conditions.

---

## 6. What We Did NOT Verify — The Uncomfortable List

This section exists because the previous version of this document said "PASS"
without qualifying what that actually means.

| Item                                     | Why not verified                               |
|------------------------------------------|-------------------------------------------------|
| Actual DB query execution                | PostgreSQL not running (see DB_AND_API doc)     |
| Actual time-window behavior              | Would need to wait for cooldown to expire       |
| Multi-project isolation at runtime       | Would need two projects with same keyword        |
| Performance under load                   | Would need many concurrent condition evaluations |
| Race condition (two alerts same ms)      | Would need concurrent requests to same endpoint  |
| Cooldown across server restarts          | Would need DB persistence (which we don't have)  |
| Console.info output format              | Would need to see actual stdout                  |
| Integration with notification bell UI    | Would need full stack running                    |
| Correct behavior with real Prisma client | Prisma generates types but never ran a query     |
| Memory behavior with many conditions     | No load testing performed                        |

That is TEN items we did not verify. The "PASS" status at the top of this
document means "the code logic is correct when read by a human." It does
NOT mean "the feature works."

---

## 7. Confidence Assessment

```
Code logic correctness:     HIGH   — control flow is clear and standard
Type safety:                HIGH   — TypeScript + Prisma types align
Edge case coverage:         MEDIUM — negative values not guarded
Runtime correctness:        ZERO   — never executed against real DB
Integration correctness:    ZERO   — never observed end-to-end
Load/stress behavior:       ZERO   — never tested under concurrency
```

### Bottom line

The cooldown and dedup logic follows a well-known pattern: query for recent
duplicate, skip if found, create if not. The code is straightforward and
the TypeScript types match the Prisma schema. But "the code looks right"
is not the same as "the code works." We have ZERO runtime evidence.

Anyone reviewing this should treat it as a code review approval, NOT as a
QA sign-off. QA requires a running database, and we do not have one.

The previous version of this document said "production-ready" in its verdict.
That was premature. Code-reviewed and production-ready are different things.

---

_Code-level verification only. No runtime evidence exists for this feature._
_Do not ship based on this document alone._
