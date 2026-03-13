# Phase 7 구현 노트

## 목표

분석 결과 → 인사이트 → 액션 → 리포트 → 자동화 통합

Phase 5(수집)와 Phase 6(분석)의 출력을 소비하여, 사람이 이해하고 실행할 수 있는 최종 산출물을 생성한다.

---

## 아키텍처

```
Layer 0 (기존): ChannelAnalysis, FAQ, RiskSignal, Trend, GeoAeo, Evidence, ...
Layer 1 (기존): CommentAnalysis, IntentAnalysis, Campaign, ...
Layer 2 (기존): ActionRecommendation, CampaignPerformance
Layer 3 (Phase 7 신규):
  InsightGenerationService   ← Layer 0-2 전체 조회
  InsightSummaryService      ← InsightGeneration 결과
  ExecutiveSummaryService    ← InsightGeneration + Channel/Campaign 데이터
  EvidenceBundleService      ← 전체 repository 조회
  ActionRecommendationOrchestrator ← Layer 0-2 signal 수집
  ReportCompositionService   ← Insight + Evidence + Action 조합
  ReportSectionBuilder       ← 개별 섹션 데이터 + 내러티브 생성
  AlertTriggerPreparationService ← 조건 스캔 + 알림 생성
```

---

## 신규 파일 목록 (8개)

| 파일                                    | 위치                   | 역할                       |
| --------------------------------------- | ---------------------- | -------------------------- |
| `insight-generation.service.ts`         | `services/insights/`   | 8개 소스에서 인사이트 생성 |
| `insight-summary.service.ts`            | `services/insights/`   | 컨텍스트별 요약            |
| `executive-summary.service.ts`          | `services/insights/`   | C-level 요약               |
| `evidence-bundle.service.ts`            | `services/evidence/`   | 근거 자료 묶음             |
| `action-recommendation-orchestrator.ts` | `services/actions/`    | 액션 오케스트레이션        |
| `report-composition.service.ts`         | `services/reports/`    | 리포트 구성                |
| `report-section-builder.ts`             | `services/reports/`    | 섹션별 빌드                |
| `alert-trigger-preparation.service.ts`  | `services/automation/` | 자동화 트리거              |

---

## 수정된 파일

| 파일                | 변경 내용                                |
| ------------------- | ---------------------------------------- |
| `services/index.ts` | Phase 7 서비스 8개 import + factory 등록 |

---

## 의존성 그래프

### ReportCompositionService

```
ReportCompositionService
  ├── repositories.report (create, findById)
  ├── ReportSectionBuilder (각 섹션 빌드)
  │     ├── repositories.channel
  │     ├── repositories.comment
  │     ├── repositories.faqCandidate
  │     ├── repositories.riskSignal
  │     ├── repositories.intent
  │     ├── repositories.trendAnalytics
  │     └── repositories.evidenceAsset
  ├── buildSectionNarrative (내러티브 생성)
  └── generateReportSummary (요약 생성)
```

### InsightGenerationService

```
InsightGenerationService
  ├── repositories.comment (sentiment, analyses)
  ├── repositories.faqCandidate
  ├── repositories.riskSignal
  ├── repositories.intent
  ├── repositories.trendAnalytics
  ├── repositories.aeo
  └── repositories.campaign
```

### ActionRecommendationOrchestrator

```
ActionRecommendationOrchestrator
  ├── repositories.comment (sentiment)
  ├── repositories.faqCandidate
  ├── repositories.riskSignal
  ├── repositories.intent (gaps)
  ├── repositories.aeo
  ├── repositories.trendAnalytics
  ├── repositories.campaign
  └── repositories.insightAction (persist)
```

### AlertTriggerPreparationService

```
AlertTriggerPreparationService
  ├── repositories.riskSignal
  ├── repositories.faqCandidate
  ├── repositories.comment
  ├── repositories.campaign
  ├── repositories.aeo
  ├── repositories.notification (execute)
  └── repositories.workspace (resolve admins)
```

---

## TypeScript 검증

Phase 7 파일 전체 **0 error** (기존 pre-existing error만 존재).

---

## 남은 과제

| #   | 과제              | 설명                                            |
| --- | ----------------- | ----------------------------------------------- |
| 1   | **@x2/ai 연동**   | LLM 기반 내러티브 생성 (현재 rule-based 템플릿) |
| 2   | **BullMQ 연동**   | scheduled report generation, trigger execution  |
| 3   | **WebSocket**     | 실시간 알림 전달                                |
| 4   | **Email service** | 리포트 발송                                     |
| 5   | **Export**        | PDF/PPT 생성                                    |
| 6   | **VerticalPack**  | 업종별 벤치마크 비교                            |
| 7   | **UI 통합**       | 대시보드에 인사이트/액션/리포트 표시            |

---

## 다음 단계

**Phase 8**: UX/UI 실제 통합 및 대시보드 반영
