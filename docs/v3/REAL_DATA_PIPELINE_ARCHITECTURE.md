# REAL_DATA_PIPELINE_ARCHITECTURE — 실데이터 수집/정제/저장 파이프라인

> 작성일: 2026-03-10
> 상태: 확정 (API 키/크레덴셜은 추후 검증 필요)
> 원칙: 공식 API 우선. Mock/Hardcoded 금지. 합법적 공개 범위만 수집.

---

## 1. 파이프라인 전체 구조

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌────────────┐
│  Scheduler  │────▶│   Collector  │────▶│  Normalizer  │────▶│   Writer   │
│ (BullMQ)    │     │  (API/공개)  │     │  (정제/변환) │     │ (Prisma)   │
└─────────────┘     └──────────────┘     └──────────────┘     └────────────┘
      │                    │                    │                    │
      │                    ▼                    │                    ▼
      │             ┌──────────┐                │             ┌──────────┐
      │             │  Retry   │                │             │ AI Enrich│
      │             │  Queue   │                │             │ (분석)   │
      │             └──────────┘                │             └──────────┘
      │                                         │
      ▼                                         ▼
┌──────────────┐                         ┌──────────────┐
│ Rate Limiter │                         │ Error Logger  │
│ (Redis)      │                         │ (ScheduledJob)│
└──────────────┘                         └──────────────┘
```

---

## 2. 데이터 소스별 수집 전략

### 2.1 YouTube — API 우선 ✅

| 항목           | 방법                                             | 상태 |
| -------------- | ------------------------------------------------ | ---- |
| 채널 정보      | YouTube Data API v3 `channels.list`              | 확정 |
| 콘텐츠 목록    | YouTube Data API v3 `search.list`, `videos.list` | 확정 |
| 콘텐츠 지표    | YouTube Data API v3 `videos.list` (statistics)   | 확정 |
| 댓글           | YouTube Data API v3 `commentThreads.list`        | 확정 |
| 채널 통계 이력 | 일별 스냅샷으로 자체 축적                        | 확정 |

**API 할당량**: 10,000 units/day (기본). 채널 수집 ~100 units, 콘텐츠 목록 ~100 units, 댓글 ~100 units per page.

**제한 사항**:

- 경쟁 채널의 상세 analytics 접근 불가 (공개 통계만)
- 댓글 작성자의 구독자 수 등 비공개 데이터 접근 불가

### 2.2 Instagram — API 우선 ✅

| 항목            | 방법                                       | 상태                   |
| --------------- | ------------------------------------------ | ---------------------- |
| 비즈니스 프로필 | Instagram Graph API `/{user-id}`           | 확정                   |
| 미디어 목록     | Instagram Graph API `/{user-id}/media`     | 확정                   |
| 미디어 지표     | Instagram Graph API `/{media-id}/insights` | 확정 (비즈니스 계정만) |
| 댓글            | Instagram Graph API `/{media-id}/comments` | 확정                   |
| 해시태그 검색   | Instagram Graph API `ig_hashtag_search`    | 확정 (제한적)          |
| 멘션            | Instagram Graph API `/{user-id}/tags`      | 확정                   |

**제한 사항**:

- 개인 계정 데이터 접근 불가 (비즈니스/크리에이터 계정만)
- 경쟁 채널의 insights 접근 불가 (공개 데이터만: 팔로워, 게시물 수 등)
- 해시태그 검색: 최근 24시간, 상위 미디어만

### 2.3 TikTok — API 우선 ✅

| 항목        | 방법                                         | 상태                      |
| ----------- | -------------------------------------------- | ------------------------- |
| 사용자 정보 | TikTok Research API / Display API            | 가설 (API 접근 승인 필요) |
| 비디오 목록 | TikTok Research API `video/query`            | 가설                      |
| 비디오 지표 | TikTok Research API (조회수, 좋아요, 댓글수) | 가설                      |
| 댓글        | TikTok Research API `comment/list`           | 가설                      |

**제한 사항**:

- Research API 접근은 사전 승인 필요 (비즈니스 목적)
- Display API는 사용자 본인 데이터만 접근 가능
- 경쟁 채널 데이터: Research API 승인 범위 내에서만
- **추후 검증 필요**: API 승인 조건, 할당량, 비용

### 2.4 X (Twitter) — API 우선 ✅

| 항목        | 방법                            | 상태                 |
| ----------- | ------------------------------- | -------------------- |
| 사용자 정보 | X API v2 `users/by/username`    | 확정                 |
| 트윗 목록   | X API v2 `users/{id}/tweets`    | 확정                 |
| 트윗 지표   | X API v2 (public_metrics)       | 확정                 |
| 멘션/검색   | X API v2 `tweets/search/recent` | 확정 (Basic: 제한적) |

**제한 사항**:

- Free tier: 읽기 1,500 tweets/month
- Basic tier ($100/month): 10,000 tweets/month
- Pro tier ($5,000/month): 1M tweets/month
- **비용 대비 효과 검토 필요**

### 2.5 검색 인텐트 데이터 — 혼합 전략

| 항목         | 방법                                      | 상태                             |
| ------------ | ----------------------------------------- | -------------------------------- |
| 검색량       | Google Ads API (Keyword Planner)          | 확정 (광고 계정 필요)            |
| 자동완성     | Google Autocomplete (공개)                | 가설 (robots.txt 준수 확인 필요) |
| 연관 검색    | Google "People Also Ask" (공개 검색 결과) | 가설                             |
| Naver 키워드 | Naver Search Advisor API                  | 확정                             |
| 트렌드       | Google Trends (공식 비공개 API 없음)      | 가설 (pytrends 등 비공식)        |

**주의**: 자동완성/연관검색은 공개 검색 결과이나, 대량 수집 시 rate limiting 고려. robots.txt 및 서비스 약관 준수 필수.

### 2.6 AI 검색 답변 (GEO/AEO) — 공개 접근

| 항목               | 방법                                        | 상태                                           |
| ------------------ | ------------------------------------------- | ---------------------------------------------- |
| Google AI Overview | Google Custom Search API + AI Overview 확인 | 가설 (API에서 AI Overview 포함 여부 확인 필요) |
| Perplexity         | Perplexity API (pplx-api)                   | 확정 (유료 API 있음)                           |
| Bing Copilot       | Bing Search API v7                          | 가설 (Copilot 답변 포함 여부 확인 필요)        |
| ChatGPT Search     | OpenAI API (검색 플러그인)                  | 가설 (공식 API 미제공 — 추후 검증)             |

**중요**: 각 엔진의 AI 답변을 프로그래매틱하게 수집하는 것이 공식 허용되는지 확인 필요. 허용되지 않는 경우 해당 엔진은 수동 입력 또는 향후 공식 API 제공 시 대응.

### 2.7 인플루언서 데이터 — API 기반

| 항목        | 방법                            | 상태                 |
| ----------- | ------------------------------- | -------------------- |
| 프로필 정보 | 각 플랫폼 API (위 2.1~2.4)      | 채널 데이터에서 파생 |
| 점수/분류   | 내부 AI 분석 (수집 데이터 기반) | 확정                 |
| 연락처      | 사용자 직접 입력                | 확정                 |

---

## 3. 수집 파이프라인 상세

### 3.1 스케줄링 (BullMQ)

```typescript
// Job Types & 스케줄
const SYNC_SCHEDULES = {
  CHANNEL_SYNC: "0 */6 * * *", // 6시간마다
  CONTENT_SYNC: "0 */4 * * *", // 4시간마다
  COMMENT_SYNC: "0 */12 * * *", // 12시간마다
  KEYWORD_TRACK: "0 6 * * *", // 매일 06:00
  COMPETITOR_SYNC: "0 */12 * * *", // 12시간마다
  AEO_CRAWL: "0 8 * * *", // 매일 08:00
  CAMPAIGN_METRIC_SYNC: "0 */6 * * *", // 6시간마다 (활성 캠페인만)
  COMMENT_ANALYZE: "*/30 * * * *", // 30분마다 (미분석 댓글)
  INTENT_ANALYZE: "on-demand", // 사용자 요청 시
  USAGE_AGGREGATE: "0 0 * * *", // 매일 자정
};
```

### 3.2 수집 흐름

```
1. ScheduledJob 트리거 (또는 수동 요청)
   └→ BullMQ에 Job 생성

2. Worker가 Job 수신
   └→ Rate Limiter 확인 (Redis)
   └→ API 호출 (플랫폼별 커넥터)
   └→ 응답 수신

3. 정규화 (Normalizer)
   └→ 플랫폼별 응답 → 통합 스키마 변환
   └→ 데이터 검증 (필수 필드, 타입, 범위)
   └→ 중복 제거 (platformContentId unique)

4. 저장 (Writer)
   └→ Prisma upsert (unique 기준)
   └→ 일별 지표 → ChannelSnapshot/ContentMetricDaily upsert
   └→ ScheduledJob.lastRunAt 업데이트

5. AI Enrichment (비동기)
   └→ 새 댓글 → CommentAnalysis 생성 큐
   └→ 새 멘션 → sentiment/topics 분석 큐
```

### 3.3 에러 처리 & 재시도

```
에러 유형별 처리:

[Rate Limit] → 지수 백오프 (1분 → 2분 → 4분 → 최대 30분)
              → Redis에 cooldown 기록
              → ScheduledJob.retryCount++

[Auth Error] → ChannelConnection.status = EXPIRED
             → 사용자에게 재인증 요청 알림
             → Channel.status = ERROR

[API Error]  → ScheduledJob.lastError 기록
             → 3회 실패 시 Job 일시정지 (PAUSED)
             → 관리자 알림

[Network]    → 즉시 재시도 (최대 3회)
             → 실패 시 다음 스케줄로 이월

[Data Error] → 검증 실패 로그 기록
             → 부분 저장 (유효한 데이터만)
             → 경고 알림
```

### 3.4 Rate Limiting 전략

```typescript
// Redis 기반 슬라이딩 윈도우
const RATE_LIMITS = {
  youtube: { requests: 100, windowSec: 60 }, // 100 req/min
  instagram: { requests: 200, windowSec: 3600 }, // 200 req/hr
  tiktok: { requests: 100, windowSec: 60 }, // 추후 확정
  x: { requests: 300, windowSec: 900 }, // 300 req/15min
  perplexity: { requests: 50, windowSec: 60 }, // 50 req/min
};
```

---

## 4. 정제/정규화 구조

### 4.1 플랫폼별 → 통합 스키마 매핑

```typescript
// 예: YouTube Video → Content 변환
function normalizeYouTubeVideo(raw: YouTubeVideo): ContentInput {
  return {
    platform: "YOUTUBE",
    platformContentId: raw.id,
    type:
      raw.snippet.liveBroadcastContent !== "none"
        ? "LIVE"
        : raw.contentDetails.duration.startsWith("PT") &&
            parseDuration(raw.contentDetails.duration) < 60
          ? "SHORT"
          : "VIDEO",
    title: raw.snippet.title,
    description: raw.snippet.description,
    thumbnailUrl: raw.snippet.thumbnails?.high?.url,
    url: `https://youtube.com/watch?v=${raw.id}`,
    publishedAt: new Date(raw.snippet.publishedAt),
    duration: parseDuration(raw.contentDetails.duration),
    viewCount: BigInt(raw.statistics.viewCount || 0),
    likeCount: parseInt(raw.statistics.likeCount || "0"),
    commentCount: parseInt(raw.statistics.commentCount || "0"),
    engagementRate: calculateEngagement(raw.statistics, subscriberCount),
  };
}
```

### 4.2 데이터 검증 규칙

| 필드              | 검증             | 실패 시                   |
| ----------------- | ---------------- | ------------------------- |
| platformContentId | 비어있으면 안 됨 | 레코드 스킵               |
| title             | 비어있으면 안 됨 | 빈 문자열 → "(제목 없음)" |
| viewCount         | 0 이상 정수      | 음수 → 0                  |
| publishedAt       | 유효한 날짜      | 파싱 실패 → now()         |
| url               | 유효한 URL 형식  | 형식 오류 → null          |
| engagementRate    | 0~100 범위       | 범위 초과 → 클램핑        |

---

## 5. 저장 전략

### 5.1 Upsert 기준

| 엔티티             | Upsert Key                                 | 동작                       |
| ------------------ | ------------------------------------------ | -------------------------- |
| Channel            | `[projectId, platform, platformChannelId]` | 메타 업데이트, 카운트 갱신 |
| Content            | `[channelId, platformContentId]`           | 지표 갱신                  |
| Comment            | `[contentId, platformCommentId]`           | 중복 무시 (댓글은 불변)    |
| ChannelSnapshot    | `[channelId, date]`                        | 오늘자 스냅샷 upsert       |
| ContentMetricDaily | `[contentId, date]`                        | 오늘자 지표 upsert         |
| RawSocialMention   | `[projectId, platform, platformPostId]`    | 중복 무시                  |
| AeoSnapshot        | `[keywordId, date, engine]`                | 오늘자 스냅샷 upsert       |

### 5.2 대량 데이터 처리

```
RawSocialMention:
  - 배치 삽입 (createMany, skipDuplicates)
  - 월별 파티셔닝 고려 (향후)
  - 90일 이전 데이터 아카이브 정책

Comment:
  - 배치 삽입 (createMany, skipDuplicates)
  - 페이지네이션으로 점진적 수집

ChannelSnapshot/ContentMetricDaily:
  - 일별 1회 upsert
  - 1년 이상 데이터 롤업 (주간/월간 집계 → 원본 삭제) 고려
```

---

## 6. Mock/Dev Fallback 원칙

### 6.1 허용되는 경우

| 상황                      | Fallback 동작                                                       |
| ------------------------- | ------------------------------------------------------------------- |
| API 키 미설정 (개발 환경) | 빈 데이터 반환 + 경고 로그                                          |
| API 응답 실패 (네트워크)  | 마지막 성공 데이터 캐시 표시 + 재시도 스케줄                        |
| API 할당량 초과           | 큐에 적재, 다음 리셋까지 대기                                       |
| 테스트 환경               | seed 스크립트로 테스트 데이터 생성 (DB seed, 코드 내 하드코딩 아님) |

### 6.2 절대 금지

- 코드 내 하드코딩된 채널/콘텐츠/댓글 데이터
- API 없이 UI만 보여주는 가짜 대시보드
- 실제 수집 없이 더미 차트 렌더링
- 테스트 데이터를 프로덕션 환경에 포함

### 6.3 Dev Mode 구현

```typescript
// 환경 변수 기반
const isDev = process.env.NODE_ENV === "development";
const hasApiKey = !!process.env.YOUTUBE_API_KEY;

if (!hasApiKey) {
  logger.warn("[YouTube] API key not set. Skipping sync.");
  return { skipped: true, reason: "API_KEY_MISSING" };
}
```

---

## 7. 파이프라인 모니터링

| 지표            | 수집 방법               | 임계값          |
| --------------- | ----------------------- | --------------- |
| 수집 성공률     | ScheduledJob 상태 집계  | < 90% → 경고    |
| 평균 수집 시간  | Job 시작~완료 시간      | > 5분 → 경고    |
| API 할당량 잔여 | API 응답 헤더           | < 20% → 경고    |
| 큐 적체         | BullMQ waiting count    | > 100 → 경고    |
| 에러 연속 횟수  | ScheduledJob.retryCount | > 3 → 일시정지  |
| 데이터 신선도   | Channel.lastSyncedAt    | > 24시간 → 경고 |

---

## 8. 기술 스택

| 컴포넌트       | 기술                          | 패키지            |
| -------------- | ----------------------------- | ----------------- |
| Job Queue      | BullMQ                        | `packages/queue`  |
| Rate Limiter   | Redis (ioredis)               | `packages/queue`  |
| API 클라이언트 | Platform-specific SDK + fetch | `packages/social` |
| ORM            | Prisma                        | `packages/db`     |
| AI 분석        | OpenAI / Claude API           | `packages/ai`     |
| 스케줄러       | BullMQ Repeatable Jobs        | `packages/queue`  |
| 로깅           | Pino / Winston                | 추후 결정         |

---

## 9. 수집 우선순위 (구현 순서)

| 우선순위 | 대상                               | 이유                                     |
| -------- | ---------------------------------- | ---------------------------------------- |
| P0       | YouTube Channel/Content/Comment    | 가장 풍부한 공식 API, 핵심 유저 시나리오 |
| P0       | ChannelSnapshot/ContentMetricDaily | 일별 추적 — 가치의 핵심                  |
| P1       | Instagram Graph API                | 두 번째 핵심 플랫폼                      |
| P1       | Comment → CommentAnalysis (AI)     | 댓글 분석 — 3 Path 중 2개에서 필수       |
| P2       | Keyword → KeywordMetricDaily       | 리스닝 시작형 지원                       |
| P2       | RawSocialMention                   | Data Explorer 지원                       |
| P3       | X API                              | 플랫폼 확장                              |
| P3       | TikTok Research API                | API 승인 후                              |
| P4       | AEO (Perplexity API)               | GEO/AEO 모듈                             |
| P4       | 검색 인텐트 (Google Ads API)       | Intent 모듈                              |
| P5       | Campaign Metric Sync               | Execute/Measure 모듈                     |
