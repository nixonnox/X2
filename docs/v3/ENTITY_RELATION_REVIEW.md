# ENTITY_RELATION_REVIEW — 신규 엔티티 후보 및 관계 분석

> 작성일: 2026-03-10
> 상태: 확정
> 기준: v3 설계 문서 10건 + schema.prisma (v2.1)

---

## 1. 엔티티 후보 총괄

### 1.1 판정 결과 요약

| #   | 후보 엔티티             | 출처                                        | 판정                                          | Phase |
| --- | ----------------------- | ------------------------------------------- | --------------------------------------------- | ----- |
| 1   | FAQCandidate            | ANALYTICS_ENGINE_MAP, USER_JOURNEY (Path 3) | 🆕 **신규 생성**                              | 2     |
| 2   | RiskSignal              | ANALYTICS_ENGINE_MAP, OPS_AND_ADMIN         | 🆕 **신규 생성**                              | 2     |
| 3   | Notification            | OPS_AND_ADMIN §6                            | 🆕 **신규 생성**                              | 2     |
| 4   | CitationLog             | GEO_AEO_EXTENSION_PLAN §3                   | 🔄 **JSON→모델 승격 보류**                    | 4+    |
| 5   | IntentCluster           | ANALYTICS_ENGINE_MAP (Cluster Engine)       | ❌ **JSON 유지**                              | —     |
| 6   | JourneyNode/Edge        | ANALYTICS_ENGINE_MAP (Journey Engine)       | ❌ **JSON 유지**                              | —     |
| 7   | PreferredSourcePolicy   | GEO_AEO_EXTENSION_PLAN §4                   | ❌ **기존 필드 활용**                         | —     |
| 8   | SourceRegistry          | GEO_AEO_EXTENSION_PLAN §2                   | ❌ **CitationReadyReportSource로 대체**       | —     |
| 9   | ActionRecommendation    | ANALYTICS_ENGINE_MAP (Action Engine)        | ❌ **InsightAction으로 대체**                 | —     |
| 10  | IndustryTemplate        | BENCHMARK_DNA_MAP (아하트렌드)              | ❌ **ReportTemplate + verticalPackId로 대체** | —     |
| 11  | CustomDashboardConfig   | BENCHMARK_DNA_MAP (디센트릭)                | ⏳ **후순위**                                 | 8     |
| 12  | AuditLog                | OPS_AND_ADMIN                               | ⏳ **후순위**                                 | 8     |
| 13  | TrendKeywordAnalytics   | —                                           | ✅ **이미 존재**                              | 3     |
| 14  | RawSocialMention        | —                                           | ✅ **이미 존재**                              | 2     |
| 15  | InfluencerProfile       | —                                           | ✅ **이미 존재**                              | 6     |
| 16  | Campaign~RoiCalculation | —                                           | ✅ **이미 존재** (6개 모델)                   | 6-7   |

---

## 2. 신규 엔티티 상세

### 2.1 FAQCandidate (FAQ 후보)

**필요성**: Comment-start Path (Path 3)에서 "반복 질문 자동 식별 → FAQ 콘텐츠 제작 제안"이 핵심 기능. 현재 CommentAnalysis.isQuestion=true로 마킹만 하고, 클러스터링/관리 모델이 없음.

```
FAQCandidate
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(...)

  // FAQ 질문 그룹
  question        String      // 대표 질문 (LLM이 정규화)
  questionVariants String[]   // 원본 질문 변형들
  category        String?     // 분류 (제품/서비스/배송/반품 등)

  // 출처 추적
  sourceCommentIds String[]   // 원본 댓글 ID 목록 (polymorphic)
  mentionCount     Int  @default(0)  // 이 질문이 언급된 총 횟수
  firstSeenAt      DateTime
  lastSeenAt       DateTime

  // 현재 대응 상태
  hasAnswer        Boolean @default(false)
  answerUrl        String?     // 기존 답변 콘텐츠 URL
  answerContentId  String?     // Content FK (자사 콘텐츠 연결)

  // AI 분석
  urgencyScore     Float?      // 긴급도 (0~1)
  businessImpact   String?     // LLM 판단: 비즈니스 영향
  suggestedAction  String?     // 제안 액션

  // 상태
  status           FAQStatus @default(DETECTED)
  resolvedAt       DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([projectId, question])
  @@index([projectId, status])
  @@index([mentionCount(sort: Desc)])
  @@map("faq_candidates")
```

**관계**:

- Project 1:N FAQCandidate (Cascade)
- FAQCandidate.sourceCommentIds → Comment (polymorphic, FK 없음)
- FAQCandidate.answerContentId → Content (optional, SetNull)
- FAQCandidate → InsightAction 생성 가능 (CONTENT_CREATE)

**Enum 추가**: `FAQStatus { DETECTED, REVIEWING, ANSWERED, DISMISSED }`

### 2.2 RiskSignal (리스크 신호)

**필요성**: CommentAnalysis.isRisk=true인 댓글이 급증할 때 에스컬레이션이 필요. 개별 댓글이 아닌 "리스크 이벤트" 단위 관리.

```
RiskSignal
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(...)

  // 리스크 정보
  title          String       // "배송 지연 불만 급증"
  description    String?
  riskType       String       // 분류 (product_defect, delivery, service, pr_crisis 등)
  severity       RiskLevel    // LOW | MEDIUM | HIGH | CRITICAL (기존 enum 재사용)

  // 근거
  sourceCommentIds   String[]  // 관련 댓글 ID 목록
  sourceMentionIds   String[]  // 관련 멘션 ID 목록
  sampleTexts        String[]  // 대표 텍스트 (최대 5개)
  signalCount        Int  @default(0)  // 관련 시그널 총 수

  // 시간 범위
  detectedAt     DateTime
  firstOccurrence DateTime
  lastOccurrence  DateTime

  // 상태 관리
  status         RiskSignalStatus @default(ACTIVE)
  assigneeId     String?
  responseNote   String?
  resolvedAt     DateTime?

  // AI 분석
  rootCauseAnalysis String?    // LLM 원인 분석
  recommendedAction String?    // LLM 대응 제안
  estimatedImpact   String?    // 예상 영향

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([projectId, status])
  @@index([severity])
  @@index([detectedAt(sort: Desc)])
  @@map("risk_signals")
```

**관계**:

- Project 1:N RiskSignal (Cascade)
- RiskSignal.assigneeId → User (optional, 앱 레벨)
- RiskSignal → InsightAction 생성 (RISK_MITIGATE)
- RiskSignal → Notification 트리거

**Enum 추가**: `RiskSignalStatus { ACTIVE, INVESTIGATING, RESPONDING, RESOLVED, DISMISSED }`

### 2.3 Notification (알림)

**필요성**: OPS_AND_ADMIN_OVERVIEW §6.2에서 정의한 알림 이벤트 (수집 실패, 토큰 한도, 리스크 급증 등). 현재 시스템에 알림 모델이 전혀 없음.

```
Notification
  id          String   @id @default(cuid())

  // 수신 대상
  userId      String
  user        User     @relation(...)
  workspaceId String?

  // 알림 내용
  type        NotificationType
  title       String
  message     String
  priority    NotificationPriority @default(NORMAL)

  // 출처
  sourceType  String?     // "risk_signal", "scheduled_job", "campaign", etc.
  sourceId    String?     // 관련 엔티티 ID
  actionUrl   String?     // 클릭 시 이동할 URL

  // 상태
  isRead      Boolean  @default(false)
  readAt      DateTime?

  // 발송 채널
  channels    String[]   // ["IN_APP", "EMAIL", "SLACK"]
  emailSentAt DateTime?

  createdAt   DateTime @default(now())

  @@index([userId, isRead])
  @@index([userId, createdAt(sort: Desc)])
  @@index([workspaceId, createdAt(sort: Desc)])
  @@map("notifications")
```

**관계**:

- User 1:N Notification (Cascade)
- Notification.workspaceId → Workspace (optional, 앱 레벨)

**Enum 추가**:

```
NotificationType {
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

NotificationPriority { LOW, NORMAL, HIGH, URGENT }
```

---

## 3. JSON 유지 판정 상세

### 3.1 IntentCluster / JourneyNode / JourneyEdge → JSON 유지

**현재**: IntentQuery.resultGraph (Json?)에 클러스터 노드/엣지, 저니 경로 저장.

**JSON 유지 이유**:

1. **구조 유동성**: 그래프 데이터의 노드/엣지 구조가 분석마다 다름
2. **일괄 생성/교체**: 분석 실행 시 전체 그래프를 한번에 생성. 개별 노드 CRUD 불필요.
3. **읽기 전용**: 생성 후 시각화용으로만 읽힘. 개별 노드 검색/필터 불필요.
4. **FK 오버헤드**: 키워드 150개 × 노드/엣지 수백 개 → 테이블 조인 비효율적
5. **기존 패턴 일관성**: 리스닝마인드 DNA에서도 그래프는 JSON이 표준

**대안 시나리오**: 향후 "특정 클러스터에 속하는 키워드 검색" 기능 필요 시 별도 IntentCluster 모델 도입 가능. 그때까지는 JSON 유지.

### 3.2 CitationLog → 승격 보류

**현재**: AeoSnapshot.citedSources (Json), CitationReadyReportSource.citationHistory (Json)

**승격 보류 이유**:

1. **현재 규모**: AeoKeyword 수 × 엔진 4 × 일별 = 비교적 소량
2. **AeoSnapshot 자체가 이력**: 날짜별 스냅샷이 곧 citation log 역할
3. **CitationReadyReportSource.citationHistory는 집계**: 쿼리 빈도 낮음

**승격 조건**: "인용된 모든 URL을 시간축으로 검색" 또는 "특정 URL의 인용 이력 조회"가 핵심 기능이 될 때.

### 3.3 PreferredSourcePolicy → 기존 필드 활용

**현재**: CitationReadyReportSource에 priority, isActive, targetKeywords 필드 존재.

**별도 모델 불필요**: GEO_AEO_EXTENSION_PLAN §4의 "우선순위 정책"은 CitationReadyReportSource의 기존 필드로 충분히 구현 가능. priority 정렬 + isActive 필터 + targetKeywords 매핑.

---

## 4. 기존 엔티티 확장 관계

### 4.1 Workspace 역량 필드

**설계 결정: 직접 필드 방식 채택**

| 방식                        | 장점                              | 단점                          |
| --------------------------- | --------------------------------- | ----------------------------- |
| 직접 필드 (채택)            | 쿼리 단순, JOIN 불필요, 타입 안전 | 필드 증가 시 스키마 변경      |
| 별도 WorkspaceSettings 모델 | 유연, 스키마 변경 없이 설정 추가  | JOIN 필요, 타입 안전성 낮음   |
| JSON capabilities 필드      | 유연                              | 타입 안전성 없음, 검증 어려움 |

**추가 필드 (Workspace)**:

```
  // Plan Limits (PlanTier에서 파생, 캐싱)
  maxChannels      Int    @default(3)
  maxContentsPerMonth Int @default(500)
  maxCommentsPerMonth Int @default(1000)
  maxAiTokensPerDay  Int  @default(5000)
  maxMembers       Int    @default(1)
  maxReportsPerMonth Int  @default(3)
  canExportData    Boolean @default(false)
  canAccessApi     Boolean @default(false)
  maxVerticalPacks Int    @default(0)
```

**이유**: 플랜 한도는 자주 조회되는 값 (모든 API 호출마다 검증). JOIN 없이 Workspace에서 바로 읽는 것이 성능상 유리.

### 4.2 User → Notification 관계

```
model User {
  ...
  notifications Notification[]
}
```

### 4.3 Project → FAQCandidate, RiskSignal 관계

```
model Project {
  ...
  faqCandidates FAQCandidate[]
  riskSignals   RiskSignal[]
}
```

---

## 5. 사용자 여정별 엔티티 매핑

### 5.1 Path 1 (소셜 시작) 관련 엔티티

```
[1] 채널 등록    → Channel (OWNED/COMPETITOR)
[2] 콘텐츠 수집  → Content, ContentMetricDaily
[3] 댓글 수집    → Comment, CommentAnalysis
[4] 채널 분석    → ChannelSnapshot
[5] 경쟁 비교    → Channel(COMPETITOR), ChannelSnapshot 비교
[6] 키워드 확장  → Keyword, IntentQuery, IntentKeywordResult
[7] GEO/AEO     → AeoKeyword, AeoSnapshot
[8] 인사이트    → InsightReport, ReportSection, EvidenceAsset
[9] 실행       → InsightAction, Campaign
```

**갭 없음**: 현재 스키마로 완전 지원.

### 5.2 Path 2 (리스닝 시작) 관련 엔티티

```
[1] 키워드 등록  → Keyword
[2] 멘션 수집    → RawSocialMention
[3] 인텐트 분석  → IntentQuery, IntentKeywordResult
[4] 트렌드      → TrendKeywordAnalytics, KeywordMetricDaily
[5] 채널 발견    → Channel (auto-discovery)
[6] 댓글 결합    → Comment, CommentAnalysis
[7] GEO/AEO     → AeoKeyword, AeoSnapshot
[8] 인사이트    → InsightReport
[9] 실행       → Campaign
```

**갭 없음**: 현재 스키마로 완전 지원.

### 5.3 Path 3 (댓글 시작) 관련 엔티티

```
[1] 댓글 수집    → Comment
[2] 감성/토픽   → CommentAnalysis
[3] FAQ 추출    → CommentAnalysis.isQuestion → ⚠️ FAQCandidate 필요
[4] 리스크 감지  → CommentAnalysis.isRisk → ⚠️ RiskSignal 필요
[5] 이슈 해석    → FAQCandidate + RiskSignal → InsightReport
[6] 검색 연결    → IntentQuery (FAQ 기반)
[7] GEO/AEO     → AeoKeyword (FAQ → 인용 대응)
[8] 인사이트    → InsightReport (FAQ_REPORT, RISK_REPORT)
[9] 실행       → InsightAction, Campaign
```

**갭**: FAQCandidate, RiskSignal 모델이 Path 3의 핵심 기능 지원에 필수.

---

## 6. 7-Stage Intelligence Loop 엔티티 매핑 검증

| Stage      | 필요 엔티티                                                                   | 현재 스키마          | 갭                       |
| ---------- | ----------------------------------------------------------------------------- | -------------------- | ------------------------ |
| ① Discover | Channel, Content, Comment, RawSocialMention, Keyword                          | ✅ 모두 존재         | 없음                     |
| ② Analyze  | ChannelSnapshot, ContentMetricDaily, CommentAnalysis                          | ✅ 모두 존재         | 없음                     |
| ③ Intent   | IntentQuery, IntentKeywordResult, TrendKeywordAnalytics                       | ✅ 모두 존재         | 없음                     |
| ④ GEO/AEO  | AeoKeyword, AeoSnapshot, CitationReadyReportSource                            | ✅ 모두 존재         | 없음                     |
| ⑤ Insight  | InsightReport, ReportSection, EvidenceAsset, **FAQCandidate**, **RiskSignal** | 🔶 FAQ/Risk 부재     | FAQCandidate, RiskSignal |
| ⑥ Execute  | InsightAction, Campaign, CampaignCreator, CampaignContent                     | ✅ 모두 존재         | 없음                     |
| ⑦ Measure  | PostMeasurement, CampaignMetric, RoiCalculation                               | ✅ 모두 존재         | 없음                     |
| 운영       | ScheduledJob, UsageMetric, **Notification**                                   | 🔶 Notification 부재 | Notification             |

---

## 7. Cross-DNA 시너지 엔티티 검증

| 시너지                      | 필요 연결                                     | 현재 상태                                            |
| --------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| 인텐트 기반 인플루언서 매칭 | IntentKeywordResult → InfluencerProfile       | ✅ 앱 레벨 매칭 (gapType=BLUE_OCEAN → 카테고리 검색) |
| FAQ → GEO/AEO 콘텐츠 전략   | FAQCandidate → AeoKeyword                     | 🆕 FAQCandidate 생성 후 가능                         |
| 리스크 → 자동 알림          | RiskSignal → Notification                     | 🆕 두 모델 모두 생성 필요                            |
| 캠페인 ROI → 산업 벤치마크  | RoiCalculation → VerticalPack                 | ✅ benchmarkComparison JSON으로 연결                 |
| 멘션 + 인텐트 교차          | RawSocialMention.topics ↔ IntentKeywordResult | ✅ 앱 레벨 매칭                                      |
