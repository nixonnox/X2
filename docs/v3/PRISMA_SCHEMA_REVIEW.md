# PRISMA_SCHEMA_REVIEW — 현재 스키마 분석 및 재사용 구조 검토

> 작성일: 2026-03-10
> 상태: 확정
> 기준: schema.prisma (v2.1, 1491 lines)

---

## 1. 현재 스키마 전체 현황

| 항목             | 수량  |
| ---------------- | ----- |
| 모델 수          | 38개  |
| Enum 수          | 35개  |
| 관계 (FK)        | 40+   |
| Composite Unique | 14개  |
| Index            | 30+   |
| 총 라인 수       | 1,491 |

### 1.1 모델 목록 (도메인별)

| 도메인             | 모델                                                                                               | Phase        | 상태                                 |
| ------------------ | -------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------ |
| **Auth**           | User, Account, Session, VerificationToken                                                          | 기존         | ✅ 프로덕션                          |
| **Tenancy**        | Workspace, WorkspaceMember, Project                                                                | 기존         | ✅ 프로덕션                          |
| **Platform**       | Platform                                                                                           | 기존         | ✅ 프로덕션                          |
| **Social**         | Channel, ChannelConnection, ChannelSnapshot, Content, ContentMetricDaily, Comment, CommentAnalysis | 기존+확장    | ✅ 구조 완성                         |
| **Competitor**     | CompetitorChannel                                                                                  | 기존(Legacy) | ⚠️ Channel.channelType으로 전환 예정 |
| **Keyword**        | Keyword, KeywordMetricDaily                                                                        | 기존         | ✅ 프로덕션                          |
| **Intent**         | IntentQuery, IntentKeywordResult, TrendKeywordAnalytics                                            | Phase 3      | ✅ 구조 완성                         |
| **GEO/AEO**        | AeoKeyword, AeoSnapshot, CitationReadyReportSource                                                 | Phase 4      | ✅ 구조 완성                         |
| **Insight/Report** | InsightReport, InsightAction, ReportSection, EvidenceAsset, ReportTemplate                         | Phase 5      | ✅ 구조 완성                         |
| **Campaign**       | Campaign, CampaignCreator, CampaignContent                                                         | Phase 6      | ✅ 구조 완성                         |
| **Measurement**    | CampaignMetric, PostMeasurement, RoiCalculation                                                    | Phase 7      | ✅ 구조 완성                         |
| **Influencer**     | InfluencerProfile                                                                                  | Phase 6      | ✅ 구조 완성                         |
| **Vertical**       | VerticalPack, WorkspaceVerticalPack                                                                | Phase 8      | ✅ 구조 완성                         |
| **Explorer**       | SavedFilter, DataExportJob                                                                         | Phase 2      | ✅ 구조 완성                         |
| **Billing**        | Subscription, UsageMetric                                                                          | 기존         | ✅ 프로덕션                          |
| **Pipeline**       | ScheduledJob                                                                                       | 기존         | ✅ 프로덕션                          |

---

## 2. 재사용 가능한 구조

### 2.1 검증된 패턴

| 패턴                      | 적용 위치                                                                                                                                                                                                             | 평가                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **시계열 복합 Unique**    | ChannelSnapshot[channelId,date], ContentMetricDaily[contentId,date], KeywordMetricDaily[keywordId,date], CampaignMetric[campaignId,date], PostMeasurement[campaignContentId,date], AeoSnapshot[keywordId,date,engine] | ✅ 일관적, 확장 용이       |
| **Soft Delete**           | Channel.deletedAt, Campaign.deletedAt                                                                                                                                                                                 | ✅ 적절 (고가 엔티티만)    |
| **Polymorphic Reference** | EvidenceAsset.dataSourceType + dataEntityIds                                                                                                                                                                          | ✅ 유연, 앱 레벨 검증 필요 |
| **Loose Coupling**        | RawSocialMention.matchedKeyword (FK 아닌 string)                                                                                                                                                                      | ✅ 외부 데이터 유연 수집   |
| **1:1 확장**              | Channel → InfluencerProfile                                                                                                                                                                                           | ✅ 선택적 확장             |
| **M:N via Join**          | Workspace ↔ VerticalPack (WorkspaceVerticalPack)                                                                                                                                                                      | ✅ 표준 패턴               |
| **Cascade 계층**          | Workspace → Project → Channel → Content → Comment → CommentAnalysis                                                                                                                                                   | ✅ 명확한 소유 체인        |
| **SetNull 참조**          | InsightAction.reportId, InsightAction.campaignId, CampaignCreator.channelId                                                                                                                                           | ✅ 이력 보존               |
| **Enum 기반 타입 분류**   | ChannelType, CampaignType, InsightType, EvidenceType 등                                                                                                                                                               | ✅ 확장 용이               |

### 2.2 인프라 수준 재사용

| 구성 요소                                                 | 상태     | 평가           |
| --------------------------------------------------------- | -------- | -------------- |
| Auth.js 4모델 (User, Account, Session, VerificationToken) | 프로덕션 | ✅ 변경 불필요 |
| Prisma Client 싱글턴                                      | 프로덕션 | ✅             |
| Workspace/WorkspaceMember 멀티테넌시                      | 프로덕션 | ✅             |
| Project 스코프 격리                                       | 프로덕션 | ✅             |
| Subscription/UsageMetric 빌링                             | 프로덕션 | ✅             |
| ScheduledJob 스케줄링                                     | 프로덕션 | ✅             |

---

## 3. 갭 분석 (v3 문서 대비)

### 3.1 신규 엔티티 필요

| 후보 엔티티               | 출처 문서                                                           | 현재 상태                                                                  | 판정                    |
| ------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------- |
| **FAQCandidate**          | ANALYTICS_ENGINE_MAP (Topic Engine), USER_JOURNEY_3PATHS (Path 3)   | 미존재. CommentAnalysis.isQuestion=true로 마킹만. 집계/관리 모델 없음.     | 🆕 신규 생성            |
| **RiskSignal**            | ANALYTICS_ENGINE_MAP (Action Engine), OPS_AND_ADMIN_OVERVIEW (알림) | 미존재. CommentAnalysis.isRisk=true로 마킹만. 집계/에스컬레이션 모델 없음. | 🆕 신규 생성            |
| **Notification**          | OPS_AND_ADMIN_OVERVIEW §6.2                                         | 미존재. 문서에서도 "추후 설계" 명시.                                       | 🆕 신규 생성 (Phase 2+) |
| **AuditLog**              | OPS_AND_ADMIN_OVERVIEW (운영)                                       | 미존재. 관리자 행위 추적 없음.                                             | ⏳ 후순위 (Phase 8)     |
| **CustomDashboardConfig** | BENCHMARK_DNA_MAP (디센트릭), OPS_AND_ADMIN_OVERVIEW                | 미존재. Enterprise 전용.                                                   | ⏳ 후순위 (Phase 8)     |

### 3.2 JSON → 독립 모델 승격 검토

| 현재 JSON 필드                              | 독립 모델 후보          | 판정                       | 근거                                                                                                             |
| ------------------------------------------- | ----------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| IntentQuery.resultGraph (클러스터)          | IntentCluster           | ❌ JSON 유지               | 그래프 데이터는 구조가 유동적. 시각화용 JSON이 적절. 쿼리 필요 시 앱 레벨 처리.                                  |
| IntentQuery.resultGraph (저니)              | JourneyNode/JourneyEdge | ❌ JSON 유지               | 동일 이유. 저니 데이터는 분석 결과의 시각화용.                                                                   |
| AeoSnapshot.citedSources                    | CitationLog             | 🔄 별도 모델 고려          | 인용 소스별 시간축 추적 필요 시 독립 모델이 유리. 현재는 JSON으로 충분하나, "인용된 모든 URL 검색" 요구 시 승격. |
| CitationReadyReportSource.citationHistory   | (동일)                  | 🔄 CitationLog와 통합 고려 | 인용 이력 추적 정규화 가능.                                                                                      |
| RoiCalculation.benchmarkComparison          | BenchmarkResult         | ❌ JSON 유지               | 벤치마크 비교는 1회성 계산 결과. 개별 쿼리 불필요.                                                               |
| VerticalPack.seedKeywords/benchmarkBaseline | VerticalPackData        | ❌ JSON 유지               | 관리자 설정 데이터. 구조가 산업마다 다름.                                                                        |

### 3.3 기존 모델 확장 필요

| 모델                | 필요 확장                                                       | 출처                           |
| ------------------- | --------------------------------------------------------------- | ------------------------------ |
| **Workspace**       | capabilities 필드 (JSON 또는 직접 필드) — 플랜별 기능 제한 관리 | OPS_AND_ADMIN_OVERVIEW §5.2    |
| **InsightAction**   | executionResult, measuredImpact 필드 — 실행 결과 추적 강화      | PRODUCT_RESET (실행-측정 루프) |
| **CommentAnalysis** | faqClusterId (FAQCandidate 연결)                                | ANALYTICS_ENGINE_MAP           |
| **ScheduledJob**    | duration (실행 시간), jobGroup (그룹핑)                         | OPS_AND_ADMIN_OVERVIEW §2.3    |
| **UsageMetric**     | aiCostUsd (비용 추정), reportCount (리포트 수)                  | OPS_AND_ADMIN_OVERVIEW §3.1    |

### 3.4 Enum 확장 필요

| Enum             | 추가 값                                           | 출처                                  |
| ---------------- | ------------------------------------------------- | ------------------------------------- |
| JobType          | `FAQ_EXTRACT`, `RISK_DETECT`, `NOTIFICATION_SEND` | ANALYTICS_ENGINE_MAP, OPS_AND_ADMIN   |
| InsightType      | `RISK_REPORT`, `FAQ_REPORT`                       | USER_JOURNEY_3PATHS (Path 3)          |
| DataSourceType   | `FAQ_CANDIDATE`, `RISK_SIGNAL`                    | FAQCandidate/RiskSignal 추가 시       |
| SourceModule     | `FAQ_ENGINE`, `RISK_ENGINE`                       | ANALYTICS_ENGINE_MAP                  |
| ActionStatus     | `AUTO_EXECUTING`                                  | GEO_AEO_EXTENSION_PLAN §8.3 (Agentic) |
| ExplorerDataType | `FAQ`, `RISK_SIGNAL`                              | Data Explorer 확장                    |

---

## 4. 구조적 강점

1. **일관된 ID 전략**: 모든 모델 `@id @default(cuid())` — 분산 환경 안전
2. **일관된 타임스탬프**: `createdAt @default(now())`, `updatedAt @updatedAt` 패턴
3. **명확한 소유 체인**: Workspace → Project → (모든 도메인 엔티티)
4. **@@map으로 DB 테이블명 분리**: 모든 모델에 snake_case @@map 적용
5. **Phase별 구분 주석**: 스키마 내 섹션 헤더로 구현 단계 명확
6. **Enum 분리**: 기존/신규 enum 구분 (v2.1 섹션)
7. **7-Stage 데이터 흐름 반영**: Discover→Analyze→Intent→GEO/AEO→Insight→Execute→Measure 엔티티 매핑 완료

---

## 5. 구조적 리스크

| 리스크                          | 심각도 | 설명                                                                                      | 대응                                                                     |
| ------------------------------- | ------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Cascade depth 6**             | 🔴     | Workspace→Project→Channel→Content→Comment→CommentAnalysis. 최상위 삭제 시 대량 cascading. | Soft delete 우선. 대량 삭제는 배치 처리.                                 |
| **CompetitorChannel 중복**      | 🟡     | Channel.channelType=COMPETITOR와 기능 중복. 마이그레이션 필요.                            | Phase 1에서 데이터 마이그레이션 후 모델 제거.                            |
| **EvidenceAsset 무결성**        | 🟡     | dataEntityIds가 FK가 아닌 string[]. 참조 대상 삭제 시 dangling reference.                 | 앱 레벨 검증 + 정기 정합성 체크 배치.                                    |
| **RawSocialMention 대량 증가**  | 🟡     | 파티셔닝 미적용. 월 수만~수십만 레코드.                                                   | PostgreSQL 파티셔닝 또는 90일 아카이브 정책.                             |
| **CampaignCreator unique 제약** | 🟡     | `@@unique([campaignId, channelId])` — channelId가 nullable이므로 NULL+NULL 허용.          | 앱 레벨에서 channelId 또는 influencerProfileId 중 하나 필수 검증.        |
| **Plan vs PlanTier 중복**       | 🟡     | Workspace에 plan(FREE/PRO/BUSINESS)과 planTier(STANDARD/VERTICAL/ENTERPRISE) 둘 다 존재.  | plan을 Subscription으로 이동하고 Workspace는 planTier만 유지, 또는 통합. |

---

## 6. 결론

현재 스키마는 v3 설계 문서의 **핵심 엔티티 85%를 이미 커버**한다. 주요 갭은:

1. **FAQ/Risk 집계 모델** (FAQCandidate, RiskSignal) — 댓글 시작형 경로의 핵심
2. **알림 시스템** (Notification) — 운영 관제의 기반
3. **기존 모델 필드 확장** (Workspace capabilities, InsightAction 실행 결과, ScheduledJob 메트릭)
4. **Enum 확장** (JobType, InsightType, SourceModule 등 6개)
5. **CompetitorChannel → Channel 통합** 마이그레이션

스키마 구조 자체는 견고하며, 추가/확장은 **비파괴적**(non-destructive)으로 수행 가능하다.
