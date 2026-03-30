# Verify: P0 Retry Runtime

> Date: 2026-03-16
> Status: PASS

## 1. setTimeout 제거

| 항목 | 상태 | 근거 |
|------|------|------|
| intelligence-alert.service.ts에 setTimeout | **없음** | `grep setTimeout` → No matches found |
| scheduleRetry → BullMQ | PASS | `deliveryRetryQueue.add(data, { delay: delayMs })` |

## 2. BullMQ Delayed Job

| 항목 | 상태 | 근거 |
|------|------|------|
| Queue 정의 | PASS | `QUEUE_NAMES.DELIVERY_RETRY = "delivery-retry"` |
| JobData 타입 | PASS | `DeliveryRetryJobData` — 11개 필드 |
| delay 파라미터 | PASS | `{ delay: delayMs }` — 5min/15min/60min |
| job name | PASS | `retry:{notificationId}:{channel}:{attempt}` |

## 3. Redis 지속성

| 항목 | 상태 | 근거 |
|------|------|------|
| Redis connection | PASS | `getRedisConnection()` — ioredis singleton |
| Job persistence | PASS | BullMQ가 Redis에 저장 (자동) |
| 서버 재시작 영속 | PASS | Redis 기반 — 프로세스 독립 |

## 4. Worker

| 항목 | 상태 | 근거 |
|------|------|------|
| deliveryRetryWorker | PASS | `Worker<DeliveryRetryJobData>(QUEUE_NAMES.DELIVERY_RETRY, processDeliveryRetry)` |
| concurrency | PASS | 2 |
| event handlers | PASS | completed + failed 로그 |
| graceful shutdown | PASS | `deliveryRetryWorker.close()` |
| delivery_logs DB 기록 | PASS | `db.deliveryLog.create({ executionId: null })` |
| 재귀 retry | PASS | 실패 시 `deliveryRetryQueue.add({ attemptCount + 1 }, { delay })` |
