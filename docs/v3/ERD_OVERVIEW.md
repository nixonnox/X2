# ERD_OVERVIEW — Entity Relationship Diagram & Intelligence Graph

> 작성일: 2026-03-10
> 상태: 확정
> 기준: schema.prisma (v2.1)

---

## 1. 상위 레벨 ERD

```
┌──────────────────────────────────────────────────────────────────┐
│                         WORKSPACE                                │
│  plan, planTier, industryType                                    │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐  │
│  │   User   │──│WorkspaceMember│  │Subscription│  │UsageMetric│  │
│  └──────────┘  └──────────────┘  └───────────┘  └───────────┘  │
│                                                                  │
│  ┌────────────────────┐  ┌──────────────────────┐               │
│  │  ScheduledJob      │  │WorkspaceVerticalPack  │──VerticalPack │
│  └────────────────────┘  └──────────────────────┘               │
│                                                                  │
│  ┌──────────────────── PROJECT ─────────────────────────────┐   │
│  │                                                           │   │
│  │  [SOCIAL]           [LISTENING]        [INTENT]          │   │
│  │  Channel             Keyword            IntentQuery       │   │
│  │    ├─ Content         ├─ MetricDaily      ├─ KeywordResult│   │
│  │    │   ├─ MetricD     │                   │               │   │
│  │    │   └─ Comment     RawSocialMention   TrendAnalytics   │   │
│  │    │       └─ Analysis                                    │   │
│  │    ├─ Snapshot                                            │   │
│  │    ├─ Connection      [GEO/AEO]          [REPORT]        │   │
│  │    ├─ InfluencerProf  AeoKeyword          InsightReport   │   │
│  │    └─ CampaignCreator   └─ AeoSnapshot      ├─ Section   │   │
│  │                       CitationSource          │  └─ Evid. │   │
│  │  [CAMPAIGN]                                   └─ Action   │   │
│  │  Campaign                                                 │   │
│  │    ├─ CampaignCreator  [DATA EXPLORER]                    │   │
│  │    ├─ CampaignContent  SavedFilter                        │   │
│  │    │    └─ PostMeasure DataExportJob                       │   │
│  │    ├─ CampaignMetric                                      │   │
│  │    └─ RoiCalculation                                      │   │
│  │                                                           │   │
│  │  CompetitorChannel (legacy → Channel.channelType 전환)    │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. 도메인별 상세 ERD

### 2.1 Social Domain (소셜 분석)

```
Channel ──1:N──► Content ──1:N──► Comment ──1:1──► CommentAnalysis
   │                │
   │ 1:N            │ 1:N
   ▼                ▼
ChannelSnapshot   ContentMetricDaily
   │
   │ 1:N
   ▼
ChannelConnection

Channel ──1:1──► InfluencerProfile
   │
   │ channelType: OWNED | COMPETITOR | MONITORING | INFLUENCER
```

**관계 규칙**:

- Channel → Content: Cascade (채널 삭제 시 콘텐츠 삭제)
- Content → Comment: Cascade
- Comment → CommentAnalysis: Cascade (1:1)
- Channel.deletedAt: soft delete 우선

### 2.2 Listening Domain (소셜 리스닝)

```
Project ──1:N──► Keyword ──1:N──► KeywordMetricDaily
   │
   │ 1:N
   ▼
RawSocialMention
   ├── matchedKeyword: string (Keyword와 논리적 연결)
   ├── sentiment: SentimentType (AI enrichment)
   └── topics: string[]
```

**관계 규칙**:

- RawSocialMention.matchedKeyword는 FK가 아닌 문자열 — Keyword 테이블과 느슨한 연결
- 이유: 멘션 수집 시 아직 Keyword 레코드가 없을 수 있음 (역방향 수집)

### 2.3 Intent Domain (검색 인텐트)

```
Project ──1:N──► IntentQuery ──1:N──► IntentKeywordResult
   │
   │ 1:N
   ▼
TrendKeywordAnalytics
   ├── keyword + locale + period (composite unique)
   ├── searchTrend: KeywordTrend
   └── gapScore: 검색 대비 소셜 공급 갭
```

**관계 규칙**:

- IntentQuery → IntentKeywordResult: Cascade
- TrendKeywordAnalytics: Keyword와 독립적 집계 테이블 (직접 FK 없음)
- 이유: TrendKeywordAnalytics는 Keyword + Social + Intent를 교차 집계한 결과

### 2.4 GEO/AEO Domain

```
Project ──1:N──► AeoKeyword ──1:N──► AeoSnapshot
   │                                    │
   │ 1:N                                │ citedSources (JSON)
   ▼                                    ▼
CitationReadyReportSource ◄──── (논리적 매칭: url/domain)
   ├── targetKeywords: string[]
   ├── currentCitationCount
   └── lastCitedEngine: AeoEngine
```

**관계 규칙**:

- AeoKeyword → AeoSnapshot: Cascade. 키워드 × 엔진 × 일 unique.
- CitationReadyReportSource ↔ AeoSnapshot: FK 없음, 앱 레벨에서 URL/도메인 매칭
- 이유: 인용 소스와 스냅샷은 비정형 매칭 (URL 정규화 필요)

### 2.5 Campaign Domain (실행/측정)

```
Campaign ──1:N──► CampaignCreator ──1:N──► CampaignContent ──1:N──► PostMeasurement
   │                  │
   │ 1:N              │ M:1 (optional)
   │                  ▼
   │             Channel / InfluencerProfile
   │
   ├──1:N──► CampaignMetric (일별 집계)
   └──1:N──► RoiCalculation (ROI 산출)
```

**관계 규칙**:

- Campaign → CampaignCreator: Cascade
- CampaignCreator → Channel: SetNull (채널 삭제 시 이력 보존)
- CampaignCreator → InfluencerProfile: SetNull
- CampaignContent → CampaignCreator: SetNull
- Campaign.deletedAt: soft delete

### 2.6 Insight/Report Domain

```
InsightReport ──1:N──► ReportSection ──1:N──► EvidenceAsset
   │                                              │
   │ 1:N                                          │ dataSourceType
   ▼                                              │ dataEntityIds[]
InsightAction ──M:1──► Campaign (optional)        │ dataQuery (JSON)
   │                                              ▼
   │ sourceModule                          (실데이터 참조)
   │ sourceEntityId                    ChannelSnapshot | ContentMetric
   └── (InsightReport optional)        CommentAnalysis | IntentResult
                                       AeoSnapshot | CampaignMetric
                                       KeywordMetric | RawMention
```

**관계 규칙**:

- InsightReport → ReportSection: Cascade
- ReportSection → EvidenceAsset: Cascade
- InsightAction.reportId: nullable (리포트 없이 독립 생성 가능)
- InsightAction → InsightReport: SetNull
- InsightAction → Campaign: SetNull
- EvidenceAsset.dataEntityIds: FK 아닌 string 배열 — polymorphic 참조

### 2.7 Vertical Pack

```
VerticalPack ──M:N──► Workspace (via WorkspaceVerticalPack)
   │
   │ 1:N
   ▼
ReportTemplate
```

---

## 3. 확장 가능한 관계 구조

### 3.1 Polymorphic Reference (EvidenceAsset)

EvidenceAsset은 여러 종류의 데이터를 참조해야 한다. FK 대신 `dataSourceType` + `dataEntityIds` 패턴 사용.

```
EvidenceAsset
  dataSourceType: CHANNEL_SNAPSHOT | CONTENT_METRIC | COMMENT_ANALYSIS | ...
  dataEntityIds: ["cuid1", "cuid2", ...]
  dataQuery: { table, filters, dateRange, metrics, groupBy }
```

**장점**: 참조 대상 테이블 추가 시 enum 값만 추가. FK 변경 불필요.
**단점**: DB 레벨 무결성 보장 불가. 앱 레벨 검증 필수.

### 3.2 Loose Coupling (RawSocialMention ↔ Keyword)

`matchedKeyword`는 FK가 아닌 문자열. 이유:

1. 멘션은 외부에서 수집되므로 내부 Keyword 레코드와 1:1 매핑이 항상 보장되지 않음
2. 하나의 멘션이 여러 키워드로 수집될 수 있음 (matchedKeyword는 트리거 키워드)
3. Keyword 삭제 시 멘션 데이터 보존 필요

### 3.3 Temporal Data (시계열)

시계열 데이터 패턴: `[entityId, date]` composite unique.

```
ChannelSnapshot:     [channelId, date]
ContentMetricDaily:  [contentId, date]
KeywordMetricDaily:  [keywordId, date]
CampaignMetric:      [campaignId, date]
PostMeasurement:     [campaignContentId, date]
AeoSnapshot:         [keywordId, date, engine]
```

**확장 고려**: RawSocialMention이 대량 증가 시 월별 파티셔닝 가능. PostgreSQL native partitioning 또는 Citus extension.

### 3.4 향후 확장 포인트

| 확장                 | 방법                                                | 영향                             |
| -------------------- | --------------------------------------------------- | -------------------------------- |
| 새 소셜 플랫폼 추가  | SocialPlatform enum 값 추가                         | 기존 구조 변경 없음              |
| 새 AI 검색 엔진 추가 | AeoEngine enum 값 추가                              | 기존 구조 변경 없음              |
| 새 콘텐츠 유형 추가  | ContentType enum 값 추가                            | 기존 구조 변경 없음              |
| 새 분석 모듈 추가    | DataSourceType, SourceModule enum 확장              | EvidenceAsset/InsightAction 확장 |
| 멀티 프로젝트 캠페인 | Campaign에 workspaceId 추가, projectId nullable     | 구조 변경 필요                   |
| 팀 권한 세분화       | WorkspaceMember.role 확장 또는 Permission 모델 추가 | 별도 설계                        |
| 실시간 알림          | Notification 모델 추가, WebSocket                   | 독립 모듈                        |

---

## 4. Intelligence Graph 관점

### 4.1 데이터 → 인텔리전스 전환

```
Raw Data Layer (수집)
  Channel, Content, Comment, RawSocialMention, AeoSnapshot
         │
         ▼  (AI + 통계 처리)
Analysis Layer (분석)
  CommentAnalysis, IntentKeywordResult, TrendKeywordAnalytics
  ChannelSnapshot (집계), ContentMetricDaily (집계)
         │
         ▼  (교차 분석 + 패턴 인식)
Intelligence Layer (인사이트)
  InsightReport, ReportSection, EvidenceAsset
  InsightAction (추천 액션)
         │
         ▼  (실행)
Execution Layer (실행)
  Campaign, CampaignCreator, CampaignContent
         │
         ▼  (측정 → 재순환)
Measurement Layer (측정)
  PostMeasurement, CampaignMetric, RoiCalculation
         │
         └──→ Raw Data Layer (재순환: 새 데이터 수집)
```

### 4.2 Cross-Domain Intelligence 예시

| 인텔리전스                                   | 교차하는 데이터                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| "이 키워드는 검색량 높지만 소셜 콘텐츠 부족" | IntentKeywordResult.gapScore + TrendKeywordAnalytics.socialContentCount |
| "경쟁사는 AI에 인용되는데 우리는 안 됨"      | AeoSnapshot.competitorMentions + CitationReadyReportSource              |
| "부정 댓글 급증 원인"                        | CommentAnalysis.sentiment + Content.publishedAt + KeywordMetricDaily    |
| "캠페인 ROI vs 산업 평균"                    | RoiCalculation + VerticalPack.benchmarkBaseline                         |
| "인플루언서 성과 예측"                       | InfluencerProfile.scoreBreakdown + CampaignCreator.performanceSummary   |
