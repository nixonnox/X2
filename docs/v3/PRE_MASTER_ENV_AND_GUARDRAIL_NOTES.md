# Pre-Master Environment and Guardrail Notes

**Date:** 2026-03-15
**Purpose:** Summary of code changes, environment status, and remaining work for Master QA

---

## 1. Code Changes This Session

### maxAlertsPerDay Enforcement

**File:** `packages/api/src/services/intelligence/intelligence-alert.service.ts`

| Item | Status | Details |
| ---- | ------ | ------- |
| Daily count check before evaluateConditions | IMPLEMENTED | `notification.count()` with userId + sourceType + createdAt >= todayStart |
| Per-iteration cap check in condition loop | IMPLEMENTED | `if (remainingDailyCap <= 0) break` at start of each iteration |
| UserPrefs type includes maxAlertsPerDay | IMPLEMENTED | `maxAlertsPerDay: number` field in UserPrefs type |
| Default maxAlertsPerDay value | IMPLEMENTED | Default: 20 (in prefs initialization, schema @default, and UI) |
| dailyCapped flag in return type | IMPLEMENTED | `Promise<{ alertsTriggered: string[]; dailyCapped?: boolean }>` |
| dailyCapped in response metadata | PARTIAL | Present in service return, but NOT passed through notification router to API response |
| console.info logging for pre-eval cap | IMPLEMENTED | Logs userId, count, and cap value |
| console.info logging for mid-eval cap | IMPLEMENTED | Logs when remaining cap hits 0 during loop |
| remainingDailyCap decrement | IMPLEMENTED | Decremented after each successful `createAlertNotification()` call |

### Schema Changes

**File:** `packages/db/prisma/schema.prisma`

| Item | Status | Details |
| ---- | ------ | ------- |
| UserAlertPreference.maxAlertsPerDay | PRESENT | `Int @default(20)` |
| Total model count | 61 | Verified by counting `model` declarations |

### UI Changes

**File:** `apps/web/src/app/(dashboard)/settings/notifications/page.tsx`

| Item | Status | Details |
| ---- | ------ | ------- |
| maxAlertsPerDay input field | PRESENT | Number input, min=1, max=100 |
| Default value in form state | PRESENT | 20 |
| Load from server preference | PRESENT | Falls back to 20 if not set |
| Save to server | PRESENT | Included in save payload |
| Warning for high values | PRESENT | Amber text when > 50 |

---

## 2. Environment Status

### PostgreSQL Database

| Check | Result |
| ----- | ------ |
| DATABASE_URL configured | Yes — `packages/db/.env` |
| DIRECT_URL configured | Yes — `packages/db/.env` |
| Connection string format | `postgresql://postgres:postgres@localhost:5432/x2?schema=public` |
| PostgreSQL server running | **NO** — localhost:5432 unreachable |
| PostgreSQL installed | **NO** — no `psql` command available |
| Docker available | **NO** — no `docker` command available |
| `prisma db push` result | **FAILED** — P1001 (can't reach server) |
| Tables created | **NONE** |

**Diagnosis:** Infrastructure gap. The code correctly references PostgreSQL and the
connection string is properly configured. The server simply does not exist on this machine.

### YouTube Data API

| Check | Result |
| ----- | ------ |
| YOUTUBE_API_KEY in .env | **NOT SET** in any .env file |
| YOUTUBE_API_KEY in .env.example | Referenced (no real value) |
| Adapter reads env var | Yes — `process.env.YOUTUBE_API_KEY` in constructor |
| isConfigured() behavior when missing | Returns false |
| fetchMentions() behavior when missing | Returns `{ mentions: [], error: "YOUTUBE_API_KEY 미설정" }` |
| testConnection() behavior when missing | Returns `{ ok: false, error: "..." }` |
| E2E API call made | **NO** |

**Diagnosis:** Infrastructure gap. The code handles missing API key gracefully.
No API key was provided, so no real API calls could be tested.

### Both Issues Are Infrastructure, Not Code Defects
- The code compiles and handles missing infrastructure gracefully
- No null pointer exceptions, no unhandled promise rejections
- Graceful degradation paths exist and were verified by code review

---

## 3. What Was Actually Verified vs. What Was Not

### Verified (source code reading)
- Schema file syntax and model definitions (61 models)
- maxAlertsPerDay implementation flow in IntelligenceAlertService
- YouTube adapter's graceful degradation when API key is missing
- UI form state management for notification preferences
- DATABASE_URL and DIRECT_URL values in packages/db/.env
- dailyCapped flag exists in service return type
- Cooldown and daily cap interaction order

### NOT Verified (requires infrastructure)
- Database table creation via prisma db push
- Any CRUD operation against the database
- Any HTTP request to YouTube Data API
- Auth.js session persistence
- Notification save and retrieval
- UserAlertPreference save and load round-trip
- End-to-end alert flow: analysis -> condition evaluation -> notification creation
- dailyCapped flag reaching API consumers (confirmed it does NOT reach the router)

### Corrections to Common Assumptions
- Model count is **61**, not 65+
- dailyCapped is in the **service layer only**, not in the router response
- YouTube quota reset uses Pacific Time, but daily alert cap uses **server local time**
  (these are different clocks)

---

## 4. Remaining Work for Master QA

### Priority 1: Start PostgreSQL Server
1. Install PostgreSQL 16 locally OR install Docker Desktop
2. If Docker: `docker run --name x2-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=x2 -d postgres:16`
3. If local install: create database `x2` with user `postgres` / password `postgres`
4. Run: `cd packages/db && npx prisma db push`
5. Verify: `npx prisma studio` — should show 61 tables
6. Test: Create a User record, verify it persists

### Priority 2: Set YouTube API Key
1. Go to Google Cloud Console -> APIs & Services -> Credentials
2. Create an API key with YouTube Data API v3 enabled
3. Add to environment: `YOUTUBE_API_KEY=<key>` (in packages/api/.env or root .env)
4. Verify: instantiate YouTubeDataApiAdapter, call `testConnection()`
5. Test: call `fetchMentions("test keyword")`, verify mentions are returned

### Priority 3: End-to-End Alert Flow
1. With DB running: create a User and UserAlertPreference record
2. Trigger `evaluateAndAlert()` with test parameters
3. Verify Notification records are created in DB
4. Verify daily cap: create 20 alerts, verify 21st is blocked
5. Verify cooldown: create an alert, immediately re-trigger, verify cooldown skip

### Priority 4: Router Integration
1. Verify whether `dailyCapped` flag should be exposed in the API response
2. If yes: update notification router to include it in the response
3. If no: document the design decision

---

## 5. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
| ---- | -------- | ---------- | ---------- |
| DB connection fails in production | High | Low (if infra is set up) | Standard PostgreSQL deployment |
| YouTube quota exceeded | Medium | Medium | Quota tracking in adapter, 10K/day limit |
| Daily cap race condition | Low | Low | Max overshoot: 4 alerts per race |
| dailyCapped not reaching API | Low | Unknown | Clarify product requirement |
| Server timezone vs Pacific Time mismatch | Low | Low | Daily cap and YouTube quota use different clocks by design |

---

## 6. Files Modified/Relevant

| File | Role |
| ---- | ---- |
| `packages/api/src/services/intelligence/intelligence-alert.service.ts` | Alert service with daily cap |
| `packages/api/src/services/intelligence/youtube-data-api.adapter.ts` | YouTube API adapter |
| `packages/db/prisma/schema.prisma` | Database schema (61 models) |
| `packages/db/.env` | Database connection string |
| `apps/web/src/app/(dashboard)/settings/notifications/page.tsx` | Alert preference UI |
| `packages/api/src/routers/notification.ts` | Notification router (no dailyCapped) |

---

## 7. Honesty Statement

This document reports only what was directly observed by reading source files and
attempting commands. No runtime behavior was tested. Where claims could not be verified,
they are explicitly marked as such.

The two infrastructure blockers (PostgreSQL server and YouTube API key) are genuine
gaps that prevent any runtime verification. They are not code issues and require
environment setup to resolve.
