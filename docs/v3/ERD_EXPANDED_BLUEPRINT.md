# ERD_EXPANDED_BLUEPRINT — 확장 ERD 및 Intelligence Graph

> 작성일: 2026-03-10
> 상태: 확정
> 기준: v3 설계 문서 + PRISMA_SCHEMA_REVIEW + ENTITY_RELATION_REVIEW

---

## 1. 확장 ERD 전체 (신규 엔티티 포함)

```
┌──────────────────────────────────────────────────────────────────────┐
│                           WORKSPACE                                   │
│  plan, planTier, industryType, maxChannels, maxMembers               │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐      │
│  │   User   │──│WorkspaceMember│  │Subscription│  │UsageMetric│      │
│  └────┬─────┘  └──────────────┘  └───────────┘  └───────────┘      │
│       │                                                               │
│       │ 1:N                                                          │
│       ▼                                                               │
│  ┌──────────────┐                                                    │
│  │ Notification │ ← 🆕 신규                                         │
│  └──────────────┘                                                    │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────────┐                     │
│  │  ScheduledJob    │  │WorkspaceVerticalPack  │──VerticalPack       │
│  └──────────────────┘  └──────────────────────┘     │               │
│                                                       │ 1:N          │
│                                                  ReportTemplate      │
│                                                                       │
│  ┌────────────────────── PROJECT ──────────────────────────────┐     │
│  │                                                              │     │
│  │  [SOCIAL]              [LISTENING]          [INTENT]        │     │
│  │  Channel                Keyword              IntentQuery     │     │
│  │    ├─ Content            ├─ MetricDaily        ├─ KwResult  │     │
│  │    │   ├─ MetricDaily    │                     │             │     │
│  │    │   └─ Comment        RawSocialMention     TrendAnalytics│     │
│  │    │       └─ Analysis                                      │     │
│  │    ├─ Snapshot                                              │     │
│  │    ├─ Connection          [GEO/AEO]          [REPORT]      │     │
│  │    ├─ InfluencerProfile   AeoKeyword          InsightReport │     │
│  │    └─ CampaignCreator       └─ AeoSnapshot      ├─ Section │     │
│  │                            CitationSource        │  └─ Evid.│     │
│  │  [CAMPAIGN]                                      └─ Action  │     │
│  │  Campaign                                                   │     │
│  │    ├─ CampaignCreator    [DATA EXPLORER]                    │     │
│  │    ├─ CampaignContent    SavedFilter                        │     │
│  │    │    └─ PostMeasure   DataExportJob                      │     │
│  │    ├─ CampaignMetric                                        │     │
│  │    └─ RoiCalculation                                        │     │
│  │                                                              │     │
│  │  [INTELLIGENCE] ← 🆕                                       │     │
│  │  FAQCandidate          RiskSignal                           │     │
│  │    ├─ question           ├─ title                           │     │
│  │    ├─ mentionCount       ├─ severity                        │     │
│  │    └─ status             └─ status                          │     │
│  │                                                              │     │
│  │  CompetitorChannel (legacy)                                 │     │
│  └──────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. 신규 엔티티 ERD 상세

### 2.1 FAQ/Risk Intelligence Domain

```
CommentAnalysis ──(isQuestion=true)──► FAQCandidate (🆕)
    │                                      │
    │ (isRisk=true)                        │ sourceCommentIds
    ▼                                      │ (polymorphic)
RiskSignal (🆕)                            │
    │                                      ▼
    │ sourceMentionIds           Content? (answerContentId)
    │ (polymorphic)                        │
    ▼                                      ▼
RawSocialMention              InsightAction (suggestedAction)
    │                              │
    │                              ▼
    │                         Campaign (실행)
    ▼
Notification (🆕) ←── RiskSignal (severity=HIGH/CRITICAL)
```

**관계 규칙**:

- FAQCandidate → Project: Cascade
- FAQCandidate.answerContentId → Content: SetNull (optional)
- FAQCandidate.sourceCommentIds: Polymorphic (FK 없음, 앱 레벨)
- RiskSignal → Project: Cascade
- RiskSignal.sourceCommentIds/sourceMentionIds: Polymorphic (FK 없음)
- RiskSignal 생성 시 → Notification 자동 생성 (앱 레벨)

### 2.2 Notification Domain

```
User ──1:N──► Notification (🆕)
                 │
                 ├── type: NotificationType (enum)
                 ├── priority: NotificationPriority (enum)
                 ├── sourceType + sourceId (polymorphic 출처)
                 └── channels: ["IN_APP", "EMAIL"]

트리거 소스:
  ScheduledJob(FAILED) ──→ Notification(SYNC_FAILURE)
  UsageMetric(80%) ────→ Notification(TOKEN_LIMIT_WARNING)
  RiskSignal(HIGH) ────→ Notification(RISK_DETECTED)
  ChannelConnection(EXPIRED) ─→ Notification(OAUTH_EXPIRED)
  InsightReport(PUBLISHED) ──→ Notification(REPORT_READY)
  AeoSnapshot(인용 변화) ──→ Notification(CITATION_CHANGE)
```

---

## 3. Intelligence Graph (확장 버전)

### 3.1 4-Layer 아키텍처 (신규 포함)

```
━━━ Layer 1: Raw Data (수집) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Channel, Content, Comment, RawSocialMention
  AeoSnapshot, Keyword, ChannelSnapshot
         │
         ▼  (AI + 통계 처리)
━━━ Layer 2: Analysis (분석) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CommentAnalysis, IntentKeywordResult, TrendKeywordAnalytics
  ContentMetricDaily, ChannelSnapshot (집계)
         │
         ▼  (패턴 인식 + 클러스터링)
━━━ Layer 2.5: Intelligence Aggregation (🆕) ━━━━━━━━━━━━━
  FAQCandidate (반복 질문 집계)
  RiskSignal (리스크 집계)
         │
         ▼  (교차 분석 + 전략)
━━━ Layer 3: Intelligence (인사이트) ━━━━━━━━━━━━━━━━━━━━━
  InsightReport, ReportSection, EvidenceAsset
  InsightAction (추천 액션)
         │
         ▼  (실행)
━━━ Layer 4: Execution (실행/측정) ━━━━━━━━━━━━━━━━━━━━━━━
  Campaign, CampaignCreator, CampaignContent
  PostMeasurement, CampaignMetric, RoiCalculation
         │
         └──→ Layer 1 (재순환)

━━━ Cross-Layer: Operations ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Notification (🆕), ScheduledJob, UsageMetric
```

### 3.2 데이터 흐름 (확장)

```
[Comment]
  │
  ├──► CommentAnalysis
  │        │
  │        ├── isQuestion=true ──► FAQCandidate(🆕) 집계
  │        │                          │
  │        │                          ├──► InsightAction(CONTENT_CREATE)
  │        │                          └──► AeoKeyword (FAQ→인용 대응)
  │        │
  │        └── isRisk=true ────► RiskSignal(🆕) 집계
  │                                  │
  │                                  ├──► Notification(🆕) (HIGH/CRITICAL)
  │                                  ├──► InsightAction(RISK_MITIGATE)
  │                                  └──► InsightReport(RISK_REPORT)
  │
  └──► 기존 흐름 (Sentiment→Topic→Cluster→Journey→Insight)
```

---

## 4. 도메인별 확장 ERD

### 4.1 Social Domain (변경 없음)

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
```

### 4.2 Intelligence Domain (🆕 확장)

```
Project ──1:N──► FAQCandidate(🆕)
   │                 │
   │                 ├── sourceCommentIds → Comment (polymorphic)
   │                 ├── answerContentId → Content (optional)
   │                 └── → InsightAction 생성
   │
   │ 1:N
   ▼
RiskSignal(🆕)
   │
   ├── sourceCommentIds → Comment (polymorphic)
   ├── sourceMentionIds → RawSocialMention (polymorphic)
   └── → Notification(🆕) 트리거
        → InsightAction 생성
```

### 4.3 Notification Domain (🆕)

```
User ──1:N──► Notification(🆕)
                 │
                 ├── sourceType: "risk_signal" | "scheduled_job" | "campaign" | ...
                 ├── sourceId: 관련 엔티티 ID
                 └── actionUrl: 딥링크
```

### 4.4 Workspace Domain (확장)

```
Workspace
  ├── plan, planTier, industryType (기존)
  ├── maxChannels, maxMembers, ... (🆕 역량 필드)
  ├── members: WorkspaceMember[]
  ├── projects: Project[]
  ├── subscriptions: Subscription[]
  ├── usageMetrics: UsageMetric[]
  ├── scheduledJobs: ScheduledJob[]
  └── verticalPacks: WorkspaceVerticalPack[]
```

---

## 5. 엔티티 간 전체 관계 매트릭스

| From ↓ / To →        | Project | Channel | Content | Comment | CommentAnalysis | InsightReport | InsightAction | Campaign | Notification |
| -------------------- | ------- | ------- | ------- | ------- | --------------- | ------------- | ------------- | -------- | ------------ |
| **Workspace**        | 1:N     | —       | —       | —       | —               | —             | —             | —        | —            |
| **User**             | —       | —       | —       | —       | —               | M:1           | —             | —        | 1:N(🆕)      |
| **Project**          | —       | 1:N     | —       | —       | —               | 1:N           | —             | 1:N      | —            |
| **Channel**          | M:1     | —       | 1:N     | —       | —               | —             | —             | —        | —            |
| **Content**          | —       | M:1     | —       | 1:N     | —               | —             | —             | —        | —            |
| **Comment**          | —       | —       | M:1     | —       | 1:1             | —             | —             | —        | —            |
| **FAQCandidate(🆕)** | M:1     | —       | M:1?    | poly    | —               | —             | →             | —        | —            |
| **RiskSignal(🆕)**   | M:1     | —       | —       | poly    | —               | —             | →             | —        | →            |
| **InsightAction**    | —       | —       | —       | —       | —               | M:1?          | —             | M:1?     | —            |
| **Campaign**         | M:1     | —       | —       | —       | —               | —             | 1:N           | —        | —            |

(poly = polymorphic reference, → = 앱 레벨 생성)

---

## 6. 인덱스 전략 (확장)

### 6.1 신규 엔티티 인덱스

| 모델         | 인덱스                            | 근거                       |
| ------------ | --------------------------------- | -------------------------- |
| FAQCandidate | `[projectId, status]`             | 프로젝트별 미해결 FAQ 조회 |
| FAQCandidate | `[mentionCount DESC]`             | 인기순 정렬                |
| FAQCandidate | `@@unique([projectId, question])` | 중복 방지                  |
| RiskSignal   | `[projectId, status]`             | 활성 리스크 조회           |
| RiskSignal   | `[severity]`                      | 심각도별 필터              |
| RiskSignal   | `[detectedAt DESC]`               | 최신순 정렬                |
| Notification | `[userId, isRead]`                | 미읽은 알림 조회           |
| Notification | `[userId, createdAt DESC]`        | 최신 알림 조회             |
| Notification | `[workspaceId, createdAt DESC]`   | 워크스페이스별 조회        |

### 6.2 기존 인덱스 보강 권고

| 모델             | 추가 인덱스                     | 근거                       |
| ---------------- | ------------------------------- | -------------------------- |
| CommentAnalysis  | `[sentiment, isRisk]`           | 부정+리스크 필터 복합 조회 |
| RawSocialMention | `[sentiment]`                   | 감성별 필터                |
| InsightAction    | `[sourceModule]`                | 출처 모듈별 조회           |
| Content          | `[channelId, publishedAt DESC]` | 채널별 최신 콘텐츠         |

---

## 7. 확장 포인트

| 향후 확장                         | 영향 범위                         | Phase   |
| --------------------------------- | --------------------------------- | ------- |
| AuditLog 모델 추가                | 독립 추가, 기존 영향 없음         | 8       |
| CustomDashboardConfig 추가        | 독립 추가 (Workspace 연결)        | 8       |
| Permission 모델 (RBAC 세분화)     | WorkspaceMember 확장              | 8       |
| Notification → WebSocket 실시간   | Notification 모델 활용            | 3+      |
| IntentCluster JSON → 모델 승격    | IntentQuery.resultGraph에서 분리  | 필요 시 |
| CitationLog JSON → 모델 승격      | AeoSnapshot.citedSources에서 분리 | 필요 시 |
| 새 SocialPlatform (NAVER_BLOG 등) | SocialPlatform enum 값 추가만     | 3+      |
| 새 AeoEngine                      | AeoEngine enum 값 추가만          | 4+      |
