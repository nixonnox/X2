# Insight → Action → Report 통합 파이프라인

## Phase 7 Overview

Phase 7은 Phase 5(데이터 수집)와 Phase 6(분석 엔진)의 결과물을 **사람이 이해하고 실행할 수 있는 형태**로 변환하는 단계다.
분석 결과를 인사이트로 정제하고, 실행 가능한 액션을 도출하며, 역할별 리포트로 구성하고, 자동화 트리거까지 준비한다.

---

## 전체 흐름도

```
Collection (Phase 5) → Analytics Engines (Phase 6)
    ↓
InsightGenerationService — 8개 분석 소스에서 인사이트 수집
    ↓
InsightSummaryService / ExecutiveSummaryService — 역할별 요약
    ↓
ActionRecommendationOrchestrator — 실행 가능한 액션 생성
    ↓
EvidenceBundleService — 근거 자료 묶음 생성
    ↓
ReportCompositionService + ReportSectionBuilder — 리포트 구성
    ↓
AlertTriggerPreparationService — 자동화 트리거 준비
```

---

## 서비스별 입력/출력/역할 요약

| #   | 서비스                               | 입력                                                             | 출력                                                          | 역할                                                            |
| --- | ------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | **InsightGenerationService**         | sentiment, topic, faq, risk, intent, trend, aeo, campaign 데이터 | `Insight[]` (KEY_FINDING, RISK, OPPORTUNITY, TREND_CHANGE)    | 8개 분석 소스를 순회하며 인사이트 후보 생성                     |
| 2   | **InsightSummaryService**            | `Insight[]` + SummaryContext                                     | 역할/채널별 요약 텍스트                                       | DASHBOARD/EMAIL/REPORT_INTRO/SLACK 등 컨텍스트에 맞는 요약 생성 |
| 3   | **ExecutiveSummaryService**          | `Insight[]` + Channel/Campaign 데이터                            | C-level 전략 요약                                             | KPI 중심의 간결한 전략적 시사점 도출                            |
| 4   | **ActionRecommendationOrchestrator** | Layer 0-2 signal 전체                                            | `Action[]` (owner, timing, evidence 포함)                     | 카테고리별 실행 가능한 액션 생성 및 우선순위 배정               |
| 5   | **EvidenceBundleService**            | 전체 repository 조회                                             | `EvidenceBundle` (items with displayType, summary, entityIds) | 리포트/PPT에 바로 활용 가능한 근거 자료 묶음 생성               |
| 6   | **ReportCompositionService**         | Insight + Evidence + Action                                      | `Report` (structured sections)                                | 역할별 리포트 전체 구성 및 조합                                 |
| 7   | **ReportSectionBuilder**             | 개별 섹션 데이터                                                 | `ReportSection` (narrative + data)                            | 섹션별 데이터 조회 및 내러티브 생성                             |
| 8   | **AlertTriggerPreparationService**   | 조건 스캔 결과                                                   | `AlertTrigger[]` (notifications)                              | 리스크/FAQ/sentiment spike 등 자동 알림 트리거 준비             |

---

## 데이터 흐름 상세

### 1. 분석 소스 → 인사이트 생성

```
sentiment / topic / faq / risk
    → InsightGenerationService
    → KEY_FINDING / RISK / OPPORTUNITY 인사이트
```

감성 분석에서 부정 비율 급증, FAQ에서 미답변 질문 누적, 리스크 시그널 활성화 등을 감지하여 인사이트로 변환한다.

### 2. 트렌드/의도 소스 → 인사이트 생성

```
intent / trend / aeo
    → InsightGenerationService
    → TREND_CHANGE / OPPORTUNITY 인사이트
```

키워드 트렌드 변화, 검색 의도 갭, AEO 점수 변동 등에서 기회와 변화를 포착한다.

### 3. 인사이트 → 액션 생성

```
insights
    → ActionRecommendationOrchestrator
    → categorized actions with owner / timing / evidence
```

각 인사이트에서 실행 가능한 액션을 도출하고, 담당자(owner), 실행 시점(timing), 근거 자료(evidence)를 함께 배정한다.

### 4. 인사이트 + 액션 + 증거 → 리포트 구성

```
insights + actions + evidence
    → ReportCompositionService
    → structured report with sections
```

역할(roleContext)에 따라 섹션 구성을 달리하며, ReportSectionBuilder가 각 섹션의 데이터와 내러티브를 생성한다.

### 5. 트리거 스캔 → 자동 알림

```
triggers scan
    → AlertTriggerPreparationService
    → notifications for risk / faq / sentiment spikes
```

임계값 초과, 리스크 시그널 활성화, FAQ 미답변 누적 등 조건을 스캔하여 알림을 생성한다.

---

## Traceability (추적 가능성)

Phase 7의 모든 출력은 원본 데이터까지 역추적이 가능하다:

```
insight
  → evidence refs (EvidenceBundleItem.entityIds)
    → source entity IDs (댓글, 키워드, 캠페인 등)
      → original data (Phase 5 수집 원본)
```

- 모든 인사이트는 생성 근거(source entity)를 참조한다.
- 액션은 연결된 인사이트와 증거 자료를 포함한다.
- 리포트 섹션은 사용된 데이터의 출처를 명시한다.

---

## DB 저장 경로

| 데이터        | 저장 메서드              | 설명                            |
| ------------- | ------------------------ | ------------------------------- |
| InsightAction | `insightAction.create()` | 인사이트에서 도출된 액션 저장   |
| ReportSection | `report.create()`        | 구성된 리포트 및 섹션 저장      |
| EvidenceAsset | `evidenceAsset.create()` | 근거 자료 묶음의 개별 자산 저장 |

각 저장 시점에 projectId, channelId, 생성 시각이 함께 기록되어 프로젝트/채널 단위 조회가 가능하다.
