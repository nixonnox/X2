# DB Schema & Domain Audit Report

> **대상**: X2 소셜 미디어 분석 플랫폼 (Prisma ORM + PostgreSQL)
> **스키마 위치**: `packages/db/prisma/schema.prisma`
> **감사 일자**: 2026-03-12
> **스키마 통계**: 50 models / 52 enums / 1,916 lines

---

## 목차

1. [감사 요약](#1-감사-요약)
2. [발견 사항 상세](#2-발견-사항-상세)
3. [엔티티 커버리지 매트릭스](#3-엔티티-커버리지-매트릭스)
4. [긍정적 발견 사항](#4-긍정적-발견-사항)
5. [요약 통계](#5-요약-통계)

---

## 1. 감사 요약

| 심각도        | 건수   | 상태                |
| ------------- | ------ | ------------------- |
| S1 (Critical) | 3      | OPEN                |
| S2 (High)     | 4      | 2 RESOLVED / 2 OPEN |
| S3 (Medium)   | 3      | OPEN                |
| **합계**      | **10** |                     |

---

## 2. 발견 사항 상세

### S1 — Critical

#### AUDIT-001: Repository 커버리지 42%

| 항목                     | 내용                                                                                                                                                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **심각도**               | S1 (Critical)                                                                                                                                                                                                                             |
| **영향 모델**            | 29개 모델 (아래 매트릭스 참조)                                                                                                                                                                                                            |
| **설명**                 | 50개 Prisma 모델 중 21개만 Repository 구현이 존재한다. 나머지 29개 모델은 서비스 코드에서 `prisma.model.findMany()` 등 raw Prisma client 호출로만 접근한다. Repository 패턴을 우회하면 쿼리 최적화, 캐싱, 로깅을 중앙에서 관리할 수 없다. |
| **데이터 무결성 리스크** | 중복 쿼리 로직, 트랜잭션 경계 불일치, 쿼리 성능 저하 시 추적 불가                                                                                                                                                                         |
| **수정 권고**            | 우선순위별 Repository 구현 로드맵 수립. Phase별로 가장 빈번하게 접근되는 모델부터 Repository 래핑. 최소한 write 경로는 반드시 Repository를 경유하도록 한다.                                                                               |

**Repository 구현 현황 (21/50)**:

```
base, channel, content, keyword, trend-analytics, aeo, citation-source,
report, evidence-asset, influencer, campaign, usage, scheduled-job,
notification, faq-candidate, comment, insight-action, mention,
risk-signal, workspace, intent
```

**Repository 미구현 모델 (29/50)**:

```
User, Account, Session, VerificationToken, WorkspaceMember, Project,
Platform, ChannelConnection, ChannelSnapshot, ContentMetricDaily,
CommentAnalysis, KeywordMetricDaily, CompetitorChannel, InsightReport,
InsightAction (별도 router 가능), ReportSection, ReportTemplate,
IntentQuery, IntentKeywordResult, TrendKeywordAnalytics,
RawSocialMention, InfluencerProfile, CampaignCreator, CampaignContent,
CampaignMetric, PostMeasurement, RoiCalculation, SavedFilter,
DataExportJob, VerticalPack, WorkspaceVerticalPack,
AutomationRule, AutomationExecution, DeliveryLog, FAQCandidate
```

---

#### AUDIT-002: JSON 필드 37개 — 런타임 검증 없음

| 항목                     | 내용                                                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **심각도**               | S1 (Critical)                                                                                                                                                                      |
| **영향 필드**            | 37개 `Json` / `Json?` 필드                                                                                                                                                         |
| **설명**                 | 유연한 저장을 위해 `Json` 타입을 광범위하게 사용한다. Prisma는 JSON 구조에 대한 스키마 검증을 제공하지 않으며, 애플리케이션 코드에서도 Zod 등의 런타임 검증이 적용되지 않는다.     |
| **데이터 무결성 리스크** | 스키마 드리프트, 잘못된 구조의 데이터 저장, JSON 내부 필드에 대한 인덱싱/쿼리 불가                                                                                                 |
| **수정 권고**            | (1) 각 JSON 필드에 대한 Zod 스키마 정의 및 write 경로에 validation 적용, (2) 자주 쿼리되는 JSON 내부 필드는 정규화하여 별도 컬럼으로 승격, (3) PostgreSQL `jsonb` 인덱스 활용 검토 |

**영향 필드 목록**:

| 모델                      | 필드                                                              | 필수 여부    |
| ------------------------- | ----------------------------------------------------------------- | ------------ |
| ChannelSnapshot           | rawMetrics                                                        | optional     |
| InsightReport             | content                                                           | **required** |
| InsightAction             | impactMetric                                                      | optional     |
| ScheduledJob              | payload                                                           | optional     |
| IntentQuery               | resultSummary, resultGraph                                        | optional     |
| IntentKeywordResult       | monthlyVolumes, socialBreakdown                                   | optional     |
| TrendKeywordAnalytics     | relatedKeywords, topContents                                      | optional     |
| InfluencerProfile         | scoreBreakdown                                                    | optional     |
| Campaign                  | kpiTargets                                                        | optional     |
| CampaignCreator           | deliverables, contactLog, performanceSummary                      | optional     |
| CampaignContent           | contentRequirements                                               | optional     |
| CampaignMetric            | contentMetrics, derivedMetrics                                    | optional     |
| PostMeasurement           | sentimentSummary                                                  | optional     |
| RoiCalculation            | costBreakdown, benchmarkComparison                                | optional     |
| AeoSnapshot               | citedSources, competitorMentions                                  | optional     |
| CitationReadyReportSource | citationHistory                                                   | optional     |
| VerticalPack              | seedKeywords, benchmarkBaseline, topicTaxonomy, competitorPresets | optional     |
| EvidenceAsset             | dataQuery, visualization                                          | optional     |
| ReportTemplate            | sectionDefinitions                                                | **required** |
| SavedFilter               | filterConfig                                                      | **required** |
| DataExportJob             | filterConfig                                                      | **required** |
| AutomationRule            | triggerCondition, actionConfig                                    | **required** |
| AutomationExecution       | triggerPayload, actionResult                                      | optional     |

---

#### AUDIT-003: 메트릭 중복 — 단일 소스 오브 트루스 미정의

| 항목                     | 내용                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **심각도**               | S1 (Critical)                                                                                                                                                                                                                                                                                                                                                                |
| **영향 모델**            | Content + ContentMetricDaily, Channel + ChannelSnapshot                                                                                                                                                                                                                                                                                                                      |
| **설명**                 | `Content` 모델은 `viewCount`, `likeCount`, `commentCount` 필드를 직접 보유하면서 동시에 `ContentMetricDaily`에서 동일 필드를 일별로 기록한다. `Channel`은 `subscriberCount`, `contentCount`를 직접 보유하면서 `ChannelSnapshot`이 동일 데이터를 일별로 저장한다. 어느 쪽이 정본(source of truth)인지 문서화되어 있지 않으며, 불일치 시 어느 값을 신뢰해야 하는지 불명확하다. |
| **데이터 무결성 리스크** | 모델 필드와 스냅샷 테이블 간 수치 불일치, 대시보드에서 보여주는 값의 비결정성                                                                                                                                                                                                                                                                                                |
| **수정 권고**            | (1) Content/Channel의 인라인 카운트를 "최신 캐시"로 명시적으로 문서화, (2) 스냅샷 테이블을 "이력 원본"으로 지정, (3) 동기화 로직에 불일치 감지 알림 추가                                                                                                                                                                                                                     |

---

### S2 — High

#### AUDIT-004: 누락 인덱스 추가 (RESOLVED)

| 항목       | 내용                                                   |
| ---------- | ------------------------------------------------------ |
| **심각도** | S2 (High)                                              |
| **상태**   | **RESOLVED**                                           |
| **설명**   | 다음 모델에 `@@index`가 누락되어 있었으나 수정 완료됨. |

추가된 인덱스:

- `Account(userId)` — 사용자별 계정 조회
- `Session(userId)` — 사용자별 세션 조회
- `ChannelConnection(channelId)` — 채널별 연결 조회
- `Comment(contentId, publishedAt)` — 콘텐츠별 댓글 시간순 조회
- `CampaignContent(campaignId, campaignCreatorId, status)` — 캠페인 콘텐츠 필터
- `SavedFilter(projectId, createdBy)` — 프로젝트별 저장 필터
- `ReportTemplate(verticalPackId)` — 버티컬팩별 템플릿 조회

---

#### AUDIT-005: Comment 셀프 레퍼런셜 관계 추가 (RESOLVED)

| 항목          | 내용                                                                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **심각도**    | S2 (High)                                                                                                                                                                                              |
| **상태**      | **RESOLVED**                                                                                                                                                                                           |
| **영향 모델** | Comment                                                                                                                                                                                                |
| **설명**      | 스레드형 댓글을 위한 `parent`/`replies` 셀프 레퍼런셜 관계가 누락되어 있었으나 추가 완료됨. `parentCommentId`를 통한 `@relation("CommentReplies")` 적용. `onDelete: SetNull`로 부모 삭제 시 고아 방지. |

---

#### AUDIT-006: Automation 피처 플래그 미검증

| 항목                     | 내용                                                                                                                                                                                                                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **심각도**               | S2 (High)                                                                                                                                                                                                                                                                                     |
| **영향 모델**            | Workspace (`automationEnabled`, `alertAutomationEnabled`, `webhookIntegrationEnabled`)                                                                                                                                                                                                        |
| **영향 서비스**          | `packages/api/src/services/automation/*.service.ts`                                                                                                                                                                                                                                           |
| **설명**                 | Workspace 모델에 `automationEnabled`, `maxAutomationRulesPerMonth`, `alertAutomationEnabled`, `webhookIntegrationEnabled` 등의 피처 플래그가 정의되어 있으나, automation 서비스 코드에서 이 플래그들을 실행 전에 확인하지 않는다. 비활성화된 워크스페이스에서도 자동화 규칙이 실행될 수 있다. |
| **데이터 무결성 리스크** | 플랜 미가입 워크스페이스에서 자동화 실행, 과금 없는 리소스 소비                                                                                                                                                                                                                               |
| **수정 권고**            | (1) 자동화 실행 경로 진입 시 `workspace.automationEnabled` 가드 추가, (2) 각 액션 타입별 세부 플래그 확인 미들웨어 구현, (3) 위반 시 `AutomationExecution.status = SKIPPED` 기록                                                                                                              |

---

#### AUDIT-007: Soft Delete 일관성 부재

| 항목                     | 내용                                                                                                                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **심각도**               | S2 (High)                                                                                                                                                                                                                   |
| **영향 모델**            | `deletedAt` 있음: Channel, Campaign (2개) / `deletedAt` 없음: 나머지 48개 모델                                                                                                                                              |
| **설명**                 | Channel과 Campaign만 `deletedAt DateTime?`을 사용한 소프트 삭제를 지원한다. 나머지 모델은 하드 삭제이거나, `status` 필드의 `ARCHIVED` 값으로 논리적 삭제를 처리한다. 일관된 패턴이 없어 데이터 복구 정책이 모델마다 다르다. |
| **데이터 무결성 리스크** | 실수로 하드 삭제된 데이터 복구 불가, 감사 로그 누락                                                                                                                                                                         |
| **수정 권고**            | (1) 소프트 삭제 대상 모델 기준 문서화 (비즈니스 엔티티 vs 시스템 엔티티), (2) 비즈니스 핵심 모델(Content, Comment, InsightReport 등)에 `deletedAt` 추가 검토, (3) Prisma 미들웨어에서 소프트 삭제 자동 필터링 구현          |

---

### S3 — Medium

#### AUDIT-008: Enum 과다 (52개)

| 항목                     | 내용                                                                                                                                                                                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **심각도**               | S3 (Medium)                                                                                                                                                                                                                                                                            |
| **영향**                 | 스키마 전역                                                                                                                                                                                                                                                                            |
| **설명**                 | 52개 enum이 정의되어 있다. 일부 enum은 값이 2~3개로 매우 적고(예: `Plan` 3개, `SyncStatus` 3개, `ConnectionType` 2개), 일부는 의미가 중첩된다(예: `ContentStatus` vs `CampaignContentStatus`, `JobStatus` vs `AnalysisJobStatus` vs `ExportJobStatus` vs `AutomationExecutionStatus`). |
| **데이터 무결성 리스크** | 낮음. 단, 유지보수 시 혼동 가능                                                                                                                                                                                                                                                        |
| **수정 권고**            | (1) 상태 enum 통합 검토 — 범용 `ProcessingStatus` 도입 가능성, (2) 값이 2개인 enum은 Boolean 전환 검토, (3) 네이밍 컨벤션 통일 (`*Status` vs `*Type`)                                                                                                                                  |

**중첩 의심 enum 목록**:
| 그룹 | Enum들 |
|------|--------|
| 상태 계열 | `ContentStatus`, `CampaignContentStatus`, `CampaignStatus`, `ChannelStatus` |
| 작업 상태 계열 | `JobStatus`, `AnalysisJobStatus`, `ExportJobStatus`, `AutomationExecutionStatus` |
| 우선순위 계열 | `ActionPriority`, `NotificationPriority`, `RiskLevel` |

---

#### AUDIT-009: BigInt 직렬화 주의 필요

| 항목                     | 내용                                                                                                                                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **심각도**               | S3 (Medium)                                                                                                                                                                                                                                               |
| **영향 필드**            | `Content.viewCount`, `ContentMetricDaily.viewCount`, `ChannelSnapshot.totalViews` (모두 `BigInt`)                                                                                                                                                         |
| **설명**                 | BigInt는 JSON 직렬화 시 네이티브 지원이 없어 별도 처리가 필요하다. 일부 서비스 코드에서 `Number(bigint)` 변환을 사용하는데, JavaScript의 `Number.MAX_SAFE_INTEGER` (2^53 - 1 = 9,007,199,254,740,991)를 초과하는 조회수에서 정밀도 손실이 발생할 수 있다. |
| **데이터 무결성 리스크** | 매우 큰 조회수(90조 이상)에서 수치 오차 — 현실적으로는 낮지만 코드 패턴이 잘못됨                                                                                                                                                                          |
| **수정 권고**            | (1) BigInt를 `String`으로 직렬화하는 tRPC/superjson 설정 확인, (2) `Number()` 변환 대신 `bigint.toString()` 사용, (3) 프런트엔드에서 표시용 포맷 함수 통일                                                                                                |

---

#### AUDIT-010: 날짜 필드 네이밍 비일관

| 항목       | 내용                              |
| ---------- | --------------------------------- |
| **심각도** | S3 (Medium)                       |
| **영향**   | 스키마 전역                       |
| **설명**   | 날짜 관련 필드명이 일관되지 않다. |

| 패턴                                                | 사용 예                                                   |
| --------------------------------------------------- | --------------------------------------------------------- |
| `createdAt` / `updatedAt`                           | 대부분 모델 (표준)                                        |
| `startDate` / `endDate`                             | Campaign                                                  |
| `publishedAt`                                       | Content, Comment, RawSocialMention                        |
| `collectedAt`                                       | CampaignMetric (`collectedAt`), AeoSnapshot (`createdAt`) |
| `detectedAt` / `firstOccurrence` / `lastOccurrence` | RiskSignal                                                |
| `firstSeenAt` / `lastSeenAt`                        | FAQCandidate                                              |
| `connectedAt`                                       | ChannelConnection                                         |
| `activatedAt`                                       | WorkspaceVerticalPack                                     |
| `analyzedAt`                                        | CommentAnalysis                                           |
| `lastEvaluatedAt`                                   | InfluencerProfile                                         |
| `sentAt` / `deliveredAt` / `failedAt`               | DeliveryLog                                               |
| `scheduledAt` / `startedAt` / `completedAt`         | AutomationExecution                                       |

**수정 권고**: 네이밍 컨벤션 가이드 수립. `*At` 접미사를 타임스탬프 표준으로, `*Date`는 `@db.Date` (날짜만) 컬럼에만 사용. 도메인 이벤트명 + `At` 형태 유지 (예: `publishedAt`, `detectedAt`는 적절).

---

## 3. 엔티티 커버리지 매트릭스

> **범례**: O = 구현됨 / X = 미구현 / - = 해당 없음

| #   | Model                     | Repository          | Service                                 | tRPC Router |
| --- | ------------------------- | ------------------- | --------------------------------------- | ----------- |
| 1   | User                      | X                   | X                                       | X           |
| 2   | Account                   | X                   | X                                       | X           |
| 3   | Session                   | X                   | X                                       | X           |
| 4   | VerificationToken         | X                   | -                                       | -           |
| 5   | Workspace                 | O                   | O (workspace-access)                    | X           |
| 6   | WorkspaceMember           | X                   | X                                       | X           |
| 7   | Project                   | X                   | X                                       | X           |
| 8   | Platform                  | X                   | X                                       | X           |
| 9   | Channel                   | O                   | O (channel-analysis)                    | O           |
| 10  | ChannelConnection         | X                   | X                                       | X           |
| 11  | ChannelSnapshot           | X                   | O (channel-analysis)                    | X           |
| 12  | Content                   | O                   | X                                       | X           |
| 13  | ContentMetricDaily        | X                   | X                                       | X           |
| 14  | Comment                   | O                   | O (comment-analysis)                    | X           |
| 15  | CommentAnalysis           | X                   | O (comment-analysis)                    | X           |
| 16  | Keyword                   | O                   | X                                       | X           |
| 17  | KeywordMetricDaily        | X                   | X                                       | X           |
| 18  | CompetitorChannel         | X                   | O (competitor)                          | X           |
| 19  | InsightReport             | X                   | O (insight-generation, insight-summary) | X           |
| 20  | InsightAction             | O                   | O (action-recommendation)               | X           |
| 21  | ReportSection             | X                   | O (report-composition)                  | X           |
| 22  | EvidenceAsset             | O                   | O (evidence-bundle)                     | X           |
| 23  | ReportTemplate            | X                   | O (report-composition)                  | X           |
| 24  | ScheduledJob              | O                   | O (collection-orchestration)            | X           |
| 25  | Subscription              | X                   | X                                       | X           |
| 26  | UsageMetric               | O                   | O (usage)                               | X           |
| 27  | IntentQuery               | O (intent)          | O (intent-analysis)                     | X           |
| 28  | IntentKeywordResult       | X                   | O (intent-analysis)                     | X           |
| 29  | TrendKeywordAnalytics     | O                   | O (trend)                               | X           |
| 30  | RawSocialMention          | O (mention)         | O (listening-analysis)                  | X           |
| 31  | InfluencerProfile         | O                   | O (influencer-execution)                | X           |
| 32  | Campaign                  | O                   | O (campaign, campaign-performance)      | X           |
| 33  | CampaignCreator           | X                   | O (campaign)                            | X           |
| 34  | CampaignContent           | X                   | O (campaign)                            | X           |
| 35  | CampaignMetric            | X                   | O (campaign-performance)                | X           |
| 36  | PostMeasurement           | X                   | O (campaign-performance)                | X           |
| 37  | RoiCalculation            | X                   | O (campaign-performance)                | X           |
| 38  | AeoKeyword                | O (aeo)             | O (geo-aeo)                             | X           |
| 39  | AeoSnapshot               | X                   | O (geo-aeo)                             | X           |
| 40  | CitationReadyReportSource | O (citation-source) | O (citation)                            | X           |
| 41  | VerticalPack              | X                   | X                                       | X           |
| 42  | WorkspaceVerticalPack     | X                   | X                                       | X           |
| 43  | SavedFilter               | X                   | X                                       | X           |
| 44  | DataExportJob             | X                   | X                                       | X           |
| 45  | FAQCandidate              | O                   | O (faq)                                 | X           |
| 46  | RiskSignal                | O                   | O (risk-signal)                         | X           |
| 47  | Notification              | O                   | O (notification)                        | X           |
| 48  | AutomationRule            | X                   | O (alert-trigger-preparation)           | X           |
| 49  | AutomationExecution       | X                   | O (alert-trigger-preparation)           | X           |
| 50  | DeliveryLog               | X                   | X                                       | X           |

---

## 4. 긍정적 발견 사항

| 항목                       | 상세                                                                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **도메인 모델 포괄성**     | 소셜 분석 도메인(채널, 콘텐츠, 댓글, 키워드, 인플루언서, 캠페인, GEO/AEO, FAQ, 리스크)을 50개 모델로 포괄적으로 커버.                                                  |
| **@@unique 제약 조건**     | 비즈니스 규칙에 맞는 복합 유니크 제약 적절 적용. 예: `[channelId, platformContentId]`, `[projectId, platform, platformChannelId]`, `[workspaceId, verticalPackId]` 등. |
| **Cascade Delete 규칙**    | 부모-자식 관계에서 `onDelete: Cascade`가 적절히 설정됨. 교차 도메인 참조는 `onDelete: SetNull`로 고아 방지.                                                            |
| **@default / @updatedAt**  | 모든 모델에 `createdAt @default(now())` 적용. 변경 가능한 모델에 `@updatedAt` 일관 적용. 카운트 필드에 `@default(0)` 적용.                                             |
| **마이그레이션 준비 완료** | 명확한 관계 정의, `@@map()` 테이블명 매핑, 인덱스 전략이 적용되어 마이그레이션 친화적 스키마.                                                                          |
| **멱등성 키**              | AutomationExecution에 `idempotencyKey @unique`를 통한 중복 실행 방지 설계.                                                                                             |
| **시계열 인덱스**          | 시간순 조회가 필요한 모델에 `(sort: Desc)` 인덱스 적절 적용.                                                                                                           |

---

## 5. 요약 통계

### 스키마 규모

| 지표                  | 값                              |
| --------------------- | ------------------------------- |
| 총 모델 수            | 50                              |
| 총 Enum 수            | 52                              |
| 스키마 라인 수        | 1,916                           |
| JSON 필드 수          | 37 (required: 5 / optional: 32) |
| BigInt 필드 수        | 3                               |
| Soft Delete 모델      | 2 (Channel, Campaign)           |
| Self-referential 관계 | 1 (Comment)                     |

### 커버리지 요약

| 계층        | 구현 / 전체 | 비율 |
| ----------- | ----------- | ---- |
| Repository  | 21 / 50     | 42%  |
| Service     | 33 / 50     | 66%  |
| tRPC Router | 1 / 50      | 2%   |

### 발견 사항 요약

| ID        | 심각도 | 제목                                       | 상태     |
| --------- | ------ | ------------------------------------------ | -------- |
| AUDIT-001 | S1     | Repository 커버리지 42%                    | OPEN     |
| AUDIT-002 | S1     | JSON 필드 37개 런타임 검증 없음            | OPEN     |
| AUDIT-003 | S1     | 메트릭 중복 (단일 소스 오브 트루스 미정의) | OPEN     |
| AUDIT-004 | S2     | 누락 인덱스 추가                           | RESOLVED |
| AUDIT-005 | S2     | Comment 셀프 레퍼런셜 관계 추가            | RESOLVED |
| AUDIT-006 | S2     | Automation 피처 플래그 미검증              | OPEN     |
| AUDIT-007 | S2     | Soft Delete 일관성 부재                    | OPEN     |
| AUDIT-008 | S3     | Enum 과다 (52개)                           | OPEN     |
| AUDIT-009 | S3     | BigInt 직렬화 주의                         | OPEN     |
| AUDIT-010 | S3     | 날짜 필드 네이밍 비일관                    | OPEN     |
