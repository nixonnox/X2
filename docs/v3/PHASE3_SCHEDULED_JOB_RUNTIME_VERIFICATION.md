# Phase 3: Scheduled Job Runtime Verification

> Date: 2026-03-16
> Status: PASS (S1 1건)

## 1. Job Runtime 구조

| 항목 | 상태 | 파일 | 근거 |
|------|------|------|------|
| BullMQ Queue 2개 정의 | PASS | `packages/queue/src/queues.ts` | intelligence-collection, intelligence-snapshot |
| Redis 연결 | PASS | `packages/queue/src/connection.ts` | ioredis singleton, REDIS_URL |
| Collection Worker | PASS | `workers/analyzer/src/index.ts:42-132` | `processCollection` + Worker 인스턴스 |
| Snapshot Worker | PASS | `workers/analyzer/src/index.ts:136-213` | `processSnapshot` + Worker 인스턴스 |
| Scheduler (반복 등록) | PASS | `workers/analyzer/src/scheduler.ts` | DB에서 isSaved 키워드 → repeatable job |
| 패키지 의존성 | PASS | package.json | bullmq ^5.71.0, ioredis ^5.10.0 |
| Docker Redis | PASS | x2-redis 컨테이너 | port 6379, PONG 확인 |

## 2. Collection Job 흐름

```
scheduler.ts
  └─ DB에서 isSaved 키워드 로드
  └─ intelligenceCollectionQueue.add (repeat: "0 */6 * * *")

processCollection(job)
  ├─ 오늘 socialMentionSnapshot 존재? → skip (dedup)
  ├─ rawSocialMention COUNT (오늘 데이터)
  ├─ 감성 분류 (POSITIVE/NEUTRAL/NEGATIVE/UNCLASSIFIED)
  ├─ socialMentionSnapshot.upsert (composite unique)
  └─ updateJobStatus (scheduledJob 테이블)
```

## 3. Snapshot Job 흐름

```
scheduler.ts
  └─ intelligenceSnapshotQueue.add (repeat: "0 2 * * *")

processSnapshot(job)
  ├─ 오늘 intelligenceAnalysisRun 존재? → skip (dedup)
  ├─ 최신 analysisRun에서 benchmarkComparison 추출
  ├─ benchmarkSnapshot.upsert (composite unique)
  └─ updateJobStatus (scheduledJob 테이블)
```

## 4. Scheduler 등록 흐름

```
registerScheduledJobs()
  ├─ DB에서 intelligenceKeyword (isSaved=true) 로드
  ├─ 기존 repeatable job 전부 제거 (dedup)
  └─ 키워드별 2개 repeatable job 등록
      ├─ collection: "0 */6 * * *"
      └─ snapshot: "0 2 * * *"
```
