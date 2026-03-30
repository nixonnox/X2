# Intelligence Persistence Verification Report

> Generated: 2026-03-15
> Scope: Persistence service, router integration, and Prisma schema verification

---

## Summary

| Component           | Status           | Issue Count | Highest Severity |
|---------------------|------------------|-------------|------------------|
| Persistence Service | VERIFIED CORRECT | 0           | —                |
| Router Integration  | Issues Found     | 3           | S1               |
| Schema              | VERIFIED CORRECT | 0           | —                |

---

## Persistence Service — VERIFIED CORRECT

All persistence methods were audited against the Prisma schema and found to be correctly implemented.

| Method                | Verification | Notes |
|-----------------------|--------------|-------|
| `saveAnalysisRun`     | PASS         | Calls `prisma.analysisRun.create` with all required fields correctly mapped. |
| `saveComparisonRun`   | PASS         | Calls `prisma.comparisonRun.create` with period fields (`periodStart`, `periodEnd`, `comparedRunIds`) correctly included. |
| `saveSocialSnapshot`  | PASS         | Uses `prisma.socialSnapshot.upsert` with composite key `(projectId, keyword, date)`. Creates on first call, updates on subsequent calls for the same key. |
| `saveBenchmarkSnapshot` | PASS       | Uses `prisma.benchmarkSnapshot.upsert` with composite key `(projectId, keyword, industryType, date)`. Correct field mapping confirmed. |
| Prisma client injection | PASS       | `PrismaClient` is injected via constructor dependency injection. No direct instantiation detected. |
| Mock/stub detection   | PASS         | No mock data, in-memory stores, or stub implementations found in the persistence service. All operations go through the real Prisma client. |

---

## Router Integration — Issues Found

| # | Title | Severity | Description | Actual Impact | Quick Fix | Structural Fix |
|---|-------|----------|-------------|---------------|-----------|----------------|
| 1 | providerCoverage never populated in analyze mutation | S1 | The `analyze` mutation constructs the result object but never computes or assigns the `providerCoverage` field before passing it to `saveAnalysisRun`. The field is always `null` in the database. | Historical analysis runs have no record of which providers contributed data or how many results each returned. Provider-level debugging and coverage reporting are impossible from saved data. | N | Y — Collect coverage counts from each adapter response in the registry, aggregate them, and pass the result to the persistence layer before saving. |
| 2 | Null sentiment counted as "neutral" in liveMentions snapshot | S1 | When building the `liveMentions` social snapshot, mentions with `sentiment: null` (which is all of them, per the bridge issue) are bucketed as `"neutral"` in the sentiment distribution. | The snapshot reports 100% neutral sentiment for all social mentions. This is misleading because it implies sentiment was analyzed and found to be neutral, when in reality no analysis was performed. | Y — Count `null` sentiment as `"unknown"` or `"unanalyzed"` instead of `"neutral"`. | N |
| 3 | isStaleBased always false in analyze | S2 | The `isStaleBased` flag in the analysis result is hardcoded to `false`. It should reflect whether the analysis used cached/stale data instead of fresh API results. | Users cannot distinguish between fresh and stale analysis results. The UI always shows "live" indicators even when data may be hours old. This undermines trust in the freshness guarantee. | Y — Set `isStaleBased` based on whether cached data was used (e.g., check if any adapter returned cached results or if the data age exceeds a threshold). | N |

### Additional Observations

- All `save*` calls are wrapped in `try-catch` blocks. Failures are logged but do not propagate to the client. This is by design — the analysis result is returned to the user regardless of whether persistence succeeds. This trade-off prioritizes user experience over data completeness.
- `savedRunId` is correctly returned to the client after a successful save, enabling the frontend to link to the saved run for later retrieval.

---

## Schema — VERIFIED CORRECT

The Prisma schema was audited for completeness and correctness against the application's data requirements.

| Check                          | Status | Notes |
|--------------------------------|--------|-------|
| All required fields present    | PASS   | Every field referenced by the persistence service exists in the schema with correct types. |
| Indexes for history queries    | PASS   | Indexes on `(projectId, keyword, createdAt)` support paginated history queries efficiently. |
| Composite unique on snapshots  | PASS   | `@@unique([projectId, keyword, date])` on `SocialSnapshot` and `@@unique([projectId, keyword, industryType, date])` on `BenchmarkSnapshot` ensure correct upsert behavior. |
| Project reverse relations      | PASS   | `Project` model has reverse relation fields for `analysisRuns`, `comparisonRuns`, `socialSnapshots`, and `benchmarkSnapshots`. Cascade delete is configured. |
| fusionResult stored for comparison reuse | PASS | `ComparisonRun` stores `fusionResult` as a JSON field, enabling reuse without re-computation. |
