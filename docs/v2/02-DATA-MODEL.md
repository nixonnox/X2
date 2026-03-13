# X2 v2 — Data Model & Schema Design

> 작성일: 2026-03-10
> 상태: Draft

---

## 1. 설계 원칙

1. **시계열 우선**: 모든 지표는 일별 스냅샷으로 저장 (추이 분석 가능)
2. **파이프라인 추적**: 모든 수집/분석 작업은 상태와 에러를 기록
3. **멀티테넌시**: Workspace → Project → Channel 계층
4. **Soft Delete**: 중요 엔티티는 deletedAt 소프트 삭제
5. **JSON 유연성**: 분석 결과는 구조화 JSON으로 저장 (스키마 진화 용이)

---

## 2. 도메인 모델 다이어그램

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│    User      │────→│  Workspace   │────→│   Project    │
└─────────────┘     │  (멀티테넌시) │     │  (분석 단위)  │
                    └──────────────┘     └──────┬───────┘
                                               │
                    ┌──────────────────────────────────────────────┐
                    │                      │                       │
              ┌─────▼─────┐        ┌───────▼──────┐       ┌───────▼──────┐
              │  Channel   │        │ IntentQuery  │       │  AeoKeyword  │
              │ (소셜 채널) │        │ (검색 의도)   │       │ (AI 가시성)  │
              └─────┬─────┘        └───────┬──────┘       └───────┬──────┘
                    │                      │                       │
         ┌──────────┼──────────┐           │                       │
         │          │          │           │                       │
   ┌─────▼───┐ ┌───▼────┐ ┌──▼────┐ ┌────▼─────┐          ┌─────▼──────┐
   │ Channel  │ │Content │ │Comment│ │ Intent   │          │ Aeo        │
   │ Snapshot │ │        │ │       │ │ Keyword  │          │ Snapshot   │
   │ (일별)   │ │        │ │       │ │ Result   │          │ (AI답변)   │
   └─────────┘ └───┬────┘ └──┬────┘ └──────────┘          └────────────┘
                    │         │
              ┌─────▼───┐ ┌──▼──────────┐
              │ Content  │ │ Comment     │
              │ Metric   │ │ Analysis    │
              │ Daily    │ │ (감성/토픽)  │
              └─────────┘ └─────────────┘

                    ┌──────────────┐
                    │ InsightReport│ ← 크로스 도메인 (채널/키워드/댓글 기반)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │InsightAction│ ← 액션 아이템
                    └─────────────┘
```

---

## 3. 스키마 상세 (v2 변경사항 중심)

### 3.1 기존 유지 모델 (변경 최소)

기존 Prisma 스키마의 다음 모델은 구조 유지:

- `User`, `Account`, `Session`, `VerificationToken` — Auth.js 호환
- `Workspace`, `WorkspaceMember` — 멀티테넌시
- `Platform` — YOUTUBE, INSTAGRAM, TIKTOK, X
- `Subscription`, `UsageMetric` — 결제/사용량

### 3.2 변경/확장 모델

#### Channel (확장)

```prisma
model Channel {
  id                String   @id @default(cuid())
  projectId         String
  project           Project  @relation(fields: [projectId], references: [id])

  platform          PlatformType
  platformChannelId String          // 플랫폼 고유 ID
  name              String
  url               String          // 정규화된 URL
  thumbnailUrl      String?
  description       String?         // v2: 채널 설명 추가

  // 연결 정보
  connectionType    ConnectionType  @default(BASIC)
  connectionId      String?         // OAuth 연결 시

  // 분류
  channelType       ChannelType     @default(OWNED)  // v2: OWNED, COMPETITOR, MONITORING
  category          String?
  tags              String[]
  country           String?

  // 상태
  status            ChannelStatus   @default(PENDING)  // v2: PENDING 추가
  lastSyncAt        DateTime?
  lastSyncStatus    SyncStatus?     // v2: SUCCESS, PARTIAL, FAILED
  syncErrorMessage  String?         // v2: 마지막 에러 메시지

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  deletedAt         DateTime?       // v2: 소프트 삭제

  // Relations
  snapshots         ChannelSnapshot[]
  contents          Content[]
  competitorLinks   CompetitorChannel[]

  @@unique([projectId, platform, platformChannelId])
}

enum ChannelType {
  OWNED
  COMPETITOR
  MONITORING
}

enum ChannelStatus {
  PENDING       // 등록됨, 첫 수집 대기
  ACTIVE        // 정상 수집 중
  SYNCING       // 수집 진행 중
  ERROR         // 수집 실패
  PAUSED        // 수동 일시정지
  ARCHIVED      // 보관
}

enum SyncStatus {
  SUCCESS
  PARTIAL       // 일부 데이터만 수집 (rate limit 등)
  FAILED
}
```

#### ChannelSnapshot (확장)

```prisma
model ChannelSnapshot {
  id          String   @id @default(cuid())
  channelId   String
  channel     Channel  @relation(fields: [channelId], references: [id])
  date        DateTime @db.Date       // 일별 키

  // 핵심 지표
  followerCount     Int      @default(0)
  contentCount      Int      @default(0)
  totalViewCount    BigInt   @default(0)   // v2: BigInt (YouTube 대형 채널)
  engagementRate    Float    @default(0)

  // v2: 확장 지표
  avgViewsPerContent    Int?      // 평균 조회수/콘텐츠
  avgEngagementRate     Float?    // 평균 참여율
  followerGrowth        Int?      // 전일 대비 증감
  followerGrowthRate    Float?    // 전일 대비 증감률
  estimatedReach        Int?      // 추정 도달 수

  // 원본 데이터 (플랫폼별 확장 필드)
  rawMetrics    Json?            // v2: 플랫폼별 원본 지표 저장

  createdAt     DateTime @default(now())

  @@unique([channelId, date])
  @@index([channelId, date(sort: Desc)])
}
```

#### Content (확장)

```prisma
model Content {
  id                String   @id @default(cuid())
  channelId         String
  channel           Channel  @relation(fields: [channelId], references: [id])
  platformContentId String         // 플랫폼 고유 콘텐츠 ID

  // 메타데이터
  title             String
  description       String?        // v2 추가
  contentType       ContentType
  url               String?
  thumbnailUrl      String?
  publishedAt       DateTime
  duration          Int?           // v2: 동영상 길이 (초)

  // 최신 지표 (비정규화 — 빠른 목록 조회용)
  viewCount         Int      @default(0)
  likeCount         Int      @default(0)
  commentCount      Int      @default(0)
  shareCount        Int?
  engagementRate    Float    @default(0)

  // v2: 분석 결과
  topicTags         String[]       // AI 추출 토픽
  sentimentScore    Float?         // -1.0 ~ 1.0

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  metrics           ContentMetricDaily[]
  comments          Comment[]

  @@unique([channelId, platformContentId])
  @@index([channelId, publishedAt(sort: Desc)])
}
```

### 3.3 신규 모델

#### IntentQuery (Search Intent 분석 요청)

```prisma
model IntentQuery {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])

  seedKeyword     String          // 시드 키워드
  locale          String  @default("ko")
  maxDepth        Int     @default(2)
  maxKeywords     Int     @default(150)

  // 분석 상태
  status          AnalysisStatus  @default(QUEUED)
  progress        Int     @default(0)   // 0~100
  statusMessage   String?

  // 결과
  resultSummary   Json?           // KPI 요약 (총 키워드 수, 의도 분포 등)
  resultGraph     Json?           // 노드/링크 그래프 데이터
  resultKeywords  Json?           // 분류된 키워드 목록

  // 메타
  startedAt       DateTime?
  completedAt     DateTime?
  durationMs      Int?
  tokenUsage      Int?            // AI 토큰 사용량
  estimatedCost   Float?          // USD

  createdAt       DateTime @default(now())

  // Relations
  keywords        IntentKeywordResult[]

  @@index([projectId, createdAt(sort: Desc)])
}

model IntentKeywordResult {
  id            String   @id @default(cuid())
  queryId       String
  query         IntentQuery @relation(fields: [queryId], references: [id])

  keyword           String
  searchVolume      Int?
  socialVolume      Int?
  trend             TrendDirection?
  intentCategory    IntentCategory
  subIntent         String?
  confidence        Float    @default(0)
  gapScore          Float?          // 검색 vs 소셜 갭
  gapType           GapType?

  monthlyVolumes    Json?           // 12개월 검색량
  socialBreakdown   Json?           // 플랫폼별 소셜 볼륨

  @@unique([queryId, keyword])
  @@index([queryId])
}

enum AnalysisStatus {
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
  BLUE_OCEAN       // 검색 수요 높지만 콘텐츠 없음
  OPPORTUNITY      // 콘텐츠 있지만 부족
  COMPETITIVE      // 콘텐츠 충분, 경쟁 치열
  SATURATED        // 과포화
}
```

#### AeoKeyword & AeoSnapshot (GEO/AEO)

```prisma
model AeoKeyword {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])

  keyword         String
  locale          String   @default("ko")
  targetBrand     String?          // 추적 대상 브랜드명
  competitorBrands String[]        // 비교 대상 브랜드들

  status          KeywordStatus @default(ACTIVE)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  snapshots       AeoSnapshot[]

  @@unique([projectId, keyword, locale])
}

model AeoSnapshot {
  id          String   @id @default(cuid())
  keywordId   String
  keyword     AeoKeyword @relation(fields: [keywordId], references: [id])
  date        DateTime @db.Date

  // AI 검색엔진별 결과
  engine          AeoEngine        // GOOGLE_AI, PERPLEXITY, BING_COPILOT, CHATGPT
  aiResponse      String?          // AI 생성 답변 원문 (요약)
  citedSources    Json?            // [{url, title, rank}]

  // 가시성 지표
  brandMentioned      Boolean @default(false)  // 우리 브랜드 언급 여부
  brandCitedRank      Int?                      // 인용 순위 (1=최상위)
  competitorMentions  Json?                      // [{brand, mentioned, rank}]

  // 점수
  visibilityScore     Float?    // 0~100 종합 가시성 점수

  createdAt   DateTime @default(now())

  @@unique([keywordId, date, engine])
  @@index([keywordId, date(sort: Desc)])
}

enum AeoEngine {
  GOOGLE_AI_OVERVIEW
  PERPLEXITY
  BING_COPILOT
  CHATGPT_SEARCH
}
```

#### CommentAnalysis (확장)

```prisma
model CommentAnalysis {
  id          String   @id @default(cuid())
  commentId   String   @unique
  comment     Comment  @relation(fields: [commentId], references: [id])

  // 감성 분석
  sentiment       Sentiment
  sentimentScore  Float           // -1.0 ~ 1.0 (정밀 점수)
  sentimentReason String?         // v2: 판단 근거

  // 토픽 분류
  topics          String[]
  topicConfidence Float?

  // v2: 확장 분석
  isQuestion      Boolean @default(false)   // FAQ 후보
  questionType    String?                    // how_to, pricing, feature, complaint
  isSpam          Boolean @default(false)
  isRisk          Boolean @default(false)    // 위기/부정 이슈
  riskLevel       RiskLevel?
  suggestedReply  String?                    // AI 대응 제안

  // v2: 의도 연결
  relatedIntent   String?         // 연관 검색 의도 키워드

  analyzedAt      DateTime @default(now())
  analyzerModel   String?         // 사용된 AI 모델

  @@index([sentiment])
  @@index([isRisk])
  @@index([isQuestion])
}

enum RiskLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

#### InsightAction (확장)

```prisma
model InsightAction {
  id          String   @id @default(cuid())
  reportId    String?
  report      InsightReport? @relation(fields: [reportId], references: [id])
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])

  // 액션 정의
  title           String
  description     String
  actionType      ActionType
  priority        Priority
  status          ActionStatus @default(PENDING)

  // v2: 출처 추적
  sourceModule    ModuleType          // 어느 모듈에서 생성되었는가
  sourceEntityId  String?             // 원본 엔티티 ID
  sourceReason    String?             // 생성 근거

  // v2: 실행
  assigneeId      String?             // 담당자
  dueDate         DateTime?
  completedAt     DateTime?
  outcome         String?             // 실행 결과
  impactMetric    Json?               // 실행 전후 지표 비교

  // v2: 자동화
  automationRuleId String?
  isAutoExecuted   Boolean @default(false)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([projectId, status])
  @@index([priority, status])
}

enum ActionType {
  CONTENT_CREATE       // 콘텐츠 제작
  CONTENT_OPTIMIZE     // 기존 콘텐츠 최적화
  SEO_UPDATE           // SEO/GEO 최적화
  COMMENT_REPLY        // 댓글 대응
  COMPETITOR_WATCH     // 경쟁사 모니터링 강화
  KEYWORD_TARGET       // 키워드 타겟팅
  STRATEGY_ADJUST      // 전략 변경
  RISK_MITIGATE        // 리스크 대응
}

enum ModuleType {
  SEARCH_INTENT
  SOCIAL_INTELLIGENCE
  COMMENT_INTELLIGENCE
  GEO_AEO
  MANUAL
}
```

#### AutomationRule (신규)

```prisma
model AutomationRule {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])

  name            String
  description     String?
  isActive        Boolean @default(true)

  // 트리거 조건
  triggerType     TriggerType
  triggerConfig   Json            // 조건 상세 (threshold, platform 등)

  // 실행 액션
  actionType      AutoActionType
  actionConfig    Json            // 실행 상세 (template, destination 등)

  // 통계
  executionCount  Int    @default(0)
  lastExecutedAt  DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum TriggerType {
  METRIC_THRESHOLD     // 지표가 임계값 초과/미달
  SENTIMENT_SHIFT      // 감성 급변
  RISK_DETECTED        // 리스크 감지
  TREND_CHANGE         // 트렌드 변화
  SCHEDULE             // 정기 스케줄
}

enum AutoActionType {
  CREATE_ACTION_ITEM
  SEND_NOTIFICATION
  GENERATE_REPORT
  SLACK_WEBHOOK
  EMAIL_ALERT
}
```

---

## 4. 마이그레이션 전략

### Phase 1: 기존 스키마 + v2 확장 필드 추가

```
기존 모델에 nullable 필드 추가 → 기존 코드 깨지지 않음
새 모델(IntentQuery, AeoKeyword 등) 추가 → 기존 코드 영향 없음
```

### Phase 2: 인메모리 스토어 → DB 전환

```
channelService (globalThis) → Prisma Channel/ChannelSnapshot 쿼리
단계적 전환: 읽기 먼저 DB로, 쓰기는 이후
```

### Phase 3: 데이터 파이프라인 연결

```
ScheduledJob → BullMQ Worker → Social API → DB 저장
```

---

## 5. 인덱스 전략

| 모델                | 인덱스                        | 용도                   |
| ------------------- | ----------------------------- | ---------------------- |
| ChannelSnapshot     | `[channelId, date DESC]`      | 채널별 최신 스냅샷     |
| ContentMetricDaily  | `[contentId, date DESC]`      | 콘텐츠별 일별 지표     |
| Comment             | `[contentId, createdAt DESC]` | 콘텐츠별 최신 댓글     |
| CommentAnalysis     | `[sentiment]`, `[isRisk]`     | 감성/리스크 필터링     |
| IntentKeywordResult | `[queryId]`                   | 분석 결과 조회         |
| AeoSnapshot         | `[keywordId, date DESC]`      | 키워드별 최신 AI 답변  |
| InsightAction       | `[projectId, status]`         | 프로젝트별 미완료 액션 |
