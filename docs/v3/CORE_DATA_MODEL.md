# CORE_DATA_MODEL — 핵심 엔티티 및 데이터 연결 구조

> 작성일: 2026-03-10
> 상태: 확정
> 기준: schema.prisma (v2.1) + v3 설계

---

## 1. 엔티티 분류 체계

### 1.1 도메인별 분류

| 도메인                            | 엔티티                                                                                                                | 역할                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **Auth & Tenancy**                | User, Account, Session, VerificationToken, Workspace, WorkspaceMember                                                 | 인증, 멀티테넌시        |
| **Project**                       | Project                                                                                                               | 분석 단위 컨테이너      |
| **Social (Discover/Analyze)**     | Channel, ChannelConnection, ChannelSnapshot, Content, ContentMetricDaily, Comment, CommentAnalysis, CompetitorChannel | 소셜 채널/콘텐츠/댓글   |
| **Listening (Discover)**          | RawSocialMention, Keyword, KeywordMetricDaily                                                                         | 소셜 멘션, 키워드 추적  |
| **Intent (Intent)**               | IntentQuery, IntentKeywordResult, TrendKeywordAnalytics                                                               | 검색 인텐트, 트렌드     |
| **GEO/AEO**                       | AeoKeyword, AeoSnapshot, CitationReadyReportSource                                                                    | AI 인용 추적            |
| **Influencer (Discover/Execute)** | InfluencerProfile                                                                                                     | 인플루언서 프로필       |
| **Campaign (Execute/Measure)**    | Campaign, CampaignCreator, CampaignContent, CampaignMetric, PostMeasurement, RoiCalculation                           | 캠페인 실행/측정        |
| **Insight & Report**              | InsightReport, InsightAction, ReportSection, EvidenceAsset, ReportTemplate                                            | 인사이트, 리포트, 근거  |
| **Vertical**                      | VerticalPack, WorkspaceVerticalPack                                                                                   | 산업별 팩               |
| **Data Explorer**                 | SavedFilter, DataExportJob                                                                                            | 데이터 탐색/내보내기    |
| **Platform**                      | Platform, ScheduledJob                                                                                                | 플랫폼 마스터, 스케줄링 |
| **Billing**                       | Subscription, UsageMetric                                                                                             | 결제, 사용량            |

---

## 2. 핵심 엔티티 상세

### 2.1 Workspace & Project (멀티테넌시 루트)

```
Workspace (조직/팀)
  ├── plan: FREE | PRO | BUSINESS
  ├── planTier: STANDARD | VERTICAL | ENTERPRISE
  ├── industryType: BEAUTY | FOOD_BEVERAGE | ...
  ├── members: WorkspaceMember[] (User와 M:N)
  └── projects: Project[]

Project (분석 단위 — 브랜드/캠페인/제품별)
  └── 모든 데이터의 스코프: 채널, 키워드, 캠페인, 리포트 등
```

**설계 결정**: 모든 분석 데이터는 Project 하위에 위치. 프로젝트 간 데이터 격리. Workspace는 팀/결제 단위.

### 2.2 Channel & Content (소셜 데이터 핵심)

```
Channel (소셜 채널)
  ├── platform: YOUTUBE | INSTAGRAM | TIKTOK | X
  ├── channelType: OWNED | COMPETITOR | MONITORING | INFLUENCER
  ├── status: PENDING → ACTIVE ↔ SYNCING | ERROR | PAUSED | ARCHIVED
  ├── snapshots: ChannelSnapshot[] (일별 지표 이력)
  ├── contents: Content[] (콘텐츠 목록)
  │     ├── metrics: ContentMetricDaily[] (일별 콘텐츠 지표)
  │     └── comments: Comment[] (댓글)
  │           └── analysis: CommentAnalysis (AI 분석 결과)
  ├── influencerProfile: InfluencerProfile? (1:1 확장)
  └── connections: ChannelConnection[] (OAuth 토큰)
```

**핵심 관계**: Channel → Content → Comment → CommentAnalysis. 이 체인이 소셜 분석의 중추.

### 2.3 Keyword & RawSocialMention (리스닝 데이터)

```
Keyword (추적 키워드)
  ├── keyword: string
  ├── metrics: KeywordMetricDaily[] (일별 검색량, 트렌드)
  └── Project 범위 내 unique

RawSocialMention (소셜 멘션 원문)
  ├── platform, platformPostId (원본 식별)
  ├── text: 원문 (최대 5000자)
  ├── matchedKeyword: 수집 트리거 키워드
  ├── matchType: EXACT | HASHTAG | CONTEXT
  ├── sentiment, topics (AI enrichment)
  └── viewCount, likeCount, engagementRate
```

**핵심 연결**: Keyword → 수집 트리거 → RawSocialMention. 키워드별 멘션 추이 추적.

### 2.4 IntentQuery & IntentKeywordResult (검색 인텐트)

```
IntentQuery (인텐트 분석 요청)
  ├── seedKeyword: 시드 키워드
  ├── status: QUEUED → PROCESSING → COMPLETED | FAILED
  ├── resultSummary, resultGraph: 분석 결과 JSON
  └── keywords: IntentKeywordResult[]

IntentKeywordResult (개별 키워드 인텐트)
  ├── keyword: string
  ├── intentCategory: DISCOVERY | COMPARISON | ACTION | TROUBLESHOOTING | NAVIGATION
  ├── gapScore: 검색 대비 콘텐츠 공급 갭
  ├── gapType: BLUE_OCEAN | OPPORTUNITY | COMPETITIVE | SATURATED
  └── searchVolume, socialVolume, trend
```

**핵심 연결**: IntentQuery → IntentKeywordResult. 키워드별 인텐트와 갭 식별.

### 2.5 AeoKeyword & AeoSnapshot (GEO/AEO 추적)

```
AeoKeyword (AI 검색 추적 키워드)
  ├── keyword, locale, targetBrand
  ├── competitorBrands: string[]
  └── snapshots: AeoSnapshot[]

AeoSnapshot (AI 답변 스냅샷)
  ├── engine: GOOGLE_AI_OVERVIEW | PERPLEXITY | BING_COPILOT | CHATGPT_SEARCH
  ├── aiResponse: AI 답변 원문
  ├── citedSources: [{url, title, domain, rank, isBrand, isCompetitor}]
  ├── brandMentioned, brandCitedRank
  ├── competitorMentions: [{brand, mentioned, rank}]
  └── visibilityScore: 0~100

CitationReadyReportSource (인용 대응 소스)
  ├── url, title, domain, sourceType
  ├── targetKeywords: 인용 타겟 키워드
  ├── currentCitationCount, lastCitedDate, lastCitedEngine
  └── geoOptimized, priority
```

**핵심 연결**: AeoKeyword → AeoSnapshot(엔진별 일일) ↔ CitationReadyReportSource(우리 소스). 인용 현황 추적 + 최적화 관리.

### 2.6 Campaign & Execution (캠페인 실행)

```
Campaign (캠페인)
  ├── campaignType: INFLUENCER | CONTENT | PAID | ORGANIC | HYBRID
  ├── status: DRAFT → ACTIVE → COMPLETED | PAUSED | CANCELLED
  ├── budget, kpiTargets
  ├── creators: CampaignCreator[] (인플루언서 매핑)
  │     └── contents: CampaignContent[] (콘텐츠 트래킹)
  │           └── measurements: PostMeasurement[] (일별 성과)
  ├── metrics: CampaignMetric[] (캠페인 일별 집계)
  └── roiCalculations: RoiCalculation[]
```

**핵심 연결**: Campaign → CampaignCreator → CampaignContent → PostMeasurement. 실행부터 측정까지 체인.

### 2.7 InsightReport & Evidence (인사이트/리포트)

```
InsightReport (인사이트 보고서)
  ├── type: WEEKLY_REPORT | CAMPAIGN_REPORT | INTENT_REPORT | AEO_REPORT | ...
  ├── shareToken: 외부 공유 토큰
  ├── sections: ReportSection[] (섹션별 구성)
  │     └── evidenceAssets: EvidenceAsset[] (근거 블록)
  │           ├── dataSourceType: 원본 데이터 종류
  │           ├── dataEntityIds: 참조 레코드 ID 목록
  │           ├── dataQuery: 데이터 조회 조건
  │           └── visualization: 차트 설정
  └── actions: InsightAction[] (액션 아이템)
        ├── sourceModule: 출처 모듈
        └── campaign?: 실행 캠페인 연결
```

**핵심 연결**: InsightReport → ReportSection → EvidenceAsset (실데이터 참조). InsightAction → Campaign (실행 연결).

---

## 3. 데이터 연결 구조 (Intelligence Graph)

### 3.1 교차 연결 맵

```
                    ┌─── Keyword ─── KeywordMetricDaily
                    │        │
                    │        ▼
               RawSocialMention
                    │        │
                    ▼        │
Channel ─── Content ─── Comment ─── CommentAnalysis
  │           │              │
  │           ▼              ▼
  │    ContentMetricDaily   (FAQ/Topic 추출)
  │                             │
  ├── ChannelSnapshot           ▼
  │                     IntentQuery ─── IntentKeywordResult
  ├── InfluencerProfile         │
  │         │                   ▼
  │         ▼            TrendKeywordAnalytics
  │    CampaignCreator          │
  │         │                   ▼
  │         ▼             AeoKeyword ─── AeoSnapshot
  └── Campaign ──────────────────────────────┐
        │                                     │
        ├── CampaignContent                   │
        │     └── PostMeasurement             │
        ├── CampaignMetric                    │
        └── RoiCalculation                    │
                    │                         │
                    ▼                         ▼
             InsightReport ──── InsightAction
                  │
                  └── ReportSection ─── EvidenceAsset
                                            │
                           (실데이터 참조) ──┘
```

### 3.2 7-Stage별 데이터 매핑

| Stage        | 입력 데이터                    | 생성 데이터                                                | 출력          |
| ------------ | ------------------------------ | ---------------------------------------------------------- | ------------- |
| **Discover** | 채널 URL, 키워드               | Channel, Content, Comment, RawSocialMention, Keyword       | 수집 완료     |
| **Analyze**  | Channel, Content, Comment      | ChannelSnapshot, ContentMetricDaily, CommentAnalysis       | 분석 결과     |
| **Intent**   | Keyword, CommentAnalysis (FAQ) | IntentQuery, IntentKeywordResult, TrendKeywordAnalytics    | 인텐트 분류   |
| **GEO/AEO**  | Keyword, IntentKeywordResult   | AeoSnapshot, CitationReadyReportSource                     | 인용 현황     |
| **Insight**  | 모든 분석 결과                 | InsightReport, ReportSection, EvidenceAsset, InsightAction | 인사이트      |
| **Execute**  | InsightAction                  | Campaign, CampaignCreator, CampaignContent                 | 실행          |
| **Measure**  | CampaignContent                | PostMeasurement, CampaignMetric, RoiCalculation            | 성과 → 재순환 |

### 3.3 데이터 흐름 방향

```
수집 (외부 → 내부)
  API/수집 → Channel/Content/Comment/RawSocialMention/AeoSnapshot

분석 (내부 처리)
  수집 데이터 → AI/통계 → CommentAnalysis/IntentKeywordResult/TrendAnalytics

인사이트 (집계)
  분석 결과 → AI → InsightReport/InsightAction

실행 (내부 → 외부)
  InsightAction → Campaign/CampaignCreator/CampaignContent

측정 (외부 → 내부, 재순환)
  외부 성과 → PostMeasurement/CampaignMetric → RoiCalculation → 재분석
```

---

## 4. 엔티티 수량 및 성장 예측

| 엔티티              | 프로젝트당 예상 규모 | 성장률                  | 비고               |
| ------------------- | -------------------- | ----------------------- | ------------------ |
| Channel             | 5~50개               | 월 1~5개 추가           | 자사+경쟁+모니터링 |
| Content             | 수천                 | 채널당 월 10~100개      | 정기 수집          |
| Comment             | 수만~수십만          | 콘텐츠당 수십~수천      | 대량 데이터        |
| RawSocialMention    | 수만~수십만/월       | 키워드 수 × 일일 수집량 | **파티셔닝 고려**  |
| ChannelSnapshot     | 채널 수 × 365        | 일별 1행/채널           | 시계열             |
| IntentKeywordResult | 쿼리당 수백          | 비정기 분석             | 분석 시 일괄 생성  |
| AeoSnapshot         | 키워드 × 엔진 × 일   | 일별 수집               | 시계열             |
| CampaignContent     | 캠페인당 수~수십     | 캠페인 기간 중          | 측정 대상          |
| PostMeasurement     | 콘텐츠 × 측정일      | 일별                    | 시계열             |

---

## 5. 용어 사전

| 용어              | 정의                                              | 비고                               |
| ----------------- | ------------------------------------------------- | ---------------------------------- |
| **Channel**       | YouTube/Instagram/TikTok/X 상의 소셜 미디어 채널  | 자사/경쟁/모니터링/인플루언서 구분 |
| **Content**       | 채널에 게시된 개별 콘텐츠 (영상, 포스트, 릴스 등) |                                    |
| **Mention**       | 키워드/브랜드가 언급된 소셜 미디어 게시물 원문    | RawSocialMention                   |
| **Intent**        | 사용자의 검색 의도 (탐색/비교/행동/문제해결)      | IntentCategory                     |
| **Gap**           | 검색 수요 대비 콘텐츠 공급 부족 정도              | GapType, gapScore                  |
| **Citation**      | AI 검색 엔진이 답변에서 인용하는 출처             | AeoSnapshot.citedSources           |
| **Evidence**      | 인사이트 보고서의 데이터 근거 블록                | EvidenceAsset                      |
| **Vertical Pack** | 산업별 벤치마크/키워드/템플릿 패키지              | VerticalPack                       |
| **Campaign**      | 마케팅 실행 단위 (인플루언서/콘텐츠/광고)         | Campaign                           |
| **ROI**           | 투자 대비 수익률                                  | RoiCalculation                     |
