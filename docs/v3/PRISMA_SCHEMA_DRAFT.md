# PRISMA_SCHEMA_DRAFT — Prisma 스키마 변경 초안

> 작성일: 2026-03-10
> 상태: 초안 (리뷰 후 적용)
> 원칙: 비파괴적 변경만. 기존 데이터/구조 보존.

---

## 1. 변경 범위 요약

| 구분        | 내용                                                                 | 수량 |
| ----------- | -------------------------------------------------------------------- | ---- |
| 신규 모델   | FAQCandidate, RiskSignal, Notification                               | 3개  |
| 모델 확장   | Workspace, User, Project, ScheduledJob, UsageMetric                  | 5개  |
| 신규 Enum   | FAQStatus, RiskSignalStatus, NotificationType, NotificationPriority  | 4개  |
| Enum 확장   | JobType, InsightType, DataSourceType, SourceModule, ExplorerDataType | 5개  |
| 인덱스 추가 | CommentAnalysis, RawSocialMention, InsightAction, Content            | 4개  |

---

## 2. 신규 모델 Diff

### 2.1 FAQCandidate

```prisma
// ============================================
// FAQ Intelligence (Phase 2)
// ============================================

model FAQCandidate {
  id        String  @id @default(cuid())
  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // FAQ 질문 그룹
  question         String
  questionVariants String[]
  category         String?

  // 출처 추적
  sourceCommentIds String[]
  mentionCount     Int      @default(0)
  firstSeenAt      DateTime
  lastSeenAt       DateTime

  // 현재 대응 상태
  hasAnswer       Boolean @default(false)
  answerUrl       String?
  answerContentId String?

  // AI 분석
  urgencyScore    Float?
  businessImpact  String?
  suggestedAction String?

  // 상태
  status     FAQStatus @default(DETECTED)
  resolvedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([projectId, question])
  @@index([projectId, status])
  @@index([mentionCount(sort: Desc)])
  @@map("faq_candidates")
}
```

### 2.2 RiskSignal

```prisma
// ============================================
// Risk Intelligence (Phase 2)
// ============================================

model RiskSignal {
  id        String  @id @default(cuid())
  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // 리스크 정보
  title       String
  description String?
  riskType    String
  severity    RiskLevel // 기존 enum 재사용

  // 근거
  sourceCommentIds String[]
  sourceMentionIds String[]
  sampleTexts      String[]
  signalCount      Int      @default(0)

  // 시간 범위
  detectedAt      DateTime
  firstOccurrence DateTime
  lastOccurrence  DateTime

  // 상태 관리
  status         RiskSignalStatus @default(ACTIVE)
  assigneeId     String?
  responseNote   String?
  resolvedAt     DateTime?

  // AI 분석
  rootCauseAnalysis String?
  recommendedAction String?
  estimatedImpact   String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([projectId, status])
  @@index([severity])
  @@index([detectedAt(sort: Desc)])
  @@map("risk_signals")
}
```

### 2.3 Notification

```prisma
// ============================================
// Notifications (Phase 2)
// ============================================

model Notification {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  workspaceId String?

  // 알림 내용
  type     NotificationType
  title    String
  message  String
  priority NotificationPriority @default(NORMAL)

  // 출처
  sourceType String?
  sourceId   String?
  actionUrl  String?

  // 상태
  isRead Boolean   @default(false)
  readAt DateTime?

  // 발송 채널
  channels    String[]
  emailSentAt DateTime?

  createdAt DateTime @default(now())

  @@index([userId, isRead])
  @@index([userId, createdAt(sort: Desc)])
  @@index([workspaceId, createdAt(sort: Desc)])
  @@map("notifications")
}
```

---

## 3. 기존 모델 확장 Diff

### 3.1 Workspace 확장

```diff
 model Workspace {
   id           String        @id @default(cuid())
   name         String
   slug         String        @unique
   plan         Plan          @default(FREE)
   planTier     PlanTier      @default(STANDARD)
   industryType IndustryType?
   createdAt    DateTime      @default(now())
   updatedAt    DateTime      @updatedAt

+  // Plan Limits (플랜별 역량 — Subscription과 동기화)
+  maxChannels         Int     @default(3)
+  maxContentsPerMonth Int     @default(500)
+  maxCommentsPerMonth Int     @default(1000)
+  maxAiTokensPerDay   Int     @default(5000)
+  maxMembers          Int     @default(1)
+  maxReportsPerMonth  Int     @default(3)
+  canExportData       Boolean @default(false)
+  canAccessApi        Boolean @default(false)
+  maxVerticalPacks    Int     @default(0)

   members       WorkspaceMember[]
   projects      Project[]
   subscriptions Subscription[]
   usageMetrics  UsageMetric[]
   scheduledJobs ScheduledJob[]
   verticalPacks WorkspaceVerticalPack[]

   @@map("workspaces")
 }
```

**마이그레이션 전략**: 모든 새 필드에 `@default` 존재 → 기존 행 자동 채워짐. FREE 플랜 기본값으로 설정.

### 3.2 User 확장

```diff
 model User {
   id            String    @id @default(cuid())
   name          String?
   email         String    @unique
   emailVerified DateTime?
   image         String?
   createdAt     DateTime  @default(now())
   updatedAt     DateTime  @updatedAt

   accounts         Account[]
   sessions         Session[]
   workspaceMembers WorkspaceMember[]
   insightReports   InsightReport[]
+  notifications    Notification[]

   @@map("users")
 }
```

### 3.3 Project 확장

```diff
 model Project {
   ...
   channels           Channel[]
   competitorChannels CompetitorChannel[]
   keywords           Keyword[]
   insightReports     InsightReport[]
   intentQueries      IntentQuery[]
   aeoKeywords        AeoKeyword[]
   campaigns          Campaign[]
   trendAnalytics     TrendKeywordAnalytics[]
   rawMentions        RawSocialMention[]
   savedFilters       SavedFilter[]
   dataExportJobs     DataExportJob[]
   citationSources    CitationReadyReportSource[]
+  faqCandidates      FAQCandidate[]
+  riskSignals        RiskSignal[]

   @@map("projects")
 }
```

### 3.4 ScheduledJob 확장

```diff
 model ScheduledJob {
   id         String    @id @default(cuid())
   type       JobType
   cronExpr   String
   payload    Json?
   status     JobStatus @default(ACTIVE)
   lastRunAt  DateTime?
   nextRunAt  DateTime?
   lastError  String?
   retryCount Int       @default(0)
+  durationMs Int?              // 마지막 실행 소요 시간
+  jobGroup   String?           // 논리적 그룹핑 (예: "channel_sync_youtube")
   createdAt  DateTime  @default(now())
   updatedAt  DateTime  @updatedAt

   workspaceId String
   workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

   @@index([status, nextRunAt])
+  @@index([jobGroup])
   @@map("scheduled_jobs")
 }
```

### 3.5 UsageMetric 확장

```diff
 model UsageMetric {
   id           String   @id @default(cuid())
   date         DateTime @db.Date
   channelCount Int      @default(0)
   contentCount Int      @default(0)
   commentCount Int      @default(0)
   apiCallCount Int      @default(0)
   aiTokensUsed Int      @default(0)
+  aiCostUsd    Float    @default(0)    // 추정 AI 비용 (USD)
+  reportCount  Int      @default(0)    // 생성된 리포트 수
+  exportCount  Int      @default(0)    // 데이터 내보내기 수
   createdAt    DateTime @default(now())

   workspaceId String
   workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

   @@unique([workspaceId, date])
   @@index([date])
   @@map("usage_metrics")
 }
```

---

## 4. 신규 Enum

```prisma
// FAQ
enum FAQStatus {
  DETECTED
  REVIEWING
  ANSWERED
  DISMISSED
}

// Risk Signal
enum RiskSignalStatus {
  ACTIVE
  INVESTIGATING
  RESPONDING
  RESOLVED
  DISMISSED
}

// Notification
enum NotificationType {
  SYNC_FAILURE
  TOKEN_LIMIT_WARNING
  RISK_DETECTED
  OAUTH_EXPIRED
  REPORT_READY
  CAMPAIGN_UPDATE
  PLAN_LIMIT_WARNING
  SENTIMENT_SPIKE
  CITATION_CHANGE
  SYSTEM_ALERT
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

---

## 5. 기존 Enum 확장 Diff

### 5.1 JobType

```diff
 enum JobType {
   CHANNEL_SYNC
   CONTENT_SYNC
   COMMENT_SYNC
   KEYWORD_TRACK
   COMPETITOR_SYNC
   INSIGHT_GENERATE
   USAGE_AGGREGATE
   COMMENT_ANALYZE
   AEO_CRAWL
   INTENT_ANALYZE
   CAMPAIGN_METRIC_SYNC
   DATA_EXPORT
   REPORT_GENERATE
+  FAQ_EXTRACT
+  RISK_DETECT
+  NOTIFICATION_SEND
 }
```

### 5.2 InsightType

```diff
 enum InsightType {
   SHORT_TERM
   MID_TERM
   LONG_TERM
   WEEKLY_REPORT
   MONTHLY_REPORT
   CAMPAIGN_REPORT
   COMPETITOR_REPORT
   INTENT_REPORT
   AEO_REPORT
   FAQ_EXTRACTION
+  RISK_REPORT
+  FAQ_REPORT
 }
```

### 5.3 DataSourceType

```diff
 enum DataSourceType {
   CHANNEL_SNAPSHOT
   CONTENT_METRIC
   COMMENT_ANALYSIS
   INTENT_RESULT
   AEO_SNAPSHOT
   CAMPAIGN_METRIC
   KEYWORD_METRIC
   RAW_MENTION
+  FAQ_CANDIDATE
+  RISK_SIGNAL
 }
```

### 5.4 SourceModule

```diff
 enum SourceModule {
   SEARCH_INTENT
   SOCIAL_INTELLIGENCE
   COMMENT_INTELLIGENCE
   GEO_AEO
   CAMPAIGN_MEASURE
   MANUAL
+  FAQ_ENGINE
+  RISK_ENGINE
 }
```

### 5.5 ExplorerDataType

```diff
 enum ExplorerDataType {
   CONTENT
   COMMENT
   CHANNEL_METRIC
   KEYWORD_METRIC
   INTENT_RESULT
   AEO_SNAPSHOT
   RAW_MENTION
   CAMPAIGN_METRIC
+  FAQ
+  RISK_SIGNAL
 }
```

---

## 6. 인덱스 보강

```diff
 model CommentAnalysis {
   ...
   @@index([isRisk])
   @@index([isQuestion])
   @@index([sentiment])
+  @@index([sentiment, isRisk])
   @@map("comment_analysis")
 }

 model RawSocialMention {
   ...
   @@index([projectId, publishedAt(sort: Desc)])
   @@index([matchedKeyword])
   @@index([platform])
+  @@index([sentiment])
   @@map("raw_social_mentions")
 }

 model InsightAction {
   ...
   @@index([status])
   @@index([priority, status])
+  @@index([sourceModule])
   @@map("insight_actions")
 }

 model Content {
   ...
   @@index([platform])
   @@index([publishedAt])
+  @@index([channelId, publishedAt(sort: Desc)])
   @@map("contents")
 }
```

---

## 7. Nullable/Default 전략

| 변경                               | 전략                       | 근거                                    |
| ---------------------------------- | -------------------------- | --------------------------------------- |
| Workspace 새 필드 (maxChannels 등) | `@default(FREE 기본값)`    | 기존 행 자동 채워짐. 마이그레이션 안전. |
| ScheduledJob.durationMs            | `nullable (Int?)`          | 기존 Job에는 값 없음.                   |
| ScheduledJob.jobGroup              | `nullable (String?)`       | 기존 Job에는 값 없음.                   |
| UsageMetric.aiCostUsd              | `@default(0)`              | 기존 행 0원 처리.                       |
| UsageMetric.reportCount            | `@default(0)`              | 기존 행 0 처리.                         |
| FAQCandidate 전체                  | 신규 테이블. 빈 상태 시작. | —                                       |
| RiskSignal 전체                    | 신규 테이블. 빈 상태 시작. | —                                       |
| Notification 전체                  | 신규 테이블. 빈 상태 시작. | —                                       |

**원칙**: 기존 데이터가 있는 필드 추가 시 반드시 `@default` 또는 `nullable`. 기존 테이블의 NOT NULL 필드 추가 금지.

---

## 8. 변경하지 않는 것 (명시)

| 항목                          | 이유                                                        |
| ----------------------------- | ----------------------------------------------------------- |
| Auth 4모델                    | 프로덕션. Auth.js 호환 유지.                                |
| Channel 구조                  | 이미 v2.1에서 완성.                                         |
| IntentQuery.resultGraph JSON  | 클러스터/저니 데이터는 JSON 유지 (§ENTITY_RELATION_REVIEW). |
| AeoSnapshot.citedSources JSON | 현재 규모에서 별도 모델 불필요.                             |
| CompetitorChannel             | 아직 제거하지 않음. 마이그레이션 후 제거 (별도 작업).       |
| EvidenceAsset polymorphic     | dataSourceType + dataEntityIds 패턴 유지.                   |
| Campaign ~ RoiCalculation     | 이미 v2.1에서 완성.                                         |

---

## 9. 적용 명령 (참고)

```bash
# 1. 스키마 수정 후 포맷
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." \
  npx --package=prisma@6 prisma format

# 2. 검증
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." \
  npx --package=prisma@6 prisma validate

# 3. 마이그레이션 생성 (dev 환경만)
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." \
  npx --package=prisma@6 prisma migrate dev --name add_faq_risk_notification

# 주의: prisma@6 사용 필수 (프로젝트 Prisma 버전)
# 주의: DIRECT_URL 필수 (schema.prisma datasource 설정)
```
