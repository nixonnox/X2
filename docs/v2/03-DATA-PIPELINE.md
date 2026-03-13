# X2 v2 — Real Data Pipeline Architecture

> 작성일: 2026-03-10
> 상태: Draft

---

## 0. 불변 원칙

1. **공식 API 우선**: 모든 플랫폼 데이터는 공식 API를 1순위로 사용
2. **웹 수집 시 합법 범위 준수**: robots.txt 준수, 공개 데이터만, rate limit 존중
3. **Mock 데이터 금지**: 네트워크 실패 시 Fallback 용도 외에 hardcoded/mock 데이터 사용 불가
4. **실패 투명성**: 데이터 없으면 "데이터 없음" 상태를 명시적으로 표시

---

## 1. 파이프라인 전체 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                     Scheduler (BullMQ)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Channel  │  │ Content  │  │ Comment  │  │ AEO Crawl     │  │
│  │ Sync     │  │ Sync     │  │ Sync     │  │ Snapshot      │  │
│  │ (일 1회) │  │ (일 1회) │  │ (4h마다) │  │ (일 1회)      │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │
│       │              │              │                │          │
└───────┼──────────────┼──────────────┼────────────────┼──────────┘
        ▼              ▼              ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Collector Layer                          │
│                                                                 │
│  ┌─────────────────────────────────────┐  ┌──────────────────┐ │
│  │      Social Provider (packages/social)│  │  AEO Crawler    │ │
│  │  ┌─────────┐ ┌───────┐ ┌────────┐  │  │  ┌────────────┐  │ │
│  │  │YouTube  │ │Insta  │ │TikTok  │  │  │  │Google AI   │  │ │
│  │  │API v3   │ │Graph  │ │Display │  │  │  │Overviews   │  │ │
│  │  └─────────┘ └───────┘ └────────┘  │  │  ├────────────┤  │ │
│  │  ┌─────────┐                       │  │  │Perplexity  │  │ │
│  │  │X API v2 │                       │  │  ├────────────┤  │ │
│  │  └─────────┘                       │  │  │Bing Copilot│  │ │
│  └──────────────────┬──────────────────┘  │  └────────────┘  │ │
│                     │                     └────────┬─────────┘ │
└─────────────────────┼──────────────────────────────┼───────────┘
                      ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Transform & Enrich                            │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ Normalize   │  │ AI Enrich    │  │ Aggregation         │   │
│  │ (공통 스키마│  │ (감성/토픽/  │  │ (일별 스냅샷 생성)  │   │
│  │  변환)      │  │  분류)       │  │                     │   │
│  └──────┬──────┘  └──────┬───────┘  └─────────┬───────────┘   │
│         │                │                     │               │
└─────────┼────────────────┼─────────────────────┼───────────────┘
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL (Prisma)                           │
│  Channel │ Snapshot │ Content │ Comment │ AeoSnapshot │ Intent  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Social Data Pipeline (모듈 2: Social Intelligence)

### 2.1 Channel Sync Job

```
트리거: 일 1회 (UTC 03:00) + 채널 등록 직후
입력:   Channel.id, Channel.platform, Channel.platformChannelId
출력:   ChannelSnapshot 레코드

처리 흐름:
  1. Channel 레코드 상태 → SYNCING
  2. SocialProvider.getChannelInfo(platformChannelId) 호출
     ├─ 성공 → 채널 메타 업데이트 (name, thumbnailUrl, description)
     ├─ Rate Limit → 재시도 큐 (exponential backoff)
     └─ 실패 → Channel.lastSyncStatus = FAILED, 에러 로그
  3. 결과로 ChannelSnapshot 생성
     - followerCount, contentCount, totalViewCount
     - 전일 스냅샷과 비교 → followerGrowth, followerGrowthRate 계산
  4. Channel.lastSyncAt = now(), status = ACTIVE
```

### 2.2 Content Sync Job

```
트리거: 일 1회 (Channel Sync 완료 후) + 수동 트리거
입력:   Channel.id
출력:   Content 레코드 (upsert), ContentMetricDaily 레코드

처리 흐름:
  1. SocialProvider.getContents(channelId, { limit: 50, sort: 'recent' })
  2. 각 콘텐츠에 대해:
     a. Content upsert (platformContentId 기준)
     b. ContentMetricDaily 생성 (오늘 날짜)
        - viewCount, likeCount, commentCount, engagementRate
     c. 전일 대비 증감 계산
  3. Content 테이블의 비정규화 필드 업데이트 (최신 지표)
```

### 2.3 Comment Sync Job

```
트리거: 4시간마다 + 수동 트리거
입력:   Content.id (최근 7일 내 콘텐츠 우선)
출력:   Comment 레코드, CommentAnalysis 큐 등록

처리 흐름:
  1. 최근 콘텐츠 선택 (publishedAt > 7일 전, commentCount 상위)
  2. SocialProvider.getComments(contentId, { since: lastSyncAt })
  3. Comment upsert (platformCommentId 기준)
  4. 새 댓글 → AI 분석 큐 등록 (batch)
     - 감성 분석
     - 토픽 분류
     - FAQ 감지
     - 리스크 감지
```

---

## 3. AI Enrichment Pipeline (모듈 3: Comment Intelligence)

### 3.1 Comment Analysis Batch

```
트리거: Comment Sync 완료 후 / 댓글 N개 축적 시
배치 크기: 50~100건

처리 흐름:
  1. 미분석 댓글 조회 (CommentAnalysis 없는 Comment)
  2. 배치 구성 (50건 단위)
  3. AI Provider 호출 (structured output)
     프롬프트:
       - 댓글 텍스트 목록 전달
       - 각 댓글에 대해: sentiment, sentimentScore, topics, isQuestion,
         questionType, isSpam, isRisk, riskLevel 반환
     모델 선택:
       - fast tier: 일반 감성 분석 (haiku)
       - standard tier: 토픽+FAQ+리스크 (sonnet)
  4. CommentAnalysis 레코드 생성
  5. isRisk=true + riskLevel>=HIGH → 즉시 알림 트리거
  6. 토큰 사용량 → UsageMetric 기록
```

### 3.2 FAQ Extraction (주 1회)

```
트리거: 주 1회 (월요일 06:00 UTC)
입력:   최근 7일 댓글 중 isQuestion=true

처리 흐름:
  1. 질문형 댓글 수집 (isQuestion=true, 최근 7일)
  2. AI Provider 호출 (premium tier)
     - 질문 클러스터링
     - 대표 FAQ 추출 (최대 20개)
     - 각 FAQ에 대한 답변 초안 생성
  3. InsightReport (type: FAQ_EXTRACTION) 생성
  4. InsightAction 생성 (COMMENT_REPLY 타입)
```

---

## 4. Search Intent Pipeline (모듈 1)

### 4.1 Intent Analysis Job

```
트리거: 사용자 요청 (온디맨드)
입력:   seed keyword, locale, maxDepth, maxKeywords

처리 흐름:
  1. IntentQuery 생성 (status: QUEUED)
  2. BullMQ Job 등록 → Worker 처리

  Worker 단계:
  ① Keyword Expansion (status: EXPANDING)
     - Google Autocomplete/Related Searches
     - DataForSEO API (있을 경우)
     - depth 단계별 확장 (BFS)
     → 중간 결과 SSE 전송

  ② Volume Collection (status: COLLECTING_VOLUME)
     - Google Trends API / DataForSEO
     - 월별 검색량 12개월
     → trend 방향 계산 (RISING/STABLE/DECLINING)

  ③ Social Volume (status: COLLECTING_SOCIAL)
     - 각 키워드로 YouTube/Instagram/TikTok 검색
     - 콘텐츠 수, 평균 조회수, 최근 콘텐츠 신선도
     → 검색량 vs 소셜 콘텐츠 갭 계산

  ④ Intent Classification (status: CLASSIFYING)
     - LLM 호출 (batch, structured output)
     - 각 키워드 → intentCategory + subIntent + confidence
     → gapType 결정 (BLUE_OCEAN / OPPORTUNITY / COMPETITIVE / SATURATED)

  ⑤ Graph Building (status: BUILDING_GRAPH)
     - 키워드 간 관계 그래프 생성
     - 클러스터링 (의도 유형별)
     - 검색 여정 매핑 (awareness → action)

  3. 결과 저장
     - IntentQuery.resultSummary, resultGraph, resultKeywords
     - IntentKeywordResult 레코드 (개별 키워드)
  4. IntentQuery.status = COMPLETED
```

### 4.2 캐싱 전략

```
키워드별 캐시 키: `intent:${locale}:${keyword}`
TTL: 24시간 (검색량 데이터는 일 단위 변동)
저장소: Redis (실시간 캐시) + DB (영구 보관)

동일 키워드 재분석 요청 시:
  - 24h 이내 → 캐시 반환
  - 24h 초과 → 재분석 (delta만 업데이트)
```

---

## 5. GEO/AEO Pipeline (모듈 4)

### 5.1 AI Answer Snapshot Job

```
트리거: 일 1회 (UTC 05:00)
입력:   AeoKeyword (status: ACTIVE)

처리 흐름:
  각 AeoKeyword에 대해, 각 AeoEngine에 대해:

  ① Query 구성
     - keyword + locale → 검색 쿼리 생성
     - 예: "best CRM software for small business"

  ② AI 검색엔진 조회
     ┌─ Google AI Overviews ─────────────────────────────┐
     │  방법: SerpAPI / DataForSEO (AI Overview 추출)    │
     │  추출: AI 생성 답변, 인용 소스 URL/제목           │
     └──────────────────────────────────────────────────┘
     ┌─ Perplexity ──────────────────────────────────────┐
     │  방법: Perplexity API (pplx-api)                  │
     │  추출: 답변 텍스트, citations 배열                │
     └──────────────────────────────────────────────────┘
     ┌─ Bing Copilot ───────────────────────────────────┐
     │  방법: Bing Search API (chat mode)                │
     │  추출: 답변 텍스트, 인용 링크                     │
     └──────────────────────────────────────────────────┘

  ③ Citation 분석
     - 인용 소스 목록에서 targetBrand 도메인 매칭
     - 인용 순위 기록 (1=최상위)
     - 경쟁 브랜드 언급 여부 체크

  ④ 가시성 점수 계산
     visibilityScore = weighted average of:
       - 브랜드 언급 여부 (40%)
       - 인용 순위 (30%)  → 1위=100, 2위=80, 3위=60...
       - 인용 횟수 (20%)
       - 답변 내 비중 (10%)

  ⑤ AeoSnapshot 저장
     - engine, aiResponse(요약), citedSources
     - brandMentioned, brandCitedRank
     - competitorMentions, visibilityScore

  ⑥ 변동 감지
     - 전일 대비 visibilityScore 변동 > 20% → 알림
     - 브랜드 인용 사라짐 → RISK 알림
     - 경쟁사 신규 인용 → 정보 알림
```

### 5.2 Citation 추적 스키마 상세

```json
// AeoSnapshot.citedSources 예시
[
  {
    "url": "https://example.com/blog/crm-guide",
    "title": "Best CRM Software 2026 Guide",
    "domain": "example.com",
    "rank": 1,
    "isBrand": true,
    "snippet": "According to Example's analysis..."
  },
  {
    "url": "https://competitor.com/review",
    "title": "CRM Comparison",
    "domain": "competitor.com",
    "rank": 2,
    "isBrand": false,
    "isCompetitor": true,
    "competitorBrand": "CompetitorCo"
  }
]
```

---

## 6. Action Automation Pipeline (모듈 5)

### 6.1 Insight → Action 생성

```
트리거: InsightReport 생성 완료 시

처리 흐름:
  1. InsightReport 내용 분석 (AI)
  2. 구체적 액션 아이템 추출
     예시:
       - Search Intent 갭 → "이 키워드로 YouTube 영상 제작 권장"
       - 감성 악화 → "부정 댓글 급증. 대응 메시지 작성 필요"
       - AEO 인용 하락 → "블로그 포스트 업데이트로 인용 복구"
  3. InsightAction 생성
     - actionType, priority, sourceModule
     - dueDate 자동 설정 (priority에 따라)
  4. 자동화 규칙 매칭
     - AutomationRule.triggerType 체크
     - 매칭 시 자동 실행 (알림, 리포트 등)
```

### 6.2 AutomationRule 실행

```
예시 규칙:

Rule: "감성 급변 알림"
  trigger: SENTIMENT_SHIFT
  config: { threshold: -0.3, window: "24h", channel: "all" }
  action: SEND_NOTIFICATION
  config: { channel: "slack", template: "sentiment_alert" }

Rule: "주간 리포트 자동 생성"
  trigger: SCHEDULE
  config: { cron: "0 9 * * 1", timezone: "Asia/Seoul" }
  action: GENERATE_REPORT
  config: { type: "WEEKLY_REPORT", channels: "all" }
```

---

## 7. Rate Limiting & Quota 관리

### 플랫폼별 API 제한

| 플랫폼              | 일일 할당량         | 요청 간격 | 관리 방식                      |
| ------------------- | ------------------- | --------- | ------------------------------ |
| YouTube Data API v3 | 10,000 units        | -         | 쿼터 기반 (list=1, search=100) |
| Instagram Graph API | 200 calls/user/hour | 500ms     | 토큰 버킷                      |
| TikTok Display API  | 1,000/day           | 1s        | 고정 간격                      |
| X API v2 (Basic)    | 100 reads/15min     | -         | 윈도우 기반                    |

### Quota Tracker

```typescript
interface QuotaTracker {
  // 현재 사용량 조회
  getUsage(platform: string, date: Date): Promise<QuotaUsage>;
  // 호출 전 가용 여부 확인
  canCall(platform: string, cost: number): Promise<boolean>;
  // 호출 후 사용량 기록
  recordCall(platform: string, cost: number): Promise<void>;
  // 할당량 초과 시 다음 가용 시각
  getNextAvailable(platform: string): Promise<Date>;
}
```

---

## 8. 에러 처리 & 재시도 전략

```
┌─ Error Classification ─────────────────────────┐
│                                                 │
│  Transient (재시도 가능)                         │
│  ├─ 429 Rate Limited → exponential backoff     │
│  ├─ 503 Service Unavailable → 5분 후 재시도    │
│  ├─ Network Timeout → 즉시 재시도 (최대 3회)   │
│  └─ 500 Server Error → 10분 후 재시도          │
│                                                 │
│  Permanent (재시도 불가)                         │
│  ├─ 401 Unauthorized → API 키 만료 알림        │
│  ├─ 403 Forbidden → 권한 부족 알림             │
│  ├─ 404 Not Found → 채널/콘텐츠 삭제 처리      │
│  └─ 400 Bad Request → 로그 + 개발자 알림       │
│                                                 │
│  재시도 정책:                                    │
│  - 최대 3회 재시도                               │
│  - Exponential backoff: 1s, 4s, 16s             │
│  - Dead letter queue: 3회 실패 → DLQ 이동       │
│  - DLQ 모니터링: 관리자 대시보드에 표시          │
└─────────────────────────────────────────────────┘
```

---

## 9. 데이터 흐름 요약 (시간축)

```
[채널 등록 직후]
  Channel Sync → ChannelSnapshot (첫 스냅샷)
  Content Sync → Content (최근 50개)
  Comment Sync → Comment (최근 콘텐츠)
  Comment AI   → CommentAnalysis (감성/토픽)

[매일 03:00 UTC]
  Channel Sync (모든 활성 채널)
  → Content Sync
  → ChannelSnapshot (일별)
  → ContentMetricDaily

[매일 05:00 UTC]
  AEO Snapshot (모든 활성 키워드)
  → 가시성 점수 계산
  → 변동 알림

[4시간마다]
  Comment Sync (최근 콘텐츠)
  → Comment AI batch
  → 리스크 알림 (즉시)

[주 1회 (월요일)]
  FAQ Extraction
  주간 InsightReport 생성
  → InsightAction 생성

[월 1회 (1일)]
  월간 InsightReport 생성
  → 경쟁 벤치마크 포함
  → 월간 액션 아이템

[온디맨드]
  Search Intent 분석 (사용자 요청)
  수동 Sync (사용자 트리거)
```
