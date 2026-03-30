# Scheduled Collection Architecture

> Date: 2026-03-16
> Status: IMPLEMENTED

## 구조 개요

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Scheduler   │────>│  Redis      │<────│  Worker      │
│  (cron 등록) │     │  (BullMQ)   │     │  (처리)      │
└──────────────┘     └──────┬──────┘     └──────┬───────┘
                            │                    │
                     ┌──────▼──────┐      ┌──────▼───────┐
                     │ Queue:      │      │ PostgreSQL   │
                     │ collection  │      │ (snapshots)  │
                     │ snapshot    │      └──────────────┘
                     └─────────────┘
```

## 컴포넌트

### 1. @x2/queue (packages/queue/)
- **connection.ts** — Redis 연결 (REDIS_URL 환경변수)
- **queues.ts** — Queue 정의 + Job 데이터 타입
  - `intelligence-collection` — 소셜 멘션 수집
  - `intelligence-snapshot` — 벤치마크/분석 snapshot 생성

### 2. @x2/analyzer (workers/analyzer/)
- **index.ts** — BullMQ Worker 2개 (collection + snapshot)
- **scheduler.ts** — 저장된 키워드 기반 반복 작업 등록

## Job Flow

### Collection Job (매 6시간)
```
1. 키워드별 오늘 snapshot 존재 확인 → 있으면 skip (dedup)
2. rawSocialMention에서 오늘 데이터 카운트
3. 감성 분류 (POSITIVE/NEUTRAL/NEGATIVE/UNCLASSIFIED)
4. socialMentionSnapshot upsert (projectId + keyword + date)
5. scheduledJob 상태 업데이트
```

### Snapshot Job (매일 02:00 UTC)
```
1. 오늘 analysisRun 존재 확인 → 있으면 skip (dedup)
2. 최신 analysisRun에서 benchmarkComparison 추출
3. benchmarkSnapshot upsert (projectId + keyword + industryType + date)
4. scheduledJob 상태 업데이트
```

## Reliability

| 항목 | 구현 |
|------|------|
| Retry | 3회 (collection), 2회 (snapshot) — exponential backoff |
| Overlap 방지 | 오늘 날짜 기준 snapshot 존재 시 skip |
| Duplicate 방지 | composite unique key (upsert) |
| Failure logging | Worker event handler + console.error |
| Job 보관 | 완료 100건, 실패 200건 유지 |
| Rate limit | 분당 10건 (collection), 5건 (snapshot) |
| Concurrency | 3 (collection), 2 (snapshot) |
| Graceful shutdown | SIGINT/SIGTERM 핸들러 |

## 기존 인프라와의 관계

이 프로젝트에는 이미 방대한 자동화 인프라가 존재합니다:

| 기존 서비스 | 역할 | BullMQ 연결 |
|------------|------|------------|
| `ScheduleRegistryService` | 자동화 규칙 등록/관리 (SCHEDULED_CRON + 8개 이벤트 트리거) | 향후 규칙 기반 job 자동 등록 |
| `AutomationOrchestratorService` | 규칙 평가 → 실행 디스패치 | BullMQ job으로 실행 위임 가능 |
| `TriggerEvaluationService` | 8개 이벤트 트리거 평가 | collection job 완료 후 트리거 평가 연계 |
| `CollectionOrchestrationService` | DEFAULT_JOBS 등록 + 채널 수집 | BullMQ queue와 동일한 cron 패턴 |
| `OpsMonitoringService` | 파이프라인 건강 상태 + 실패 추적 | Worker 실패 시 ops 알림 연계 |
| `CollectionRunner` | 플랫폼별 실제 수집 (circuit breaker) | collection job에서 호출 가능 |

### 현재 구조 (Phase 1: BullMQ 직접 실행)
```
BullMQ Queue → Worker → DB (snapshot upsert)
```

### 향후 구조 (Phase 2: 기존 자동화 통합)
```
ScheduleRegistryService → BullMQ Queue → Worker → DB
                                         ↓
                                  TriggerEvaluation → AutomationOrchestrator
```

## 의존성

- **bullmq** ^5.71.0
- **ioredis** ^5.10.0
- **Redis** Docker container (x2-redis, port 6379)
- **PostgreSQL** Docker container (x2-postgres, port 5432)
