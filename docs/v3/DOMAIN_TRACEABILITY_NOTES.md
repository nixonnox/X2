# DOMAIN_TRACEABILITY_NOTES — 도메인 간 데이터 연결 추적

> 작성일: 2026-03-10
> 목적: 검색/소셜/댓글/출처/캠페인/리포트/액션 데이터가 어떻게 이어지는지 추적

---

## 1. 전체 데이터 흐름 (Intelligence Loop)

```
┌─────────────────────────────────────────────────────────────────┐
│                     7-Stage Intelligence Loop                    │
│                                                                  │
│  ① DISCOVER                                                     │
│  Channel → Content → Comment                                    │
│  Keyword → RawSocialMention                                     │
│       │                                                          │
│       ▼                                                          │
│  ② ANALYZE                                                      │
│  ChannelSnapshot, ContentMetricDaily, CommentAnalysis            │
│       │                                                          │
│       ├── isQuestion=true ──→ ③ FAQCandidate (🆕)               │
│       ├── isRisk=true    ──→ ③ RiskSignal (🆕)                  │
│       │                        └──→ Notification (🆕)           │
│       ▼                                                          │
│  ③ INTENT                                                       │
│  IntentQuery → IntentKeywordResult → TrendKeywordAnalytics       │
│       │                                                          │
│       ▼                                                          │
│  ④ GEO/AEO                                                     │
│  AeoKeyword → AeoSnapshot ↔ CitationReadyReportSource           │
│       │                                                          │
│       ▼                                                          │
│  ⑤ INSIGHT                                                      │
│  InsightReport → ReportSection → EvidenceAsset (→ 실데이터 참조) │
│       │                                                          │
│       ▼                                                          │
│  ⑥ EXECUTE                                                      │
│  InsightAction → Campaign → CampaignCreator → CampaignContent    │
│       │                                                          │
│       ▼                                                          │
│  ⑦ MEASURE                                                      │
│  PostMeasurement, CampaignMetric → RoiCalculation                │
│       │                                                          │
│       └──→ ① DISCOVER (재순환)                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 도메인 간 연결 상세

### 2.1 소셜 → 분석

```
Channel
  └──→ Content (1:N, Cascade)
         └──→ Comment (1:N, Cascade)
                └──→ CommentAnalysis (1:1, Cascade)
                       ├── sentiment → 감성 분석 결과
                       ├── topics → 토픽 분류 결과
                       ├── isQuestion → FAQ 추출 트리거
                       └── isRisk → 리스크 감지 트리거

  └──→ ChannelSnapshot (1:N, 일별 시계열)
  └──→ ContentMetricDaily (Content → 1:N, 일별 시계열)
```

**Traceability**: 모든 분석 결과는 원본 댓글(Comment)까지 역추적 가능. CommentAnalysis.commentId → Comment.contentId → Content.channelId → Channel.projectId.

### 2.2 댓글 → FAQ/리스크 (🆕)

```
CommentAnalysis (isQuestion=true)
  └──→ FAQCandidate.sourceCommentIds (polymorphic)
         ├── question: LLM이 정규화한 대표 질문
         ├── mentionCount: 같은 질문 반복 횟수
         ├── hasAnswer: 자사 콘텐츠에 답변 존재 여부
         └── → InsightAction(CONTENT_CREATE) 생성

CommentAnalysis (isRisk=true)
  └──→ RiskSignal.sourceCommentIds (polymorphic)
         ├── severity: RiskLevel (LOW~CRITICAL)
         ├── rootCauseAnalysis: LLM 원인 분석
         └── → Notification(RISK_DETECTED) 자동 생성
             → InsightAction(RISK_MITIGATE) 생성
```

**Traceability**: FAQCandidate.sourceCommentIds → Comment → Content → Channel. 원본 댓글 → 집계된 FAQ → 대응 콘텐츠까지 추적.

### 2.3 리스닝 → 인텐트

```
Keyword
  └──→ KeywordMetricDaily (1:N, 일별 검색량)

RawSocialMention
  ├── matchedKeyword (string, Keyword와 loose coupling)
  └── topics, sentiment (AI enrichment)

IntentQuery (시드 키워드 기반 분석)
  └──→ IntentKeywordResult (1:N)
         ├── intentCategory: DISCOVERY/COMPARISON/ACTION/...
         ├── gapScore: 검색 대비 콘텐츠 공급 갭
         └── gapType: BLUE_OCEAN/OPPORTUNITY/...

TrendKeywordAnalytics
  ├── keyword + locale + period (복합 unique)
  ├── 검색량 + 소셜 볼륨 교차
  └── gapScore: 검색 vs 소셜 갭
```

**Traceability**: Keyword → 수집 트리거 → RawSocialMention. IntentQuery.seedKeyword → IntentKeywordResult[] → TrendKeywordAnalytics.keyword (앱 레벨 매칭).

### 2.4 인텐트 → GEO/AEO 출처

```
IntentKeywordResult (gapType=BLUE_OCEAN)
  └──→ AeoKeyword 등록 (앱 레벨)
         └──→ AeoSnapshot (엔진 × 일별)
                ├── citedSources (JSON)
                ├── brandMentioned, brandCitedRank
                ├── competitorMentions (JSON)
                └── visibilityScore

CitationReadyReportSource
  ├── targetKeywords → AeoKeyword.keyword (앱 레벨 매칭)
  ├── currentCitationCount (AeoSnapshot에서 집계)
  ├── citationHistory (JSON)
  └── priority, geoOptimized
```

**Traceability**: IntentKeywordResult.keyword → AeoKeyword.keyword → AeoSnapshot.citedSources → CitationReadyReportSource.url. 검색 갭 발견 → AI 인용 추적 → 소스 최적화까지 연결.

### 2.5 분석 → 인사이트/리포트

```
InsightReport
  ├── type: InsightType (WEEKLY_REPORT, RISK_REPORT, FAQ_REPORT, ...)
  ├── sections: ReportSection[]
  │     └── evidenceAssets: EvidenceAsset[]
  │           ├── dataSourceType: DataSourceType enum
  │           │   (CHANNEL_SNAPSHOT, CONTENT_METRIC, COMMENT_ANALYSIS,
  │           │    INTENT_RESULT, AEO_SNAPSHOT, CAMPAIGN_METRIC,
  │           │    KEYWORD_METRIC, RAW_MENTION, FAQ_CANDIDATE(🆕), RISK_SIGNAL(🆕))
  │           ├── dataEntityIds: String[] (실데이터 참조)
  │           └── dataQuery: Json (조회 조건)
  └── actions: InsightAction[]
```

**Traceability**: EvidenceAsset.dataSourceType + dataEntityIds → 원본 데이터 테이블. "이 차트의 데이터는 어디서 왔는가?" 항상 추적 가능. Mock 금지.

### 2.6 인사이트 → 실행 (액션/캠페인)

```
InsightAction
  ├── sourceModule: SourceModule enum
  │   (SEARCH_INTENT, SOCIAL_INTELLIGENCE, COMMENT_INTELLIGENCE,
  │    GEO_AEO, CAMPAIGN_MEASURE, MANUAL, FAQ_ENGINE(🆕), RISK_ENGINE(🆕))
  ├── sourceEntityId: String? (원본 분석 결과 ID)
  ├── sourceReason: String? (왜 이 액션을 추천했는가)
  ├── actionType: InsightActionType
  │   (CONTENT_CREATE, SEO_UPDATE, RISK_MITIGATE, INFLUENCER_OUTREACH, ...)
  └── campaignId → Campaign (실행으로 연결)

Campaign
  ├── sourceInsightId: String? (어떤 인사이트에서 시작됐는가)
  ├── creators: CampaignCreator[]
  │     ├── channelId → Channel (인플루언서)
  │     ├── influencerProfileId → InfluencerProfile
  │     └── contents: CampaignContent[]
  └── roiCalculations: RoiCalculation[]
```

**Traceability**: InsightAction.sourceModule + sourceEntityId → 원본 분석 결과. InsightAction.campaignId → Campaign.sourceInsightId → 원본 인사이트. "왜 이 캠페인을 시작했는가?" 역추적 가능.

### 2.7 실행 → 측정 → 재순환

```
CampaignContent
  └──→ PostMeasurement (1:N, 일별)
         ├── viewCount, likeCount, engagementRate
         └── sentimentSummary (JSON)

Campaign
  └──→ CampaignMetric (1:N, 일별 집계)
  └──→ RoiCalculation (1:N)
         ├── roi, roas, cpm, cpv, cpe
         ├── benchmarkComparison (JSON)
         └── aiSummary: "CPV가 산업 평균 대비 30% 낮음..."

RoiCalculation → InsightAction 재생성 (재순환)
  → 새 Channel/Keyword 발견 → ① Discover
```

**Traceability**: PostMeasurement.campaignContentId → CampaignContent.campaignId → Campaign.sourceInsightId → InsightReport. 측정 결과 → 실행 → 인사이트까지 역추적.

---

## 3. 알림 연결 (🆕)

```
Notification
  ├── sourceType: "risk_signal" | "scheduled_job" | "campaign" | ...
  ├── sourceId: 관련 엔티티 ID
  └── actionUrl: 딥링크 (해당 화면으로 이동)

트리거 흐름:
  ScheduledJob(status=FAILED)  ──→ Notification(SYNC_FAILURE)
  UsageMetric(aiTokensUsed>80%)──→ Notification(TOKEN_LIMIT_WARNING)
  RiskSignal(severity=HIGH)    ──→ Notification(RISK_DETECTED)
  ChannelConnection(EXPIRED)   ──→ Notification(OAUTH_EXPIRED)
  InsightReport(PUBLISHED)     ──→ Notification(REPORT_READY)
  AeoSnapshot(인용 변화)       ──→ Notification(CITATION_CHANGE)
```

**Traceability**: Notification.sourceType + sourceId → 원본 이벤트 엔티티. 알림 클릭 → actionUrl → 해당 화면.

---

## 4. Polymorphic Reference 정리

| 모델             | 필드                               | 참조 대상                 | 연결 방식       |
| ---------------- | ---------------------------------- | ------------------------- | --------------- |
| EvidenceAsset    | dataSourceType + dataEntityIds     | 8+2=10개 테이블           | Enum + String[] |
| InsightAction    | sourceModule + sourceEntityId      | 6+2=8개 모듈              | Enum + String   |
| FAQCandidate     | sourceCommentIds                   | Comment                   | String[]        |
| RiskSignal       | sourceCommentIds, sourceMentionIds | Comment, RawSocialMention | String[]        |
| Notification     | sourceType + sourceId              | 다양한 엔티티             | String + String |
| RawSocialMention | matchedKeyword                     | Keyword                   | String (loose)  |

**설계 원칙**: 외부 데이터 또는 다형 참조는 FK가 아닌 polymorphic reference. DB 무결성 대신 유연성 선택. 앱 레벨 검증 필수.

---

## 5. Cross-Domain Query 예시

| 질문                                      | 쿼리 경로                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| "이 FAQ의 원본 댓글은?"                   | FAQCandidate.sourceCommentIds → Comment → Content → Channel                    |
| "리스크가 발생한 콘텐츠는?"               | RiskSignal.sourceCommentIds → Comment.contentId → Content                      |
| "이 인사이트의 근거 데이터는?"            | InsightReport → ReportSection → EvidenceAsset.dataEntityIds → (해당 테이블)    |
| "이 캠페인은 어떤 인사이트에서 시작됐나?" | Campaign.sourceInsightId → InsightAction.reportId → InsightReport              |
| "이 키워드의 AI 인용 현황은?"             | AeoKeyword.keyword → AeoSnapshot (엔진별/일별) → citedSources                  |
| "부정 댓글이 급증한 채널은?"              | CommentAnalysis(sentiment=NEGATIVE, isRisk=true) → Comment → Content → Channel |
| "미답변 FAQ가 많은 프로젝트는?"           | FAQCandidate(hasAnswer=false) → Project                                        |
