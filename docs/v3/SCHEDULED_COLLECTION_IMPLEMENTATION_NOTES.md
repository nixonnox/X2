# Scheduled Collection Implementation Notes

> Date: 2026-03-16

## 이번 단계에서 구현한 것

### 새로 만든 파일

| 파일 | 역할 |
|------|------|
| `packages/queue/src/connection.ts` | Redis 연결 (ioredis) |
| `packages/queue/src/queues.ts` | BullMQ Queue 정의 (2개) + Job 데이터 타입 |
| `packages/queue/src/index.ts` | 패키지 export |
| `workers/analyzer/src/index.ts` | BullMQ Worker 2개 (collection + snapshot) |
| `workers/analyzer/src/scheduler.ts` | 저장 키워드 기반 반복 작업 등록 |

### 수정한 파일

| 파일 | 변경 |
|------|------|
| `packages/queue/package.json` | bullmq, ioredis 의존성 추가 |
| `workers/analyzer/package.json` | bullmq, ioredis, @x2/queue, @x2/db 의존성 추가 |

### 인프라

| 항목 | 상태 |
|------|------|
| Redis (Docker) | `x2-redis` 컨테이너 실행 중 (port 6379) |
| PostgreSQL | `x2-postgres` 컨테이너 실행 중 (port 5432) |

## 실행 방법

```bash
# 1. Redis 시작 (이미 실행 중이면 생략)
docker start x2-redis

# 2. Worker 실행 (작업 처리 대기)
pnpm --filter @x2/analyzer dev

# 3. 반복 작업 등록 (저장된 키워드 기반)
cd workers/analyzer && npx tsx src/scheduler.ts

# 4. 수동 작업 추가 (테스트용)
# → 별도 스크립트 또는 BullMQ Dashboard로 가능
```

## 운영 확인 방법

### Worker 로그
```
[2026-03-16T02:00:00.000Z] [analyzer] Collection started {"projectId":"proj-001","keyword":"스킨케어"}
[2026-03-16T02:00:01.234Z] [analyzer] Collection completed {"mentionCount":23,"buzzLevel":"MODERATE"}
```

### Job 상태 확인
```bash
# Redis CLI로 직접 확인
docker exec x2-redis redis-cli KEYS "bull:intelligence-*"

# 또는 BullMQ Dashboard (향후 설치)
```

### DB 확인
```sql
-- 오늘 생성된 소셜 snapshot
SELECT * FROM social_mention_snapshots WHERE date = CURRENT_DATE;

-- 오늘 생성된 벤치마크 snapshot
SELECT * FROM benchmark_snapshots WHERE date = CURRENT_DATE;

-- 스케줄된 job 상태
SELECT * FROM scheduled_jobs WHERE status = 'ACTIVE';
```

## 남은 과제

| 항목 | 우선순위 | 설명 |
|------|---------|------|
| LiveSocialMentionBridgeService 연동 | HIGH | 현재 DB 직접 쿼리 → 실제 provider API 호출로 전환 |
| Signal Fusion 자동 실행 | MEDIUM | snapshot job에서 runAnalysis=true 시 full analysis 실행 |
| BullMQ Dashboard | LOW | 웹 UI로 job 상태 모니터링 |
| Scheduler 자동 실행 | MEDIUM | Worker 시작 시 scheduler도 자동 실행 |
| 알림 연동 | MEDIUM | 수집 실패 시 자동 알림 생성 |
