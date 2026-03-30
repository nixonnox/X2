# Phase 5: Cleanup Job Verification

> Date: 2026-03-16
> Status: PASS

## 1. Job Runtime

| 항목 | 상태 | 근거 |
|------|------|------|
| Queue 정의 | PASS | `queues.ts:61` — `dataRetentionQueue` (BullMQ) |
| Queue 이름 | PASS | `QUEUE_NAMES.DATA_RETENTION = "data-retention"` |
| Worker 정의 | PASS | `index.ts:296` — `retentionWorker` (concurrency: 1) |
| 처리 함수 | PASS | `index.ts:250` — `processRetention(job)` |
| Scheduler 등록 | PASS | `scheduler.ts:104` — `"0 3 * * 0"` (매주 일요일 03:00 UTC) |
| 기존 job 정리 | PASS | `scheduler.ts:99-101` — 기존 repeatable 제거 후 재등록 |

## 2. Dry-Run

| 항목 | 상태 | 근거 |
|------|------|------|
| dry-run 파라미터 | PASS | `RetentionJobData.dryRun: boolean` |
| dry-run 분기 | PASS | `if (!cfg.dryRun && toDelete.length > 0)` — 5개 테이블 모두 동일 패턴 |
| dry-run 로그 | PASS | `console.log("[Retention] DRY-RUN: ...")` |

## 3. Cleanup 로그/요약

| 항목 | 상태 | 근거 |
|------|------|------|
| 테이블별 결과 | PASS | `CleanupTarget { table, totalEligible, protected, toDelete, oldestDate, newestDeleteDate }` |
| 전체 요약 | PASS | `CleanupResult { totalDeleted, totalProtected, durationMs, executedAt }` |
| Worker 로그 | PASS | `index.ts:265-270` — targets 배열을 문자열로 출력 |
| 성공/실패 이벤트 | PASS | `retentionWorker.on("completed/failed")` |

## 4. Job 안정성

| 항목 | 상태 | 근거 |
|------|------|------|
| Retry | PASS | `attempts: 1` (idempotent — 재시도 불필요) |
| Concurrency | PASS | 1 (동시 1건만) |
| Graceful shutdown | PASS | `retentionWorker.close()` in shutdown handler |
| Raw mention 배치 삭제 | PASS | 1000건씩 loop (long-running TX 방지) |
