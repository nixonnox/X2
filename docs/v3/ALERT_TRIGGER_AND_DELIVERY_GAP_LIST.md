# Alert Trigger and Delivery Gap List

> **Date**: 2026-03-15
> **Scope**: Consolidated gap analysis across alert creation, delivery, and consumption
> **Total Issues**: 13 (2 S0, 3 S1, 4 S2, 4 S3)

---

## 1. Executive Summary

The Intelligence Alert system successfully creates database records through a well-structured
evaluation pipeline. However, the **delivery and consumption layers are critically incomplete**.
Alerts are produced but never reach the user through any channel. Secondary issues include
cross-project data leakage, fragile error handling, and missing observability.

| Layer | Status | Gap Level |
|-------|--------|-----------|
| Alert Evaluation | Functional | Low |
| DB Persistence | Functional | Low |
| Deduplication | Partial | Medium |
| UI Consumption | **Broken** | Critical |
| Email Delivery | Not Built | High |
| WebSocket Push | Not Built | High |
| Observability | Not Built | Medium |

---

## 2. Issues by Severity

### S0 — Critical (Blocking)

| # | Title | Description | Actual Impact | Quick Fix | Structural Fix |
|---|-------|-------------|---------------|-----------|----------------|
| 1 | **Bell icon non-functional** | The notification bell in the top navigation bar has no `onClick` handler, no dropdown component, and no state management. It renders as a static icon with a decorative red dot. | Users see a notification indicator that implies unread alerts but cannot interact with it. Zero notifications are ever displayed to any user through any path. | N | Y |
| 2 | **Alerts created but invisible** | `IntelligenceAlertService` writes `Notification` records to the database via `prisma.notification.create()`. No UI component queries or displays these records. No alternative view (settings, admin panel, dedicated page) shows them either. | Alert records accumulate indefinitely. The entire alert pipeline (evaluation + dedup + persistence) produces output that is never consumed. From the user's perspective, the alert feature does not exist. | N | Y |

---

### S1 — High (Correctness)

| # | Title | Description | Actual Impact | Quick Fix | Structural Fix |
|---|-------|-------------|---------------|-----------|----------------|
| 3 | **Cross-project dedup vulnerability** | `sourceId` is formatted as `"{conditionType}:{keyword}"` without including `projectId`. The dedup query `findFirst({ where: { sourceType, sourceId, createdAt >= cooldownStart } })` matches across all projects. | When the same keyword is analyzed in multiple projects within a cooldown window, only the first project's alert is created. Subsequent projects' legitimate alerts are suppressed. Multi-tenant environments are most affected. | Y | Y |
| 4 | **Silent alert creation failures** | `createAlertNotification()` is called sequentially for each condition inside `evaluate()`. There is no try-catch wrapping individual condition evaluations. A DB error on condition #1 prevents conditions #2-#4 from being evaluated. | Transient database errors (connection timeout, lock contention) cause partial evaluation. The outer try-catch in the analyze mutation catches the error but logs it generically without indicating which conditions were skipped. | Y | N |
| 5 | **Generic SYSTEM_ALERT type** | All intelligence alerts use `type: 'SYSTEM_ALERT'` from the `NotificationType` enum. No intelligence-specific type exists. Filtering intelligence alerts requires string-matching on `sourceType` instead of using a proper enum discriminator. | Cannot distinguish intelligence alerts from other system notifications (quota warnings, maintenance notices, admin messages) at the query level. Building a dedicated alert management view requires fragile `sourceType LIKE 'WARNING%'` queries. | N | Y |

---

### S2 — Medium (Functionality Gap)

| # | Title | Description | Actual Impact | Quick Fix | Structural Fix |
|---|-------|-------------|---------------|-----------|----------------|
| 6 | **First-run alerts limited** | `WARNING_SPIKE` and `BENCHMARK_DECLINE` conditions require a previous analysis run for delta comparison. On the first analysis of any keyword, `previousRun` is null and these conditions silently skip. | 2 of 4 alert conditions are inactive for every keyword's first analysis. Users receive no indication that comparison-based alerts could not be evaluated. May create false confidence that "no alerts = everything is fine." | Y | N |
| 7 | **Email/WebSocket not implemented** | The alert service contains `// TODO` stubs for email and WebSocket delivery. Only `IN_APP` delivery (database record creation) is functional. No SMTP configuration, no WebSocket server, no delivery preference model. | Users must actively open the app and navigate to notifications to discover alerts. Given that the bell icon is also non-functional (S0 #1), there is currently zero delivery of any kind. | N | Y |
| 8 | **No alert-specific query endpoint** | `trpc.notification.list` exists but does not accept `sourceType`, `severity`, or `conditionType` filters. There is no dedicated `trpc.intelligence.alerts` endpoint. | Building an alert management UI requires fetching all notifications and filtering client-side. This breaks pagination, wastes bandwidth, and prevents efficient alert-specific views. | Y | N |
| 9 | **No error handling on previous run DB query** | The `findFirst({ skip: 1 })` query for fetching the previous analysis run has no try-catch. A database error here throws through the entire evaluation, skipping all remaining conditions. | Similar to S1 #4 but scoped to the comparison query specifically. A corrupted or locked `keywordAnalysis` table entry for one keyword blocks all alert evaluation for that analysis run. | Y | N |

---

### S3 — Low (Polish/Hardening)

| # | Title | Description | Actual Impact | Quick Fix | Structural Fix |
|---|-------|-------------|---------------|-----------|----------------|
| 10 | **Alert evaluation not logged** | No structured logging or audit trail for alert evaluation runs. When `evaluate()` completes, only the count of triggered alerts is returned. Skipped conditions, dedup hits, and threshold details are not recorded. | Debugging alert behavior requires reading source code and manually querying the database. No way to answer "why didn't this keyword trigger an alert?" without code-level investigation. | Y | N |
| 11 | **Hardcoded cooldown values** | Cooldown durations (1h, 6h, 24h) are defined as constants in the source code. There is no admin UI, environment variable, or database setting to adjust them. | Changing cooldown behavior requires a code change and redeployment. Different projects or alert types cannot have custom cooldown periods. Acceptable for MVP but limits operational flexibility. | Y | N |
| 12 | **Dashboard card warning not drillable** | `IntelligenceSummaryCard` shows warning count (e.g., "이상 신호 2건") as a static badge. No click handler or link navigates to the specific warnings or a filtered alert view. | Users see that warnings exist but must manually navigate to the intelligence page and search for flagged keywords. Adds friction to the alert consumption workflow. | Y | N |
| 13 | **No rate limiting on alert creation** | There is no cap on how many alerts can be created per keyword, per project, or per time period beyond the per-condition cooldown. A keyword analyzed repeatedly with changing data could generate many alerts. | In pathological cases (automated re-analysis loops, bulk imports), alert volume could grow rapidly. Database table size and notification counts could become unwieldy. Cooldowns provide some protection but are per-condition only. | Y | N |

---

## 3. Impact Matrix

| Issue | Data Integrity | User Experience | System Stability | Security |
|-------|---------------|-----------------|-------------------|----------|
| #1 Bell icon | — | CRITICAL | — | — |
| #2 Invisible alerts | — | CRITICAL | — | — |
| #3 Cross-project dedup | HIGH | MEDIUM | — | MEDIUM |
| #4 Silent failures | MEDIUM | LOW | MEDIUM | — |
| #5 Generic type | LOW | MEDIUM | — | — |
| #6 First-run limits | — | MEDIUM | — | — |
| #7 No email/WS | — | HIGH | — | — |
| #8 No query endpoint | — | MEDIUM | LOW | — |
| #9 Previous run error | MEDIUM | LOW | MEDIUM | — |
| #10 No audit log | LOW | LOW | — | LOW |
| #11 Hardcoded cooldowns | — | LOW | — | — |
| #12 Non-drillable warning | — | LOW | — | — |
| #13 No rate limit | LOW | LOW | MEDIUM | — |

---

## 4. Dependency Graph

```
#1 Bell icon ──────────────┐
                           ├──► Notification UI (must build)
#2 Invisible alerts ───────┘         │
                                     ├──► #8 Query endpoint (needed by UI)
#5 Generic type ─────────────────────┤
                                     └──► #12 Drillable warnings (needs query)
#3 Cross-project dedup ── standalone fix (sourceId format)

#4 Silent failures ─┐
                    ├── standalone fixes (try-catch)
#9 Previous run ────┘

#6 First-run ── standalone UX note
#7 Email/WS ── infrastructure dependency (SMTP, WS server)
#10 Audit log ── standalone (structured logging)
#11 Cooldowns ── standalone (config extraction)
#13 Rate limit ── standalone (counter/cap logic)
```

---

## 5. Recommended Fix Sequence

| Phase | Issues | Effort | Outcome |
|-------|--------|--------|---------|
| **Phase 1: Unblock Visibility** | #1, #2, #8 | 3-4 days | Users can see and interact with alerts |
| **Phase 2: Correctness** | #3, #4, #5, #9 | 1 day | Alerts are project-isolated, error-resilient, filterable |
| **Phase 3: Communication** | #6, #12 | 3 hours | Users understand alert coverage and can drill down |
| **Phase 4: Delivery** | #7 | 2-3 days | Email and/or push delivery functional |
| **Phase 5: Hardening** | #10, #11, #13 | 1 day | Observable, configurable, rate-limited |

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Alert table grows unbounded | Medium | Medium | Implement #13 rate limit + periodic cleanup job |
| Users lose trust in alert system | High | High | Prioritize Phase 1 (visibility) immediately |
| Cross-project data leak | Low (single-tenant) | High (multi-tenant) | Fix #3 before any multi-tenant deployment |
| Alert fatigue from noise | Medium | Medium | Implement #11 configurable cooldowns + user preferences |

---

## 7. Verification Checklist

| # | Issue | Fix Applied | Tested | Deployed |
|---|-------|-------------|--------|----------|
| 1 | Bell icon | [ ] | [ ] | [ ] |
| 2 | Invisible alerts | [ ] | [ ] | [ ] |
| 3 | Cross-project dedup | [ ] | [ ] | [ ] |
| 4 | Silent failures | [ ] | [ ] | [ ] |
| 5 | Generic type | [ ] | [ ] | [ ] |
| 6 | First-run limits | [ ] | [ ] | [ ] |
| 7 | Email/WebSocket | [ ] | [ ] | [ ] |
| 8 | Query endpoint | [ ] | [ ] | [ ] |
| 9 | Previous run error | [ ] | [ ] | [ ] |
| 10 | Audit logging | [ ] | [ ] | [ ] |
| 11 | Hardcoded cooldowns | [ ] | [ ] | [ ] |
| 12 | Drillable warnings | [ ] | [ ] | [ ] |
| 13 | Rate limiting | [ ] | [ ] | [ ] |

---

*Report generated as part of Alert Trigger and Delivery gap analysis.*
*Next: INTELLIGENCE_ENTRY_UX_VERIFICATION.md*
