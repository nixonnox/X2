# SCHEMA_CHANGE_SUMMARY — 스키마 변경 내역 요약

> 작성일: 2026-03-10
> 적용 대상: packages/db/prisma/schema.prisma
> 적용 방식: additive, backward-compatible, 비파괴적

---

## 1. 추가된 모델 (3개)

| 모델             | Phase | 용도                                                                                            | 테이블명         |
| ---------------- | ----- | ----------------------------------------------------------------------------------------------- | ---------------- |
| **FAQCandidate** | 2     | 반복 질문 집계/관리. CommentAnalysis.isQuestion=true에서 클러스터링. Path 3 (댓글 시작형) 핵심. | `faq_candidates` |
| **RiskSignal**   | 2     | 부정 감성/위험 댓글 급증 시 리스크 이벤트 단위 관리. 에스컬레이션, Notification 트리거.         | `risk_signals`   |
| **Notification** | 2     | 시스템 알림. 수집 실패, 리스크 급증, 토큰 한도, OAuth 만료 등 이벤트 알림.                      | `notifications`  |

### FAQCandidate 주요 필드

- `question` (String) — 대표 질문 (LLM 정규화)
- `questionVariants` (String[]) — 원본 질문 변형들
- `sourceCommentIds` (String[]) — 원본 댓글 ID (polymorphic)
- `mentionCount` (Int) — 이 질문 언급 총 횟수
- `status` (FAQStatus) — DETECTED → REVIEWING → ANSWERED | DISMISSED
- `urgencyScore` (Float?) — AI 긴급도 판단

### RiskSignal 주요 필드

- `title` (String), `riskType` (String) — 리스크 식별
- `severity` (RiskLevel) — 기존 enum 재사용 (LOW/MEDIUM/HIGH/CRITICAL)
- `sourceCommentIds`, `sourceMentionIds` (String[]) — 근거 (polymorphic)
- `status` (RiskSignalStatus) — ACTIVE → INVESTIGATING → RESPONDING → RESOLVED | DISMISSED
- `rootCauseAnalysis` (String?) — LLM 원인 분석

### Notification 주요 필드

- `userId` → User FK (Cascade)
- `type` (NotificationType), `priority` (NotificationPriority)
- `sourceType`, `sourceId` (String?) — 출처 (polymorphic)
- `isRead` (Boolean), `channels` (String[]) — 상태/발송 채널

---

## 2. 추가된 Enum (4개)

| Enum                     | 값                                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **FAQStatus**            | DETECTED, REVIEWING, ANSWERED, DISMISSED                                                                                                                           |
| **RiskSignalStatus**     | ACTIVE, INVESTIGATING, RESPONDING, RESOLVED, DISMISSED                                                                                                             |
| **NotificationType**     | SYNC_FAILURE, TOKEN_LIMIT_WARNING, RISK_DETECTED, OAUTH_EXPIRED, REPORT_READY, CAMPAIGN_UPDATE, PLAN_LIMIT_WARNING, SENTIMENT_SPIKE, CITATION_CHANGE, SYSTEM_ALERT |
| **NotificationPriority** | LOW, NORMAL, HIGH, URGENT                                                                                                                                          |

---

## 3. 수정된 기존 모델 (5개)

### 3.1 Workspace (+12 필드)

```
Plan Limits (9개):
  maxChannels         Int     @default(3)
  maxContentsPerMonth Int     @default(500)
  maxCommentsPerMonth Int     @default(1000)
  maxAiTokensPerDay   Int     @default(5000)
  maxMembers          Int     @default(1)
  maxReportsPerMonth  Int     @default(3)
  canExportData       Boolean @default(false)
  canAccessApi        Boolean @default(false)
  maxVerticalPacks    Int     @default(0)

Feature Flags (3개):
  geoAeoEnabled              Boolean @default(false)
  influencerExecutionEnabled Boolean @default(false)
  evidenceReportingEnabled   Boolean @default(true)
```

**전략**: 모든 필드에 `@default` 존재. FREE 플랜 기본값. 마이그레이션 후 plan별 데이터 보정 스크립트 필수.

### 3.2 User (+1 relation)

```
  notifications Notification[]
```

### 3.3 Project (+2 relations)

```
  faqCandidates FAQCandidate[]
  riskSignals   RiskSignal[]
```

### 3.4 ScheduledJob (+2 필드, +1 인덱스)

```
  durationMs Int?      // 마지막 실행 소요 시간 (nullable)
  jobGroup   String?   // 논리적 그룹핑 (nullable)
  @@index([jobGroup])
```

### 3.5 UsageMetric (+3 필드)

```
  aiCostUsd   Float @default(0)    // 추정 AI 비용
  reportCount Int   @default(0)    // 생성된 리포트 수
  exportCount Int   @default(0)    // 데이터 내보내기 수
```

---

## 4. 확장된 기존 Enum (5개)

| Enum                 | 추가된 값                                      |
| -------------------- | ---------------------------------------------- |
| **JobType**          | +FAQ_EXTRACT, +RISK_DETECT, +NOTIFICATION_SEND |
| **InsightType**      | +RISK_REPORT, +FAQ_REPORT                      |
| **DataSourceType**   | +FAQ_CANDIDATE, +RISK_SIGNAL                   |
| **SourceModule**     | +FAQ_ENGINE, +RISK_ENGINE                      |
| **ExplorerDataType** | +FAQ, +RISK_SIGNAL                             |

---

## 5. 추가된 인덱스 (6개)

| 모델                   | 인덱스                                             | 용도                    |
| ---------------------- | -------------------------------------------------- | ----------------------- |
| CommentAnalysis        | `@@index([sentiment, isRisk])`                     | 부정+리스크 교차 필터   |
| Content                | `@@index([channelId, publishedAt(sort: Desc)])`    | 채널별 최신 콘텐츠 조회 |
| InsightAction          | `@@index([sourceModule])`                          | 출처 모듈별 조회        |
| RawSocialMention       | `@@index([sentiment])`                             | 감성별 필터             |
| ScheduledJob           | `@@index([jobGroup])`                              | 그룹별 조회             |
| (신규 모델 인덱스 8개) | FAQCandidate 3개, RiskSignal 3개, Notification 3개 | 각 모델 쿼리 최적화     |

---

## 6. 반영 보류한 모델

| 모델                            | 보류 이유                                                                                | 적용 시기                      |
| ------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------ |
| **IntentCluster**               | IntentQuery.resultGraph JSON에 이미 포함. 그래프 데이터는 구조 유동적, FK 오버헤드 과다. | 클러스터별 독립 검색 필요 시   |
| **JourneyNode / JourneyEdge**   | IntentQuery.resultGraph JSON에 이미 포함. 시각화용 일괄 생성/교체 패턴.                  | JSON 쿼리 한계 도달 시         |
| **CitationLog**                 | AeoSnapshot 자체가 일별 × 엔진별 이력. 별도 모델 불필요.                                 | URL별 시간축 검색 핵심 기능 시 |
| **PreferredSourcePolicy**       | CitationReadyReportSource.priority + isActive + targetKeywords로 충분.                   | —                              |
| **SourceRegistry**              | CitationReadyReportSource가 이미 이 역할 수행.                                           | —                              |
| **ActionRecommendation**        | InsightAction이 이미 이 역할 수행 (actionType, sourceModule, sourceReason).              | —                              |
| **CampaignInfluencer**          | CampaignCreator가 이미 이 역할 수행 (channelId + influencerProfileId).                   | —                              |
| **CampaignPerformanceSnapshot** | CampaignMetric + PostMeasurement가 이미 일별 성과 추적.                                  | —                              |
| **CustomDashboardConfig**       | Enterprise 전용 (Phase 8+).                                                              | Enterprise 고객 확보 시        |
| **IndustryTemplate**            | ReportTemplate + verticalPackId로 이미 구현.                                             | —                              |
| **AuditLog**                    | Enterprise 전용 (Phase 8+). 현재 불필요.                                                 | Enterprise 고객 확보 시        |

---

## 7. 스키마 통계 변화

| 항목       | 변경 전 | 변경 후 | 차이  |
| ---------- | ------- | ------- | ----- |
| 모델 수    | 38      | 41      | +3    |
| Enum 수    | 35      | 39      | +4    |
| 총 라인 수 | 1,491   | ~1,670  | +~179 |
