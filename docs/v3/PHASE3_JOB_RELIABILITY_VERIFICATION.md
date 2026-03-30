# Phase 3: Job Reliability Verification

> Date: 2026-03-16
> Status: PASS (S1 1건)

## Retry

| Queue | Max Attempts | Backoff | 검증 |
|-------|-------------|---------|------|
| intelligence-collection | 3 | exponential, 30s base (30s/60s/120s) | PASS — queues.ts:42-43 |
| intelligence-snapshot | 2 | exponential, 15s base (15s/30s) | PASS — queues.ts:55-56 |

## Overlap 방지

| 대상 | 방식 | 검증 |
|------|------|------|
| Collection | 오늘 socialMentionSnapshot 존재 → skip | PASS — index.ts:47-58 |
| Snapshot | 오늘 analysisRun 존재 + !runAnalysis → skip | PASS — index.ts:140-153 |
| Scheduler | 기존 repeatable job 전부 제거 후 재등록 | PASS — scheduler.ts:42-51 |

## Duplicate 방지

| 대상 | 방식 | 검증 |
|------|------|------|
| socialMentionSnapshot | Prisma upsert (composite unique) | PASS |
| benchmarkSnapshot | Prisma upsert (composite unique) | PASS |
| Repeatable job | BullMQ jobId 기반 중복 방지 | PASS |

## Failure Logging

| 이벤트 | 처리 | 검증 |
|--------|------|------|
| Worker job 실패 | `collectionWorker.on("failed", ...)` — error + jobId + attempt 기록 | PASS — index.ts:275-282 |
| Snapshot 실패 | `snapshotWorker.on("failed", ...)` — 동일 | PASS — index.ts:288-295 |
| updateJobStatus 실패 | try-catch + log("warn") | PASS — index.ts:242-244 |

## Rate Limiting

| Queue | Limit | 검증 |
|-------|-------|------|
| Collection | 10 jobs / 분 | PASS — index.ts:255 |
| Snapshot | 5 jobs / 분 | PASS — index.ts:265 |

## Job Retention

| 상태 | 보관 | 검증 |
|------|------|------|
| Completed | 최근 100건 | PASS — queues.ts:44 |
| Failed | 최근 200건 | PASS — queues.ts:45 |

## Graceful Shutdown

| Signal | 처리 | 검증 |
|--------|------|------|
| SIGINT | close workers + quit Redis | PASS — index.ts:299-308 |
| SIGTERM | 동일 | PASS |

## S1 이슈: JobType Enum 불일치

- **문제:** `updateJobStatus`에서 `MENTION_COLLECT`, `SNAPSHOT_GEN`을 사용하지만 Prisma `JobType` enum에 해당 값이 없음
- **영향:** `scheduledJob.findFirst({ type: "MENTION_COLLECT" })`가 항상 null 반환 → job 상태 추적 silent fail
- **snapshot 생성 자체에는 영향 없음** (upsert는 별도 경로)
- **수정 방향:** JobType enum에 `MENTION_COLLECT`, `SNAPSHOT_GEN` 추가 또는 기존 `KEYWORD_TRACK` 매핑
