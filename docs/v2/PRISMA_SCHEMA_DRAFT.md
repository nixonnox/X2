# X2 — Prisma Schema Draft (v2.1)

> 작성일: 2026-03-10
> 상태: Concept-level draft — migration 실행 금지
> 기준: 현재 `packages/db/prisma/schema.prisma` + v2.1 설계 문서

---

## 0. 현재 스키마 요약

### 기존 모델 (17개)

| 모델               | 행수   | 역할                  |
| ------------------ | ------ | --------------------- |
| User               | 10필드 | Auth.js 사용자        |
| Account            | 12필드 | OAuth 계정 연결       |
| Session            | 5필드  | JWT 세션              |
| VerificationToken  | 3필드  | 이메일 인증           |
| Workspace          | 6필드  | 멀티테넌시 루트       |
| WorkspaceMember    | 5필드  | 워크스페이스 멤버     |
| Project            | 5필드  | 분석 단위 컨테이너    |
| Platform           | 5필드  | 플랫폼 마스터         |
| Channel            | 15필드 | 소셜 채널             |
| ChannelConnection  | 8필드  | OAuth 토큰            |
| ChannelSnapshot    | 7필드  | 일별 채널 지표        |
| Content            | 17필드 | 콘텐츠                |
| ContentMetricDaily | 8필드  | 일별 콘텐츠 지표      |
| Comment            | 13필드 | 댓글                  |
| CommentAnalysis    | 7필드  | 댓글 분석 결과        |
| Keyword            | 6필드  | 추적 키워드           |
| KeywordMetricDaily | 7필드  | 일별 키워드 지표      |
| CompetitorChannel  | 12필드 | 경쟁 채널 (별도 모델) |
| InsightReport      | 11필드 | AI 인사이트 보고서    |
| InsightAction      | 8필드  | 액션 아이템           |
| ScheduledJob       | 11필드 | 스케줄 작업           |
| Subscription       | 11필드 | 결제 구독             |
| UsageMetric        | 7필드  | 사용량 추적           |

### 기존 Enum (18개)

Plan, WorkspaceRole, SocialPlatform, ConnectionType, ChannelStatus,
ConnectionStatus, ContentType, ContentStatus, SentimentType, KeywordStatus,
KeywordTrend, InsightType, ReportStatus, ActionPriority, ActionStatus,
JobType, JobStatus, SubscriptionStatus

---

## 1. 기존 모델 변경 (Diff 초안)

### 1.1 Workspace — `industryType`, `planTier` 추가

```diff
 model Workspace {
   id        String   @id @default(cuid())
   name      String
   slug      String   @unique
   plan      Plan     @default(FREE)
+  planTier  PlanTier @default(STANDARD)   // STANDARD | VERTICAL | ENTERPRISE
+  industryType IndustryType?              // 산업 분류 (Vertical Pack 연동)
   createdAt DateTime @default(now())
   updatedAt DateTime @updatedAt

   members       WorkspaceMember[]
   projects      Project[]
   subscriptions Subscription[]
   usageMetrics  UsageMetric[]
   scheduledJobs ScheduledJob[]
+  verticalPacks WorkspaceVerticalPack[]   // M:N Vertical Pack 연결

   @@map("workspaces")
 }

+enum PlanTier {
+  STANDARD     // 기본 (Free/Pro/Business)
+  VERTICAL     // Vertical Pack 활성
+  ENTERPRISE   // SSO, SLA, 화이트라벨
+}

+enum IndustryType {
+  BEAUTY
+  FOOD_BEVERAGE
+  FASHION
+  TECH_SAAS
+  TRAVEL
+  FINANCE
+  GAMING
+  EDUCATION
+  HEALTHCARE
+  OTHER
+}
```

**근거**: `plan`(FREE/PRO/BUSINESS)은 결제 등급, `planTier`는 기능 계층(Vertical/Enterprise), `industryType`은 벤치마크/템플릿 매칭에 사용.

### 1.2 Channel — `channelType`, `deletedAt`, 상태 확장

```diff
 model Channel {
   id                String         @id @default(cuid())
   platform          SocialPlatform
   platformChannelId String
   name              String
   url               String
   description       String?
   thumbnailUrl      String?
   subscriberCount   Int            @default(0)
   contentCount      Int            @default(0)
   connectionType    ConnectionType @default(BASIC)
-  status            ChannelStatus  @default(ACTIVE)
+  status            ChannelStatus  @default(PENDING)
+  channelType       ChannelType    @default(OWNED)
   lastSyncedAt      DateTime?
+  lastSyncStatus    SyncStatus?
+  syncErrorMessage  String?
   createdAt         DateTime       @default(now())
   updatedAt         DateTime       @updatedAt
+  deletedAt         DateTime?

   projectId String
   project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

   connections ChannelConnection[]
   snapshots   ChannelSnapshot[]
   contents    Content[]
+  influencerProfile InfluencerProfile?   // 1:1 인플루언서 프로필
+  campaignCreators  CampaignCreator[]

   @@unique([projectId, platform, platformChannelId])
   @@index([platform])
+  @@index([channelType])
+  @@index([status])
   @@map("channels")
 }

+enum ChannelType {
+  OWNED        // 자사 채널
+  COMPETITOR   // 경쟁 채널
+  MONITORING   // 모니터링 대상
+  INFLUENCER   // 인플루언서 탐색용
+}

+enum SyncStatus {
+  SUCCESS
+  PARTIAL
+  FAILED
+}
```

**기존 ChannelStatus 확장**:

```diff
 enum ChannelStatus {
+  PENDING    // 등록됨, 첫 수집 대기
   ACTIVE
   SYNCING
   ERROR
   PAUSED
+  ARCHIVED   // 보관 (soft delete와 별도)
 }
```

### 1.3 ChannelSnapshot — 확장 지표

```diff
 model ChannelSnapshot {
   id              String   @id @default(cuid())
   date            DateTime @db.Date
   subscriberCount Int      @default(0)
   contentCount    Int      @default(0)
   totalViews      BigInt   @default(0)
   avgEngagement   Float    @default(0)
+  avgViewsPerContent  Int?
+  followerGrowth      Int?          // 전일 대비 증감
+  followerGrowthRate  Float?        // 전일 대비 증감률 %
+  estimatedReach      Int?
+  rawMetrics          Json?         // 플랫폼별 원본 확장 데이터
   createdAt       DateTime @default(now())

   channelId String
   channel   Channel @relation(fields: [channelId], references: [id], onDelete: Cascade)

   @@unique([channelId, date])
-  @@index([date])
+  @@index([channelId, date(sort: Desc)])
   @@map("channel_snapshots")
 }
```

### 1.4 CommentAnalysis — 리스크/FAQ/근거 확장

```diff
 model CommentAnalysis {
   id             String        @id @default(cuid())
   sentiment      SentimentType
   sentimentScore Float
+  sentimentReason String?       // 판단 근거
   topics         String[]
+  topicConfidence Float?
   language       String?
   isSpam         Boolean       @default(false)
+  isQuestion     Boolean       @default(false)
+  questionType   String?       // how_to, pricing, feature, complaint
+  isRisk         Boolean       @default(false)
+  riskLevel      RiskLevel?
+  suggestedReply String?
+  analyzerModel  String?       // 사용된 AI 모델 ID
   analyzedAt     DateTime      @default(now())

   commentId String  @unique
   comment   Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)

+  @@index([isRisk])
+  @@index([isQuestion])
+  @@index([sentiment])
   @@map("comment_analysis")
 }

+enum RiskLevel {
+  LOW
+  MEDIUM
+  HIGH
+  CRITICAL
+}
```

### 1.5 InsightReport — 섹션/근거 블록 연결

```diff
 model InsightReport {
   id         String       @id @default(cuid())
   type       InsightType
   title      String
   summary    String
   content    Json
   period     String?
   confidence Float        @default(0)
   status     ReportStatus @default(DRAFT)
+  shareToken String?      @unique    // 외부 공유 토큰
+  templateId String?                 // ReportTemplate 연결
   createdAt  DateTime     @default(now())
   updatedAt  DateTime     @updatedAt

   projectId   String
   project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
   generatedBy String?
   user        User?   @relation(fields: [generatedBy], references: [id], onDelete: SetNull)

   actions  InsightAction[]
+  sections ReportSection[]

   @@index([type])
   @@index([createdAt])
   @@map("insight_reports")
 }
```

### 1.6 InsightAction — 실행 추적, 캠페인 연결

```diff
 model InsightAction {
   id          String         @id @default(cuid())
   title       String
   description String
+  actionType  InsightActionType?
   priority    ActionPriority @default(MEDIUM)
   status      ActionStatus   @default(PENDING)
   dueDate     DateTime?
+  completedAt DateTime?
+  assigneeId  String?
+
+  // 출처 추적
+  sourceModule    SourceModule?
+  sourceEntityId  String?
+  sourceReason    String?
+
+  // 실행 결과
+  outcome         String?
+  impactMetric    Json?         // Before/After 지표 비교
+
+  // 캠페인 연결
+  campaignId      String?
+  campaign        Campaign? @relation(fields: [campaignId], references: [id])
+
   createdAt   DateTime     @default(now())
   updatedAt   DateTime     @updatedAt

-  reportId String
-  report   InsightReport @relation(fields: [reportId], references: [id], onDelete: Cascade)
+  reportId String?          // nullable로 변경 — 리포트 없이 생성 가능
+  report   InsightReport? @relation(fields: [reportId], references: [id], onDelete: SetNull)

+  @@index([status])
+  @@index([priority, status])
   @@map("insight_actions")
 }

+enum InsightActionType {
+  CONTENT_CREATE
+  CONTENT_OPTIMIZE
+  SEO_UPDATE
+  COMMENT_REPLY
+  COMPETITOR_WATCH
+  KEYWORD_TARGET
+  STRATEGY_ADJUST
+  RISK_MITIGATE
+  INFLUENCER_OUTREACH
+  CAMPAIGN_LAUNCH
+}

+enum SourceModule {
+  SEARCH_INTENT
+  SOCIAL_INTELLIGENCE
+  COMMENT_INTELLIGENCE
+  GEO_AEO
+  CAMPAIGN_MEASURE
+  MANUAL
+}
```

### 1.7 Enum 확장

```diff
 enum InsightType {
   SHORT_TERM
   MID_TERM
   LONG_TERM
   WEEKLY_REPORT
   MONTHLY_REPORT
+  CAMPAIGN_REPORT
+  COMPETITOR_REPORT
+  INTENT_REPORT
+  AEO_REPORT
+  FAQ_EXTRACTION
 }

 enum JobType {
   CHANNEL_SYNC
   CONTENT_SYNC
   COMMENT_SYNC
   KEYWORD_TRACK
   COMPETITOR_SYNC
   INSIGHT_GENERATE
   USAGE_AGGREGATE
+  COMMENT_ANALYZE
+  AEO_CRAWL
+  INTENT_ANALYZE
+  CAMPAIGN_METRIC_SYNC
+  DATA_EXPORT
+  REPORT_GENERATE
 }
```

---

## 2. 신규 모델 (Concept Draft)

### 2.1 IntentQuery — Search Intent 분석 요청

```prisma
model IntentQuery {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  seedKeyword     String
  locale          String  @default("ko")
  maxDepth        Int     @default(2)
  maxKeywords     Int     @default(150)

  status          AnalysisJobStatus @default(QUEUED)
  progress        Int               @default(0)
  statusMessage   String?

  resultSummary   Json?
  resultGraph     Json?

  startedAt       DateTime?
  completedAt     DateTime?
  durationMs      Int?
  tokenUsage      Int?
  estimatedCostUsd Float?

  createdAt       DateTime @default(now())

  keywords        IntentKeywordResult[]

  @@index([projectId, createdAt(sort: Desc)])
  @@map("intent_queries")
}

model IntentKeywordResult {
  id            String   @id @default(cuid())
  queryId       String
  query         IntentQuery @relation(fields: [queryId], references: [id], onDelete: Cascade)

  keyword           String
  searchVolume      Int?
  socialVolume      Int?
  trend             KeywordTrend?
  intentCategory    IntentCategory
  subIntent         String?
  confidence        Float    @default(0)
  gapScore          Float?
  gapType           GapType?
  monthlyVolumes    Json?
  socialBreakdown   Json?

  @@unique([queryId, keyword])
  @@index([queryId])
  @@map("intent_keyword_results")
}

enum AnalysisJobStatus {
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

enum IntentCategory {
  DISCOVERY
  COMPARISON
  ACTION
  TROUBLESHOOTING
  NAVIGATION
  UNKNOWN
}

enum GapType {
  BLUE_OCEAN
  OPPORTUNITY
  COMPETITIVE
  SATURATED
}
```

### 2.2 TrendKeywordAnalytics — 트렌드 키워드 분석 집계

```prisma
/// KeywordMetricDaily의 상위 집계. 키워드 간 관계 + 소셜 연계.
model TrendKeywordAnalytics {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  keyword         String
  locale          String   @default("ko")
  period          String               // "2026-03" (월별) 또는 "2026-W10" (주별)

  // 검색 지표
  avgSearchVolume     Int?
  peakSearchVolume    Int?
  searchTrend         KeywordTrend @default(STABLE)
  seasonalityScore    Float?           // 0~1, 높을수록 시즌 의존

  // 소셜 연계
  socialContentCount  Int    @default(0)
  socialAvgViews      Int?
  socialAvgEngagement Float?
  gapScore            Float?           // 검색 대비 소셜 공급 갭

  // 관련 키워드
  relatedKeywords     Json?            // [{keyword, coOccurrence, relation}]
  topContents         Json?            // [{contentId, title, views}]

  createdAt           DateTime @default(now())

  @@unique([projectId, keyword, locale, period])
  @@index([projectId, period])
  @@map("trend_keyword_analytics")
}
```

### 2.3 RawSocialMention — 원시 소셜 멘션 (소머즈형)

```prisma
/// 키워드/브랜드 멘션 원시 데이터. Data Explorer의 핵심 데이터 소스.
model RawSocialMention {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  platform          SocialPlatform
  platformPostId    String               // 원본 게시물 ID
  postUrl           String?
  authorName        String?
  authorHandle      String?
  authorFollowers   Int?

  text              String               // 원문 (최대 5000자)
  mediaType         MentionMediaType?    // TEXT, IMAGE, VIDEO, CAROUSEL
  publishedAt       DateTime

  // 지표
  viewCount         Int      @default(0)
  likeCount         Int      @default(0)
  commentCount      Int      @default(0)
  shareCount        Int      @default(0)
  engagementRate    Float    @default(0)

  // 매칭 정보
  matchedKeyword    String               // 어떤 키워드로 수집되었는가
  matchType         MentionMatchType     // EXACT, HASHTAG, CONTEXT

  // AI 분석 (수집 후 enrichment)
  sentiment         SentimentType?
  topics            String[]
  isSpam            Boolean  @default(false)

  createdAt         DateTime @default(now())

  @@unique([projectId, platform, platformPostId])
  @@index([projectId, publishedAt(sort: Desc)])
  @@index([matchedKeyword])
  @@index([platform])
  @@map("raw_social_mentions")
}

enum MentionMediaType {
  TEXT
  IMAGE
  VIDEO
  CAROUSEL
  LIVE
}

enum MentionMatchType {
  EXACT       // 정확히 키워드 포함
  HASHTAG     // 해시태그 매칭
  CONTEXT     // AI가 문맥 상 관련 판단
}
```

### 2.4 InfluencerProfile — 인플루언서 프로필 (피처링형)

```prisma
/// Channel과 1:1. 인플루언서 탐색/캠페인용 확장 프로필.
model InfluencerProfile {
  id          String   @id @default(cuid())
  channelId   String   @unique
  channel     Channel  @relation(fields: [channelId], references: [id], onDelete: Cascade)

  // 분류
  categories      String[]             // ["뷰티", "스킨케어"]
  tierLevel       InfluencerTier       // NANO ~ MEGA
  contentStyle    String[]             // ["리뷰", "튜토리얼", "VLOG"]
  targetAudience  String?              // "20대 여성"
  country         String?

  // 계산 지표 (ChannelSnapshot에서 집계)
  avgViewsRecent      Int?             // 최근 30일 평균 조회
  avgEngagementRecent Float?           // 최근 30일 평균 참여율
  estimatedReach      Int?             // 추정 도달 범위
  growthRate30d       Float?           // 30일 성장률

  // 점수
  overallScore        Float?           // 0~100 종합 점수
  scoreBreakdown      Json?            // {reach, engagement, consistency, growth}

  // 협업 이력
  totalCampaigns      Int    @default(0)
  avgCampaignRoi      Float?

  // 연락처 (에이전시용)
  contactEmail        String?
  contactNote         String?
  managementCompany   String?

  lastEvaluatedAt     DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  campaignCreators    CampaignCreator[]

  @@index([tierLevel])
  @@index([overallScore(sort: Desc)])
  @@map("influencer_profiles")
}

enum InfluencerTier {
  NANO         // 1K ~ 10K
  MICRO        // 10K ~ 50K
  MID          // 50K ~ 500K
  MACRO        // 500K ~ 1M
  MEGA         // 1M+
}
```

### 2.5 Campaign — 캠페인 (피처링형)

```prisma
model Campaign {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  name            String
  objective       String?
  campaignType    CampaignType
  status          CampaignStatus @default(DRAFT)

  startDate       DateTime?
  endDate         DateTime?
  totalBudget     Float?
  spentBudget     Float    @default(0)
  currency        String   @default("KRW")

  kpiTargets      Json?    // {targetReach, targetEngagement, customKpis[]}

  // 출처
  sourceInsightId String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  creators        CampaignCreator[]
  contents        CampaignContent[]
  metrics         CampaignMetric[]
  actions         InsightAction[]
  roiCalculations RoiCalculation[]

  @@index([projectId, status])
  @@index([startDate, endDate])
  @@map("campaigns")
}

enum CampaignType {
  INFLUENCER
  CONTENT
  PAID
  ORGANIC
  HYBRID
}

enum CampaignStatus {
  DRAFT
  ACTIVE
  PAUSED
  COMPLETED
  ARCHIVED
  CANCELLED
}
```

### 2.6 CampaignCreator (= CampaignInfluencer)

```prisma
/// 캠페인 × 인플루언서 매핑. 요청서의 CampaignInfluencer에 해당.
model CampaignCreator {
  id          String   @id @default(cuid())
  campaignId  String
  campaign    Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  // 인플루언서 연결 (둘 중 하나 이상)
  channelId           String?
  channel             Channel? @relation(fields: [channelId], references: [id])
  influencerProfileId String?
  influencerProfile   InfluencerProfile? @relation(fields: [influencerProfileId], references: [id])

  outreachStatus  OutreachStatus @default(PROPOSED)

  // 보상
  compensationType    CompensationType?
  compensationAmount  Float?
  compensationNote    String?

  // 요구사항
  deliverables        Json?    // {contentCount, contentTypes[], requirements, deadline}
  contactLog          Json?    // [{date, channel, message, response}]
  contractUrl         String?

  // 성과 요약 (Measure에서 채움)
  performanceSummary  Json?    // {totalReach, totalEngagement, cpv, cpe}

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  contents            CampaignContent[]

  @@unique([campaignId, channelId])
  @@map("campaign_creators")
}

enum OutreachStatus {
  PROPOSED
  NEGOTIATING
  CONTRACTED
  CREATING
  PUBLISHED
  COMPLETED
  DECLINED
}

enum CompensationType {
  FIXED
  REVENUE_SHARE
  PRODUCT_GIFTING
  HYBRID
}
```

### 2.7 CampaignContent — 캠페인 콘텐츠 트래킹

```prisma
model CampaignContent {
  id                  String   @id @default(cuid())
  campaignId          String
  campaign            Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  campaignCreatorId   String?
  campaignCreator     CampaignCreator? @relation(fields: [campaignCreatorId], references: [id])

  // 실제 콘텐츠 연결 (수집 후)
  contentId           String?
  platformContentUrl  String?
  platform            SocialPlatform?

  status              CampaignContentStatus @default(PLANNED)
  publishedAt         DateTime?
  trackingStartedAt   DateTime?
  trackingEndedAt     DateTime?

  contentRequirements Json?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  measurements        PostMeasurement[]

  @@map("campaign_contents")
}

enum CampaignContentStatus {
  PLANNED
  DRAFT_REVIEW
  PUBLISHED
  TRACKING
  COMPLETED
}
```

### 2.8 CampaignMetric — 캠페인 일별 성과

```prisma
model CampaignMetric {
  id          String   @id @default(cuid())
  campaignId  String
  campaign    Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  date        DateTime @db.Date

  totalReach          Int      @default(0)
  totalEngagement     Int      @default(0)
  totalNewFollowers   Int      @default(0)
  spentBudget         Float    @default(0)

  contentMetrics      Json?    // [{contentId, views, likes, comments, shares}]
  derivedMetrics      Json?    // {cpm, cpv, cpe, engagementRate}

  collectedAt         DateTime @default(now())

  @@unique([campaignId, date])
  @@index([campaignId, date(sort: Desc)])
  @@map("campaign_metrics")
}
```

### 2.9 PostMeasurement — 개별 콘텐츠 성과 측정

```prisma
model PostMeasurement {
  id                  String   @id @default(cuid())
  campaignContentId   String
  campaignContent     CampaignContent @relation(fields: [campaignContentId], references: [id], onDelete: Cascade)
  date                DateTime @db.Date

  viewCount           Int      @default(0)
  likeCount           Int      @default(0)
  commentCount        Int      @default(0)
  shareCount          Int      @default(0)
  engagementRate      Float    @default(0)
  estimatedReach      Int?
  brandMentionCount   Int?
  sentimentSummary    Json?    // {positive, neutral, negative, topTopics[]}

  createdAt           DateTime @default(now())

  @@unique([campaignContentId, date])
  @@map("post_measurements")
}
```

### 2.10 RoiCalculation — ROI 산출

```prisma
model RoiCalculation {
  id          String   @id @default(cuid())
  campaignId  String
  campaign    Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  calculatedAt    DateTime @default(now())

  // 투자
  totalCost           Float
  costBreakdown       Json?    // [{item, amount}]
  currency            String   @default("KRW")

  // 성과
  totalReach          Int
  totalEngagement     Int
  estimatedMediaValue Float?   // EMV
  newFollowers        Int      @default(0)
  conversions         Int      @default(0)

  // 비율
  roi                 Float?   // (returns - cost) / cost
  roas                Float?
  cpm                 Float?
  cpv                 Float?
  cpe                 Float?
  costPerFollower     Float?

  benchmarkComparison Json?    // {industryAvgCpm, percentileRank}
  aiSummary           String?

  @@index([campaignId])
  @@map("roi_calculations")
}
```

### 2.11 AeoKeyword & AeoSnapshot — GEO/AEO Citation 추적

```prisma
model AeoKeyword {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  keyword         String
  locale          String        @default("ko")
  targetBrand     String?
  competitorBrands String[]
  status          KeywordStatus @default(ACTIVE)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  snapshots       AeoSnapshot[]

  @@unique([projectId, keyword, locale])
  @@map("aeo_keywords")
}

model AeoSnapshot {
  id          String   @id @default(cuid())
  keywordId   String
  keyword     AeoKeyword @relation(fields: [keywordId], references: [id], onDelete: Cascade)
  date        DateTime @db.Date

  engine              AeoEngine
  aiResponse          String?
  citedSources        Json?    // [{url, title, domain, rank, isBrand, isCompetitor}]

  brandMentioned      Boolean  @default(false)
  brandCitedRank      Int?
  competitorMentions  Json?    // [{brand, mentioned, rank}]
  visibilityScore     Float?   // 0~100

  createdAt           DateTime @default(now())

  @@unique([keywordId, date, engine])
  @@index([keywordId, date(sort: Desc)])
  @@map("aeo_snapshots")
}

enum AeoEngine {
  GOOGLE_AI_OVERVIEW
  PERPLEXITY
  BING_COPILOT
  CHATGPT_SEARCH
}
```

### 2.12 VerticalPack & WorkspaceVerticalPack

```prisma
model VerticalPack {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String?
  industry    IndustryType
  isActive    Boolean  @default(true)

  // 사전 정의 데이터 (DB에서 관리, 하드코딩 금지)
  seedKeywords        Json?    // ["키워드1", "키워드2", ...]
  benchmarkBaseline   Json?    // {avgEngagement, avgFollowers, ...}
  topicTaxonomy       Json?    // {categories: [{name, subcategories}]}
  competitorPresets   Json?    // [{name, platform, url}]

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  workspaces          WorkspaceVerticalPack[]
  reportTemplates     ReportTemplate[]

  @@map("vertical_packs")
}

/// M:N 조인 테이블
model WorkspaceVerticalPack {
  id              String   @id @default(cuid())
  workspaceId     String
  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  verticalPackId  String
  verticalPack    VerticalPack @relation(fields: [verticalPackId], references: [id], onDelete: Cascade)
  activatedAt     DateTime @default(now())

  @@unique([workspaceId, verticalPackId])
  @@map("workspace_vertical_packs")
}
```

### 2.13 ReportSection & EvidenceAsset (= EvidenceBlock)

```prisma
model ReportSection {
  id          String   @id @default(cuid())
  reportId    String
  report      InsightReport @relation(fields: [reportId], references: [id], onDelete: Cascade)

  title       String
  order       Int          @default(0)
  narrative   String?      // AI 생성 해석 텍스트 ({{evidence:ID}} 마커 포함)
  isAutoGenerated Boolean  @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  evidenceAssets EvidenceAsset[]

  @@index([reportId, order])
  @@map("report_sections")
}

/// 리포트 내 근거 블록. 차트/테이블/수치/인용 등.
model EvidenceAsset {
  id              String   @id @default(cuid())
  sectionId       String
  section         ReportSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)

  type            EvidenceType
  order           Int      @default(0)
  title           String?
  narrative       String?      // AI 해석 텍스트

  // 데이터 연결 (Mock 금지 — 반드시 실데이터 참조)
  dataSourceType  DataSourceType
  dataEntityIds   String[]     // 참조 원본 레코드 ID 목록
  dataQuery       Json?        // {table, filters, dateRange, metrics, groupBy}
  snapshotDate    DateTime?    // 데이터 기준 시점

  // 시각화
  visualization   Json?        // {chartType, config, size}
  isEditable      Boolean  @default(true)

  createdAt       DateTime @default(now())

  @@index([sectionId, order])
  @@map("evidence_assets")
}

enum EvidenceType {
  METRIC           // 단일 수치 + 변화율
  CHART            // 시계열/비교 차트
  TABLE            // 데이터 테이블
  QUOTE            // 댓글/콘텐츠 원문 인용
  COMPARISON       // Before/After
  RANKING          // 순위
  HEATMAP          // 시간대별
  DISTRIBUTION     // 파이/도넛 비율
}

enum DataSourceType {
  CHANNEL_SNAPSHOT
  CONTENT_METRIC
  COMMENT_ANALYSIS
  INTENT_RESULT
  AEO_SNAPSHOT
  CAMPAIGN_METRIC
  KEYWORD_METRIC
  RAW_MENTION
}
```

### 2.14 CitationReadyReportSource — GEO/AEO 인용 대응 콘텐츠 관리

```prisma
/// 우리 콘텐츠 중 AI 검색엔진에 인용되기 원하는 소스 관리.
/// AEO 최적화 전략의 핵심 — 출처 우선순위 관리 구조.
model CitationReadyReportSource {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // 소스 정보
  url             String
  title           String
  domain          String
  sourceType      CitationSourceType   // BLOG, LANDING, PRODUCT, FAQ, VIDEO
  contentSummary  String?              // AI가 요약한 콘텐츠 핵심

  // 타겟 키워드 매핑
  targetKeywords  String[]             // 이 소스가 인용되기 원하는 키워드들
  primaryTopic    String?

  // 현재 인용 상태 (AeoSnapshot에서 집계)
  currentCitationCount  Int    @default(0)   // 현재 인용 중인 엔진 수
  lastCitedDate         DateTime?
  lastCitedEngine       AeoEngine?
  citationHistory       Json?                // [{date, engine, rank}]

  // 최적화 상태
  geoOptimized          Boolean @default(false)
  lastOptimizedAt       DateTime?
  optimizationNotes     String?

  // 우선순위
  priority              Int     @default(0)  // 높을수록 우선
  isActive              Boolean @default(true)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([projectId, url])
  @@index([projectId, isActive])
  @@index([currentCitationCount(sort: Desc)])
  @@map("citation_ready_sources")
}

enum CitationSourceType {
  BLOG_POST
  LANDING_PAGE
  PRODUCT_PAGE
  FAQ_PAGE
  VIDEO
  RESEARCH_REPORT
  PRESS_RELEASE
  SOCIAL_POST
}
```

### 2.15 ReportTemplate

```prisma
model ReportTemplate {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?

  sectionDefinitions  Json     // [{title, type, dataRequirements[], autoGenerate}]
  isSystem            Boolean  @default(false)

  verticalPackId      String?
  verticalPack        VerticalPack? @relation(fields: [verticalPackId], references: [id])

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@map("report_templates")
}
```

### 2.16 SavedFilter & DataExportJob

```prisma
model SavedFilter {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdBy   String

  name            String
  dataType        ExplorerDataType
  filterConfig    Json
  isShared        Boolean @default(false)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("saved_filters")
}

model DataExportJob {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  requestedBy String

  dataType        ExplorerDataType
  filterConfig    Json
  format          ExportFormat
  status          ExportJobStatus @default(QUEUED)
  rowCount        Int?
  fileUrl         String?
  expiresAt       DateTime?
  errorMessage    String?

  createdAt       DateTime @default(now())

  @@index([projectId, status])
  @@map("data_export_jobs")
}

enum ExplorerDataType {
  CONTENT
  COMMENT
  CHANNEL_METRIC
  KEYWORD_METRIC
  INTENT_RESULT
  AEO_SNAPSHOT
  RAW_MENTION
  CAMPAIGN_METRIC
}

enum ExportFormat {
  CSV
  EXCEL
  JSON
}

enum ExportJobStatus {
  QUEUED
  PROCESSING
  READY
  EXPIRED
  FAILED
}
```

---

## 3. Project 관계 확장 (Diff)

```diff
 model Project {
   id          String   @id @default(cuid())
   name        String
   description String?
   createdAt   DateTime @default(now())
   updatedAt   DateTime @updatedAt

   workspaceId String
   workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

   channels           Channel[]
   competitorChannels CompetitorChannel[]
   keywords           Keyword[]
   insightReports     InsightReport[]
+  intentQueries      IntentQuery[]
+  aeoKeywords        AeoKeyword[]
+  campaigns          Campaign[]
+  trendAnalytics     TrendKeywordAnalytics[]
+  rawMentions        RawSocialMention[]
+  savedFilters       SavedFilter[]
+  dataExportJobs     DataExportJob[]
+  citationSources    CitationReadyReportSource[]

   @@map("projects")
 }
```

---

## 4. 신규 모델 요약

| #   | 모델                      | 목적                   | Phase |
| --- | ------------------------- | ---------------------- | ----- |
| 1   | IntentQuery               | 인텐트 분석 요청/결과  | 3     |
| 2   | IntentKeywordResult       | 개별 키워드 분류 결과  | 3     |
| 3   | TrendKeywordAnalytics     | 키워드 트렌드 집계     | 3     |
| 4   | RawSocialMention          | 원시 소셜 멘션         | 2     |
| 5   | InfluencerProfile         | 인플루언서 확장 프로필 | 6     |
| 6   | Campaign                  | 캠페인                 | 6     |
| 7   | CampaignCreator           | 캠페인×인플루언서      | 6     |
| 8   | CampaignContent           | 캠페인 콘텐츠 트래킹   | 6     |
| 9   | CampaignMetric            | 캠페인 일별 성과       | 7     |
| 10  | PostMeasurement           | 개별 콘텐츠 측정       | 7     |
| 11  | RoiCalculation            | ROI 산출               | 7     |
| 12  | AeoKeyword                | GEO/AEO 추적 키워드    | 4     |
| 13  | AeoSnapshot               | AI 검색 답변 스냅샷    | 4     |
| 14  | VerticalPack              | 산업별 팩 정의         | 8     |
| 15  | WorkspaceVerticalPack     | 워크스페이스×팩 연결   | 8     |
| 16  | ReportSection             | 리포트 섹션            | 5     |
| 17  | EvidenceAsset             | 근거 블록              | 5     |
| 18  | ReportTemplate            | 리포트 템플릿          | 5     |
| 19  | CitationReadyReportSource | 인용 대응 소스 관리    | 4     |
| 20  | SavedFilter               | 저장된 필터            | 2     |
| 21  | DataExportJob             | 데이터 내보내기 작업   | 2     |

**신규 Enum**: 21개 추가
