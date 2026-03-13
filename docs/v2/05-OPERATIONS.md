# X2 v2 — Operations & Observability

> 작성일: 2026-03-10
> 상태: Draft

---

## 1. 운영 관제 구조

```
┌──────────────────────────────────────────────────────────────┐
│                     Admin Dashboard                           │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │ Pipeline  │  │ AI Cost   │  │ Platform  │  │ System   │ │
│  │ Health    │  │ Monitor   │  │ Status    │  │ Metrics  │ │
│  └───────────┘  └───────────┘  └───────────┘  └──────────┘ │
└──────────────────────────────────────────────────────────────┘
        │                 │               │              │
        ▼                 ▼               ▼              ▼
┌──────────────┐  ┌──────────────┐ ┌───────────┐  ┌──────────┐
│ BullMQ       │  │ AI Provider  │ │ Social    │  │ Postgres │
│ Dashboard    │  │ Billing      │ │ API       │  │ Metrics  │
│ (Bull Board) │  │ Dashboard    │ │ Health    │  │          │
└──────────────┘  └──────────────┘ └───────────┘  └──────────┘
```

---

## 2. 파이프라인 헬스 모니터링

### 2.1 수집 현황 대시보드

| 지표            | 소스                            | 알림 조건       |
| --------------- | ------------------------------- | --------------- |
| 활성 채널 수    | Channel (status=ACTIVE)         | -               |
| 금일 수집 완료  | ChannelSnapshot (today)         | 완료율 < 90%    |
| 수집 실패 채널  | Channel (lastSyncStatus=FAILED) | 실패 > 3연속    |
| 평균 수집 시간  | ScheduledJob duration           | > 5분           |
| DLQ 대기        | BullMQ dead letter              | > 0             |
| Rate Limit 히트 | QuotaTracker                    | 일일 할당 > 80% |

### 2.2 Job 상태 추적

```typescript
interface JobHealthStatus {
  queue: string; // channel_sync, content_sync, comment_sync, aeo_crawl
  stats: {
    waiting: number;
    active: number;
    completed: number; // 최근 24h
    failed: number; // 최근 24h
    delayed: number;
  };
  avgDurationMs: number; // 최근 24h 평균
  failureRate: number; // 최근 24h 실패율
  lastCompleted: Date | null;
  lastFailed: Date | null;
  lastFailedReason: string | null;
}
```

### 2.3 수집 상태 API

```
GET /api/admin/pipeline/health

Response:
{
  "overall": "healthy" | "degraded" | "down",
  "queues": {
    "channel_sync": { ... JobHealthStatus },
    "content_sync": { ... },
    "comment_sync": { ... },
    "comment_analysis": { ... },
    "aeo_crawl": { ... },
    "intent_analysis": { ... }
  },
  "platforms": {
    "youtube": { "status": "ok", "quotaUsed": 4500, "quotaLimit": 10000 },
    "instagram": { "status": "ok", "quotaUsed": 80, "quotaLimit": 200 },
    "tiktok": { "status": "rate_limited", "nextAvailable": "2026-03-10T04:00:00Z" },
    "x": { "status": "ok", "quotaUsed": 30, "quotaLimit": 100 }
  },
  "database": {
    "status": "ok",
    "connectionPool": { "total": 20, "idle": 15, "active": 5 },
    "size": "1.2 GB"
  },
  "redis": {
    "status": "ok",
    "memoryUsed": "128 MB",
    "connectedClients": 5
  }
}
```

---

## 3. AI 비용 관제

### 3.1 비용 대시보드

| 지표               | 계산              | 알림 조건       |
| ------------------ | ----------------- | --------------- |
| 금일 총 비용 (USD) | AiCostRecord 합산 | > 일일 한도 80% |
| 금주 총 비용       | 주간 합산         | > 주간 예산     |
| 작업별 비용 비율   | 작업 유형별 분포  | 단일 작업 > 50% |
| 프로젝트별 비용    | 프로젝트별 분포   | -               |
| 평균 토큰/요청     | 요청당 평균       | 갑작스러운 증가 |
| Fallback 비율      | 대체 모델 사용률  | > 10%           |

### 3.2 비용 API

```
GET /api/admin/ai/costs?period=7d

Response:
{
  "period": "2026-03-03 ~ 2026-03-10",
  "totalCostUsd": 12.45,
  "totalTokens": 1_234_567,
  "totalRequests": 456,
  "byDay": [
    { "date": "2026-03-10", "costUsd": 2.10, "requests": 89 },
    ...
  ],
  "byTask": {
    "comment_sentiment": { "requests": 200, "tokens": 500_000, "costUsd": 1.50 },
    "intent_classification": { "requests": 50, "tokens": 200_000, "costUsd": 3.00 },
    "strategy_insight": { "requests": 5, "tokens": 100_000, "costUsd": 4.50 },
    ...
  },
  "byModel": {
    "claude-haiku-4-5": { "requests": 200, "costUsd": 1.50 },
    "claude-sonnet-4-6": { "requests": 50, "costUsd": 6.45 },
    "claude-opus-4-6": { "requests": 5, "costUsd": 4.50 }
  }
}
```

---

## 4. 플랫폼 상태 모니터링

### 4.1 API 키 상태 체크

```typescript
interface PlatformHealthCheck {
  platform: PlatformType;
  apiKeyConfigured: boolean; // API 키 설정 여부
  apiKeyValid: boolean; // API 키 유효성 (가벼운 호출로 확인)
  lastSuccessfulCall: Date | null;
  lastError: string | null;
  quotaStatus: {
    used: number;
    limit: number;
    resetsAt: Date;
  };
  features: {
    channelInfo: boolean; // 채널 정보 조회 가능
    contentList: boolean; // 콘텐츠 목록 조회 가능
    comments: boolean; // 댓글 조회 가능
    analytics: boolean; // 분석 데이터 조회 가능 (OAuth 필요)
  };
}
```

### 4.2 헬스 체크 스케줄

```
매 1시간:
  - 각 플랫폼 API 경량 헬스 체크 (1 quota unit 이하)
  - Redis 연결 확인
  - DB 연결 확인

매 6시간:
  - AI Provider 헬스 체크 (health endpoint)
  - 할당량 잔여 확인

이상 감지 시:
  - 관리자 이메일 알림
  - Slack 웹훅 (설정 시)
  - Admin 대시보드 배너
```

---

## 5. 알림 체계

### 5.1 알림 분류

| 레벨           | 대상   | 채널                 | 예시                              |
| -------------- | ------ | -------------------- | --------------------------------- |
| **CRITICAL**   | 관리자 | Email + Slack + 인앱 | DB 연결 실패, AI 전면 장애        |
| **WARNING**    | 관리자 | Slack + 인앱         | API 할당량 80%, 수집 실패율 > 10% |
| **INFO**       | 관리자 | 인앱                 | 일일 수집 완료, 비용 리포트       |
| **USER_ALERT** | 사용자 | Email + 인앱         | 리스크 댓글 감지, 지표 급변       |
| **USER_INFO**  | 사용자 | 인앱                 | 분석 완료, 새 인사이트            |

### 5.2 사용자 알림 시나리오

```
[즉시]
  - 댓글 리스크 감지 (riskLevel >= HIGH)
  - 채널 수집 실패 (3연속)

[일 1회 (오전 9시)]
  - 일일 KPI 요약 (변동 있을 때만)
  - 새 인사이트 카드 알림

[주 1회 (월요일)]
  - 주간 성과 요약
  - 액션 아이템 리마인더

[이벤트 기반]
  - Search Intent 분석 완료
  - 리포트 생성 완료
  - AEO 가시성 급변 (±20% 이상)
```

---

## 6. 데이터 보관 & 정리

### 보관 정책

| 데이터             | Free | Pro   | Business | 삭제 방식                |
| ------------------ | ---- | ----- | -------- | ------------------------ |
| ChannelSnapshot    | 30일 | 365일 | 1095일   | 일별 → 주간 집계 후 삭제 |
| ContentMetricDaily | 30일 | 365일 | 1095일   | 동일                     |
| Comment            | 30일 | 180일 | 365일    | Hard delete              |
| CommentAnalysis    | 30일 | 180일 | 365일    | Comment와 동시 삭제      |
| IntentQuery        | 30일 | 90일  | 365일    | Soft delete              |
| AeoSnapshot        | 30일 | 365일 | 1095일   | 일별 → 주간 집계 후 삭제 |
| AI 로그            | 7일  | 30일  | 90일     | Hard delete              |

### 집계 후 삭제 절차

```
1. 일별 데이터가 보관 기간 초과 시:
   - 주간 평균/합계/최대/최소로 집계
   - 집계 레코드 저장 (AggregatedSnapshot)
   - 원본 일별 레코드 삭제

2. 실행 시점: 매일 UTC 02:00 (수집 전)
3. 배치 크기: 1000건 단위
4. 로그: 삭제 건수 기록
```

---

## 7. 배포 & 인프라

### 7.1 운영 환경 구성

```
Production Stack:
  ┌─────────────────┐
  │ Vercel           │  ← Next.js App (SSR + API Routes)
  │ (Edge + Serverless)│
  └────────┬────────┘
           │
  ┌────────▼────────┐     ┌──────────────┐
  │ Supabase        │     │ Upstash Redis│
  │ (PostgreSQL)    │     │ (BullMQ)     │
  └─────────────────┘     └──────────────┘

  ┌─────────────────┐
  │ Worker Process  │  ← BullMQ Workers (별도 프로세스)
  │ (Fly.io/Railway)│     수집 + AI 분석 + AEO 크롤링
  └─────────────────┘
```

### 7.2 환경 변수 체크리스트

```
# 필수 (서비스 시작 불가)
DATABASE_URL          ← PostgreSQL 연결
AUTH_SECRET           ← Auth.js 암호화 키
AUTH_URL              ← 콜백 URL

# 필수 (핵심 기능)
REDIS_URL             ← BullMQ 큐
ANTHROPIC_API_KEY     ← AI 분석 (primary)

# 플랫폼 API (없으면 해당 플랫폼 비활성)
YOUTUBE_API_KEY
INSTAGRAM_ACCESS_TOKEN
TIKTOK_ACCESS_TOKEN
X_API_BEARER_TOKEN

# GEO/AEO (없으면 모듈 비활성)
SERPAPI_KEY            ← Google AI Overview 추출
PERPLEXITY_API_KEY     ← Perplexity 답변 조회

# 결제 (없으면 무료 전용)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET

# 선택
OPENAI_API_KEY         ← AI fallback
SLACK_WEBHOOK_URL      ← 관리자 알림
```

---

## 8. 모니터링 메트릭 요약

### 핵심 SLI (Service Level Indicators)

| 지표             | 목표    | 측정 방법                    |
| ---------------- | ------- | ---------------------------- |
| 수집 성공률      | > 95%   | 성공 채널 / 전체 활성 채널   |
| 수집 지연        | < 30분  | 스케줄 시각 vs 완료 시각     |
| AI 응답 시간     | < 10초  | API 호출 ~ 응답              |
| AI Fallback 비율 | < 5%    | fallback 호출 / 전체 AI 호출 |
| 페이지 응답 시간 | < 2초   | TTFB (서버 렌더링)           |
| 에러율           | < 1%    | 5xx 응답 / 전체 요청         |
| DB 쿼리 시간     | < 500ms | Prisma 쿼리 p95              |
