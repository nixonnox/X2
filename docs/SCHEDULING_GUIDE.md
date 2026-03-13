# 수집 스케줄링 가이드

## 현재 구조

개발 단계에서는 인메모리 스케줄러를 사용합니다. 운영 환경에서는 cron, BullMQ, 또는 별도 워커로 교체할 수 있습니다.

## 스케줄 주기

| 주기        | 설명        | 권장 대상                    |
| ----------- | ----------- | ---------------------------- |
| `manual`    | 수동 실행만 | 일회성 수집, 테스트          |
| `hourly`    | 매시간      | 키워드 멘션, 실시간 모니터링 |
| `every_6h`  | 6시간마다   | 콘텐츠 수집, 댓글 수집       |
| `every_12h` | 12시간마다  | 일반 콘텐츠 수집             |
| `daily`     | 매일        | 채널 스냅샷, 일간 리포트용   |
| `weekly`    | 매주        | 경쟁 분석, 주간 리포트용     |

## 스케줄 생성

```typescript
import { createSchedule, collectionScheduler } from "@/lib/collection";

const schedule = createSchedule({
  name: "YouTube 채널 일간 스냅샷",
  type: "channel",
  platform: "youtube",
  targetId: "UC_xxxxx",
  frequency: "daily",
  connectorPreference: "mock", // 개발: mock, 운영: api
});

collectionScheduler.addSchedule(schedule);
```

## 수동 실행

```typescript
import { collectChannel } from "@/lib/collection";

// devMode=true: Mock 커넥터 사용
const result = await collectChannel("youtube", "UC_xxxxx", true);
```

## 작업 큐

```typescript
import { createJob, jobQueue, jobWorker } from "@/lib/collection";

// 작업 생성 & 큐 등록
const job = createJob("content", "youtube", target);
jobQueue.enqueue(job);

// 워커로 처리
const result = await jobWorker.processNext();

// 또는 전체 큐 처리
const results = await jobWorker.processAll();
```

## 재시도 정책

| 정책          | 설명                                      |
| ------------- | ----------------------------------------- |
| `none`        | 재시도 안 함                              |
| `linear`      | 고정 간격으로 재시도                      |
| `exponential` | 점진적으로 간격 증가 (1s → 2s → 4s → ...) |

최대 재시도 횟수 초과 시 Dead Letter로 이동합니다.

## 운영 환경 확장 포인트

현재 인메모리 구현을 다음으로 교체할 수 있습니다:

1. **큐**: Redis + BullMQ
2. **스케줄러**: node-cron 또는 외부 cron 서비스
3. **워커**: 별도 프로세스 또는 서버리스 함수
4. **로그 저장**: DB (PostgreSQL, MongoDB 등)
5. **결과 저장**: DB + Object Storage (S3 등)

교체 시 인터페이스는 동일하게 유지하고, 구현체만 교체하면 됩니다.

## 권장 수집 시나리오

```
매일 새벽 3시     → 전체 채널 스냅샷 수집
6시간마다        → 등록 채널의 콘텐츠 목록 수집
1시간마다        → 키워드 멘션 수집
댓글 분석 전     → 해당 콘텐츠의 댓글 수집 실행
수동             → 경쟁 채널 분석 시 1회 수집
```
