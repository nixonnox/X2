# X2 — Execution Loop Design

> 작성일: 2026-03-10
> 피처링형 실행-성과 재수집 루프 + 액션 자동화 상세 설계

---

## 0. 핵심 원칙

기존 v2는 **Insight → Action Item 생성**에서 멈췄다.
v2.1은 **Execute → Measure → Re-Discover**까지 루프를 닫는다.

```
기존 v2:   분석 → 인사이트 → 액션 아이템 (끝)
v2.1:      분석 → 인사이트 → 캠페인 실행 → 성과 측정 → 재분석 (순환)
```

---

## 1. Execute 도메인 모델

### 1.1 Campaign (캠페인)

캠페인 = 하나의 마케팅 목표를 달성하기 위한 실행 단위

```
Campaign
  ├─ id, projectId
  ├─ name                          "여름 선크림 런칭"
  ├─ objective                     "브랜드 인지도 확대"
  ├─ campaignType                  INFLUENCER | CONTENT | PAID | ORGANIC
  │
  ├─ status                        DRAFT → ACTIVE → PAUSED → COMPLETED → ARCHIVED
  │
  ├─ period
  │   ├─ startDate                 2026-04-01
  │   └─ endDate                   2026-04-30
  │
  ├─ budget
  │   ├─ totalBudget               5000000 (KRW)
  │   ├─ spentBudget               3200000 (실시간 집계)
  │   └─ currency                  KRW
  │
  ├─ kpiTargets (Json)
  │   ├─ targetReach               1000000
  │   ├─ targetEngagement          50000
  │   ├─ targetConversions         500
  │   └─ customKpis[]              [{name, target, unit}]
  │
  ├─ sourceInsightId               ← 어떤 인사이트에서 파생되었는가
  │
  ├── creators: CampaignCreator[]  ← 참여 인플루언서
  ├── contents: CampaignContent[]  ← 캠페인 콘텐츠
  ├── metrics: CampaignMetric[]    ← 일별 성과
  └── actions: InsightAction[]     ← 관련 액션 아이템
```

### 1.2 CampaignCreator (인플루언서 섭외)

```
CampaignCreator
  ├─ id, campaignId, influencerId
  │
  ├─ outreachStatus               PROPOSED → NEGOTIATING → CONTRACTED →
  │                                CREATING → PUBLISHED → COMPLETED → DECLINED
  │
  ├─ compensation
  │   ├─ type                      FIXED | REVENUE_SHARE | PRODUCT_GIFTING | HYBRID
  │   ├─ amount                    1500000
  │   └─ details                   "제품 협찬 + 고정 150만원"
  │
  ├─ deliverables (Json)
  │   ├─ contentCount              2
  │   ├─ contentType               ["YOUTUBE_VIDEO", "INSTAGRAM_REEL"]
  │   ├─ requirements              "제품 사용 장면 포함, 해시태그 #여름선크림"
  │   └─ deadline                  2026-04-15
  │
  ├─ contactLog (Json[])           ← 연락 이력
  │   └─ [{date, channel, message, response}]
  │
  ├─ contractUrl                   ← 계약서 파일 URL
  │
  └─ performanceSummary (Json)     ← Measure 스테이지에서 채워짐
      ├─ totalReach
      ├─ totalEngagement
      ├─ costPerView
      └─ costPerEngagement
```

### 1.3 CampaignContent (캠페인 콘텐츠 트래킹)

```
CampaignContent
  ├─ id, campaignId, campaignCreatorId
  │
  ├─ contentId                     ← Content 테이블 연결 (수집된 실데이터)
  ├─ platformContentUrl            ← 원본 URL (수집 전에도 입력 가능)
  ├─ platform
  │
  ├─ status                        PLANNED → DRAFT_REVIEW → PUBLISHED → TRACKING
  │
  ├─ publishedAt
  ├─ trackingStartedAt             ← 성과 추적 시작 시점
  ├─ trackingEndedAt               ← 성과 추적 종료 시점 (보통 발행 후 30일)
  │
  └─ contentRequirements (Json)    ← 브리프 요구사항
```

---

## 2. Measure 도메인 모델

### 2.1 CampaignMetric (캠페인 일별 성과)

```
CampaignMetric
  ├─ id, campaignId, date
  │
  ├─ totalReach                    ← 모든 캠페인 콘텐츠 조회수 합
  ├─ totalEngagement               ← 좋아요+댓글+공유 합
  ├─ totalNewFollowers             ← 캠페인 기간 신규 팔로워
  │
  ├─ contentMetrics (Json)         ← 콘텐츠별 당일 성과
  │   └─ [{contentId, views, likes, comments, shares}]
  │
  ├─ spentBudget                   ← 누적 집행 비용
  │
  ├─ derivedMetrics (Json)         ← 계산 지표
  │   ├─ cpm                       ← Cost Per Mille
  │   ├─ cpv                       ← Cost Per View
  │   ├─ cpe                       ← Cost Per Engagement
  │   └─ engagementRate
  │
  └─ collectedAt                   ← 수집 시각
```

### 2.2 PostMeasurement (개별 콘텐츠 성과 측정)

```
PostMeasurement
  ├─ id, campaignContentId, date
  │
  ├─ viewCount, likeCount, commentCount, shareCount
  ├─ engagementRate
  ├─ estimatedReach
  │
  ├─ sentimentSummary (Json)       ← 해당 콘텐츠 댓글 감성 요약
  │   ├─ positive, neutral, negative (비율)
  │   └─ topTopics[]
  │
  └─ brandMentionCount             ← 브랜드 멘션 수
```

### 2.3 RoiCalculation (ROI 산출)

```
RoiCalculation
  ├─ id, campaignId
  │
  ├─ calculatedAt
  │
  ├─ investment
  │   ├─ totalCost                 ← 인플루언서 비용 + 제작비 + 기타
  │   ├─ costBreakdown (Json)      ← 항목별 비용
  │   └─ currency
  │
  ├─ returns
  │   ├─ totalReach
  │   ├─ totalEngagement
  │   ├─ estimatedMediaValue       ← EMV (Earned Media Value)
  │   ├─ newFollowers
  │   └─ conversions               ← 추적 가능한 전환
  │
  ├─ ratios
  │   ├─ roi                       ← (returns - investment) / investment
  │   ├─ roas                      ← Return on Ad Spend
  │   ├─ cpm, cpv, cpe
  │   └─ costPerFollower
  │
  ├─ benchmarkComparison (Json)    ← 산업 평균 대비
  │   ├─ industryAvgCpm
  │   ├─ industryAvgCpe
  │   └─ percentileRank            ← 상위 몇 %
  │
  └─ aiSummary                     ← AI 성과 해석 텍스트
```

---

## 3. Execute → Measure → Discover 순환 파이프라인

### 3.1 Campaign Metric Sync Worker

```
트리거:
  - 캠페인 상태가 ACTIVE인 동안 일 1회
  - 캠페인 종료 후 7일간 추가 수집 (후행 성과)
  - 수동 트리거

처리 흐름:
  1. 활성 캠페인 조회 (status: ACTIVE or 종료 후 7일 이내)
  2. 각 CampaignContent에 대해:
     a. Content 테이블에서 최신 지표 조회
        → Content가 없으면 platformContentUrl로 수집 시도
     b. PostMeasurement 레코드 생성 (오늘 날짜)
     c. 전일 대비 증감 계산
  3. CampaignMetric 생성 (일별 집계)
  4. Campaign.spentBudget 갱신
  5. KPI 달성률 계산
     → 목표 달성 시 알림
     → 목표 미달 + 기간 50% 경과 시 경고 알림

종료 처리:
  - endDate 도달 → status: COMPLETED
  - 7일 추가 수집 완료 → RoiCalculation 자동 생성
  - ROI 리포트 알림 → 사용자에게 "성과 확인" CTA
```

### 3.2 재순환 (Measure → Discover)

```
캠페인 완료 후 자동 생성되는 인사이트:

1. 성과 기반 인플루언서 재평가
   → "이 캠페인에서 @beauty1이 가장 높은 ROI 달성"
   → CTA: "다음 캠페인에도 @beauty1 섭외 제안"

2. 콘텐츠 패턴 분석
   → "15초 미만 릴스가 30초 이상 대비 참여율 2.3배 높음"
   → CTA: "다음 캠페인 브리프에 반영"

3. 키워드 성과 연결
   → 캠페인 기간 중 타겟 키워드 검색량 변화 분석
   → CTA: "이 키워드로 새 Intent 분석 시작"
   → ① Discover 재진입

4. GEO/AEO 영향 측정
   → 캠페인 전후 AI 가시성 변화 비교
   → CTA: "AI 검색 가시성 상세 보기"
```

---

## 4. InsightAction 확장: 실행 연결

### 기존 vs 확장

```
기존 InsightAction:
  title, description, priority, status (PENDING/COMPLETED)
  → 사용자가 "완료" 눌러야 끝

확장 InsightAction:
  + campaignId          ← 캠페인에 연결 (있으면)
  + executionType       ← MANUAL | SEMI_AUTO | FULL_AUTO
  + executionConfig     ← 자동 실행 설정
  + preMetricSnapshot   ← 실행 전 지표 스냅샷
  + postMetricSnapshot  ← 실행 후 지표 스냅샷
  + impactScore         ← 실행 전후 차이로 계산
```

### 실행 유형

| 유형      | 설명                                    | 예시                                      |
| --------- | --------------------------------------- | ----------------------------------------- |
| MANUAL    | 사용자가 직접 실행하고 "완료" 표시      | "블로그 포스트 업데이트"                  |
| SEMI_AUTO | 시스템이 초안 생성, 사용자 승인 후 실행 | "댓글 답변 초안 → 승인 → 게시"            |
| FULL_AUTO | 조건 충족 시 자동 실행                  | "리스크 댓글 감지 → Slack 알림 자동 전송" |

---

## 5. Automation Rule 확장

### 캠페인 관련 자동화

```
Rule: "캠페인 KPI 미달 경고"
  trigger: METRIC_THRESHOLD
  config: {
    entity: "campaign",
    metric: "kpiAchievementRate",
    threshold: 0.5,         // 50% 미만
    when: "periodProgress > 0.5"  // 기간 50% 경과 후
  }
  action: SEND_NOTIFICATION
  config: { channel: "email", template: "campaign_underperform" }

Rule: "인플루언서 콘텐츠 발행 확인"
  trigger: SCHEDULE
  config: { cron: "0 10 * * *" }  // 매일 10시
  action: CHECK_AND_NOTIFY
  config: {
    check: "campaignContent.status != PUBLISHED && deadline < today + 2d",
    notify: { channel: "slack", message: "발행 마감 임박: {creator} ({deadline})" }
  }

Rule: "캠페인 완료 후 자동 ROI 리포트"
  trigger: CAMPAIGN_COMPLETED
  config: { delayDays: 7 }  // 종료 7일 후
  action: GENERATE_REPORT
  config: { type: "CAMPAIGN_ROI", includeComparison: true }
```

### 인텐트 → 캠페인 자동 제안

```
Rule: "블루오션 키워드 발견 시 캠페인 제안"
  trigger: INTENT_ANALYSIS_COMPLETED
  config: {
    filter: "gapType == BLUE_OCEAN && searchVolume > 5000"
  }
  action: CREATE_ACTION_ITEM
  config: {
    actionType: "CONTENT_CREATE",
    title: "블루오션 키워드 '{keyword}' 콘텐츠 제작 제안",
    priority: "HIGH",
    suggestCampaign: true
  }
```

---

## 6. 성과 측정 지표 체계

### 6.1 캠페인 레벨 지표

| 지표             | 계산                                 | 데이터 소스       |
| ---------------- | ------------------------------------ | ----------------- |
| Total Reach      | Σ CampaignContent.viewCount          | PostMeasurement   |
| Total Engagement | Σ (likes + comments + shares)        | PostMeasurement   |
| Engagement Rate  | totalEngagement / totalReach × 100   | 계산              |
| New Followers    | 캠페인 종료 follower - 시작 follower | ChannelSnapshot   |
| Brand Mentions   | 캠페인 기간 키워드 멘션 수           | Comment + Content |
| CPM              | totalCost / (totalReach / 1000)      | 계산              |
| CPV              | totalCost / totalReach               | 계산              |
| CPE              | totalCost / totalEngagement          | 계산              |
| EMV              | reach × industry_cpm / 1000          | 계산 + 벤치마크   |
| ROI              | (EMV - totalCost) / totalCost × 100  | 계산              |

### 6.2 인플루언서 레벨 지표

| 지표                    | 계산                                       |
| ----------------------- | ------------------------------------------ |
| Creator Reach           | 해당 인플루언서 콘텐츠 총 조회             |
| Creator Engagement Rate | 해당 인플루언서 콘텐츠 참여율              |
| Cost Efficiency         | 비용 / reach                               |
| Content Quality Score   | AI 분석 (댓글 감성 + 참여율 + 브랜드 멘션) |
| Reuse Recommendation    | 성과 기반 재협업 추천 점수 (0~100)         |

### 6.3 Before/After 비교 프레임

```typescript
interface BeforeAfterComparison {
  metric: string;
  before: {
    value: number;
    period: { start: Date; end: Date };
    source: string; // "ChannelSnapshot 3월 평균"
  };
  after: {
    value: number;
    period: { start: Date; end: Date };
    source: string;
  };
  change: {
    absolute: number;
    percentage: number;
    direction: "UP" | "DOWN" | "FLAT";
    isSignificant: boolean; // 통계적 유의미성
  };
}
```

---

## 7. 실데이터 요구사항 (Mock 불가)

| 데이터                | 소스                   | Mock 불가 이유        |
| --------------------- | ---------------------- | --------------------- |
| 캠페인 콘텐츠 성과    | Social API 실데이터    | 성과 측정의 핵심      |
| 인플루언서 채널 지표  | Social API             | 탐색/추천의 근거      |
| ROI 계산 투입 비용    | 사용자 입력            | 사용자 직접 입력 필수 |
| Before/After 지표     | ChannelSnapshot 시계열 | 실측 없이 비교 불가   |
| 캠페인 기간 댓글 감성 | CommentAnalysis        | AI 분석 실데이터      |
| 브랜드 멘션 수        | Content/Comment 검색   | 키워드 매칭 실데이터  |

Fallback 허용:

- EMV (Earned Media Value): 벤치마크 데이터 부족 시 "추정 불가" 표시
- Reuse Recommendation: AI 불가 시 단순 성과 순위로 대체
- Industry Benchmark: 자체 데이터 부족 시 "벤치마크 수집 중" 표시
