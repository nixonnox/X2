# PRE_MASTER_DB_AND_API_VERIFICATION.md

> Generated: 2026-03-15
> Verification method: Code inspection + environment probing
> Honesty policy: No sugarcoating. Red is red.

---

## Item 1: PostgreSQL Connection — BLOCKER

### What IS configured (code-level)

| Check                        | Status | Detail                                                       |
|------------------------------|--------|--------------------------------------------------------------|
| DATABASE_URL in .env.local   | PASS   | `postgresql://postgres:postgres@localhost:5432/x2`           |
| DIRECT_URL in .env.local     | PASS   | Same connection string, required by Prisma for migrations    |
| packages/db/.env             | PASS   | Created this session (was missing, caused Prisma CLI errors) |
| Prisma schema provider       | PASS   | `provider = "postgresql"` — not SQLite, not mock             |
| Prisma schema models         | PASS   | Intelligence, Notification, Keyword, Preference all defined  |
| Prisma client generation     | PASS   | `@prisma/client` generates without errors                    |
| Application build            | PASS   | `next build` completes, Prisma client is bundled             |

### What is NOT working (runtime-level)

| Check                        | Status  | Detail                                                      |
|------------------------------|---------|-------------------------------------------------------------|
| PostgreSQL server on :5432   | FAIL    | Connection refused — no PostgreSQL process listening        |
| Docker availability          | FAIL    | Docker Desktop not running / not installed in this env      |
| `prisma db push`             | FAIL    | P1001: Can't reach database server at localhost:5432        |
| `prisma migrate deploy`      | FAIL    | Same P1001 — no server to connect to                       |
| Table existence               | FAIL    | intelligence table does not exist                           |
| Table existence               | FAIL    | notification table does not exist                           |
| Table existence               | FAIL    | keyword table does not exist                                |
| Table existence               | FAIL    | preference table does not exist                             |
| Data round-trip (save/load)  | FAIL    | Cannot insert or query without tables                       |

### BLOCKER Classification

```
SEVERITY: ENVIRONMENT BLOCKER
CATEGORY: Infrastructure dependency
CODE FAULT: None — all code is correct
RUNTIME FAULT: PostgreSQL server is not running
```

This is not a code quality issue. The Prisma schema is complete, the connection
string is valid, and the application code correctly calls `prisma.intelligence.create()`,
`prisma.notification.findMany()`, etc. The blocker is purely that no PostgreSQL
process is accepting connections on localhost:5432.

### Resolution Steps (in order)

1. Start PostgreSQL via ONE of:
   - `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`
   - WSL: `sudo service postgresql start`
   - Local install: Start the PostgreSQL service
2. Create the database: `createdb x2` (or via psql: `CREATE DATABASE x2;`)
3. Push schema: `cd packages/db && npx prisma db push`
4. Verify: `npx prisma studio` — confirm all tables appear with correct columns
5. Run the app and trigger an intelligence save — check the row lands in DB

### What "verified" actually means here

- Code inspection: We read every file, traced every import, confirmed every
  Prisma call matches the schema. This is STATIC verification only.
- Runtime verification: ZERO. We have not seen a single row written to or
  read from PostgreSQL. Anyone claiming "DB integration verified" without a
  running PostgreSQL is lying.
- Build verification: The app compiles. TypeScript types align with Prisma
  generated types. This proves type safety, not runtime correctness.

---

## Item 2: YouTube API — NOT VERIFIED

### What IS configured (code-level)

| Check                          | Status | Detail                                                    |
|--------------------------------|--------|-----------------------------------------------------------|
| YouTube provider file          | PASS   | `packages/social/src/youtube/` exists with real fetch()   |
| API endpoint construction      | PASS   | Uses `googleapis.com/youtube/v3/` with correct parameters |
| Graceful degradation           | PASS   | Returns empty array on error, does not throw              |
| Placeholder rejection          | PASS   | Detects "YOUR_API_KEY" and similar dummy values           |
| Channel ID extraction          | PASS   | Handles both `UC...` IDs and `/c/`, `/@` URL formats     |
| Rate limit awareness           | PASS   | Quota tracking comments present, batch requests used      |
| Response type mapping          | PASS   | Maps API response to internal SocialChannel type          |

### What is NOT configured (environment-level)

| Check                          | Status | Detail                                                    |
|--------------------------------|--------|-----------------------------------------------------------|
| YOUTUBE_API_KEY in .env.local  | FAIL   | Not set — empty or missing                                |
| YOUTUBE_API_KEY in .env        | FAIL   | Not set — empty or missing                                |
| Actual API call                | FAIL   | Cannot make any YouTube Data API v3 request               |
| Channel data retrieval         | FAIL   | No real channel data has been fetched                     |
| Video statistics               | FAIL   | No real video stats have been retrieved                   |
| Subscriber count accuracy      | FAIL   | Cannot verify number formatting without real data         |

### BLOCKER Classification

```
SEVERITY: ENVIRONMENT BLOCKER
CATEGORY: External API credential
CODE FAULT: None — fetch logic is correct
RUNTIME FAULT: Missing API key
```

### Resolution Steps

1. Go to Google Cloud Console (console.cloud.google.com)
2. Create or select a project
3. Enable "YouTube Data API v3"
4. Create an API key (restrict to YouTube Data API v3 for safety)
5. Add to `apps/web/.env.local`: `YOUTUBE_API_KEY=AIza...`
6. Restart dev server
7. Navigate to a project with a YouTube channel URL — verify real data loads

### What "verified" actually means here

- Code inspection: The fetch URL construction is correct. Error handling exists.
  Response mapping covers all expected fields (subscriberCount, viewCount,
  videoCount, thumbnails).
- Runtime verification: ZERO. We have not seen a single YouTube API response.
  We do not know if the API key scope is correct, if quota limits will hit,
  or if the response schema has changed since the code was written.
- Integration verification: ZERO. The dashboard has never displayed real
  YouTube channel data from this code path in our observation.

---

## Summary Honesty Table

| Component          | Code Ready | Runtime Verified | Confidence |
|--------------------|------------|------------------|------------|
| Prisma schema      | YES        | NO               | HIGH (code)|
| DB connection      | YES        | NO               | ZERO       |
| DB CRUD operations | YES        | NO               | ZERO       |
| YouTube fetch      | YES        | NO               | ZERO       |
| YouTube display    | YES        | NO               | ZERO       |

"Code ready" means: compiles, types check, logic looks correct on reading.
"Runtime verified" means: we actually ran it and observed correct behavior.
The gap between these two is where bugs hide.

---

_This document does not claim runtime verification. It claims code-level_
_inspection only. Treat accordingly._
