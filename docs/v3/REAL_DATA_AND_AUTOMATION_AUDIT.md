# X2 실데이터 파이프라인 및 자동화 시스템 감사 보고서

> **감사 일자**: 2026-03-12
> **감사 범위**: 실데이터 경로 5건 추적, 자동화 시스템 준비도 평가
> **심각도 기준**: S0 (차단), S1 (주요 기능 결손), S2 (품질/완성도)

---

## 목차

1. [실데이터 파이프라인 감사](#1-실데이터-파이프라인-감사)
2. [자동화 시스템 감사](#2-자동화-시스템-감사)
3. [자동화 준비도 매트릭스](#3-자동화-준비도-매트릭스)
4. [종합 요약](#4-종합-요약)

---

## 1. 실데이터 파이프라인 감사

### 전체 데이터 흐름 개요

```
 [소셜 플랫폼 API]          [분석 엔진]           [프론트엔드]
  YouTube / IG / X          8개 엔진              대시보드 UI
       |                      |                      |
       v                      v                      v
 +-------------+     +-----------------+     +----------------+
 | Collection  |---->| Analytics       |---->| Dashboard      |
 | Runner      |     | Pipeline        |     | (mock-data.ts) | <-- GAP
 +-------------+     +-----------------+     +----------------+
       |                      |                      |
       v                      v                      v
 +-------------+     +-----------------+     +----------------+
 | Platform    |     | Insight/Action  |     | Reports/       |
 | Adapter     |     | Generation      |     | Comments UI    |
 +-------------+     +-----------------+     +----------------+
       |                      |
       v                      v
 +-------------+     +-----------------+
 | DB (Prisma) |     | Automation      |
 |             |     | Orchestration   |
 +-------------+     +-----------------+
                              |
                     +--------+--------+
                     |        |        |
                  IN_APP   EMAIL   WEBHOOK
                  (REAL)  (PLHDR) (PLHDR)
```

---

### 경로 1: YouTube --> 수집 --> 대시보드

**심각도: S0 (차단)**

```
YouTube API  --->  CollectionRunner  --->  PlatformAdapter  --->  DB (Prisma)
   REAL               REAL                   REAL                  REAL
                                                                    |
                                                                    v
                                                          Dashboard Frontend
                                                          reads mock-data.ts
                                                              MOCK  <-- GAP
```

| 구성 요소                       | 상태 | 근거 파일                                                   |
| ------------------------------- | ---- | ----------------------------------------------------------- |
| YouTube API 연동                | REAL | `packages/social/src/youtube.ts`                            |
| CollectionRunner 오케스트레이션 | REAL | `packages/api/src/services/collection/collection-runner.ts` |
| PlatformAdapter 위임            | REAL | `packages/api/src/services/collection/platform-adapter.ts`  |
| 데이터 정규화                   | REAL | `packages/api/src/services/collection/normalization.ts`     |
| 프론트엔드 대시보드 데이터 소스 | MOCK | `apps/web/src/lib/mock-data.ts`                             |

**갭 분석**: 백엔드가 YouTube API에서 실데이터를 수집하여 DB에 저장하지만, 프론트엔드 대시보드는 tRPC/API 호출 대신 `mock-data.ts`에서 하드코딩된 데이터를 읽고 있다. 모든 대시보드 관련 프론트엔드 서비스가 mock 데이터에 의존한다.

**영향받는 mock-data 파일**:

- `apps/web/src/lib/mock-data.ts` (메인 대시보드)
- `apps/web/src/lib/channels/mock-data.ts` (채널)
- `apps/web/src/lib/comments/mock-data.ts` (댓글)
- `apps/web/src/lib/competitors/mock-data.ts` (경쟁사)
- `apps/web/src/lib/collection/mock-data.ts` (수집)
- `apps/web/src/lib/reports/mock-data.ts` (리포트)

---

### 경로 2: 댓글 --> 감성 분석 --> 리스크 감지

**심각도: S1 (주요 기능 결손)**

```
CollectionRunner       Comment Analysis     Risk Signal
  .triggerAnalytics()     Service              Service
       |                    |                    |
       v                    v                    v
  TODO: BullMQ Queue  -->  Sentiment         Anomaly/Risk
  (큐 미연동)              Analysis           Detection
                           REAL               REAL
       ^
       |
   GAP: 파이프라인 트리거 미완성
```

| 구성 요소                | 상태 | 근거 파일                                                              |
| ------------------------ | ---- | ---------------------------------------------------------------------- |
| 댓글 수집 트리거         | TODO | `packages/api/src/services/collection/collection-runner.ts` (L390-391) |
| BullMQ 큐 연동           | TODO | 동일 파일 -- `// TODO: [QUEUE] Push to BullMQ comment-analysis queue`  |
| 감성 분석 (TextAnalyzer) | REAL | `packages/api/src/services/engines/text-analyzer.ts`                   |
| 댓글 분석 서비스         | REAL | `packages/api/src/services/comments/comment-analysis.service.ts`       |
| 리스크 시그널 감지       | REAL | `packages/api/src/services/comments/risk-signal.service.ts`            |

**갭 분석**: `triggerAnalytics()` 메서드에서 BullMQ 큐로의 연결이 TODO 상태이다. 감성 분석기와 리스크 감지기는 알고리즘이 구현되어 있으나, 수집된 댓글이 자동으로 분석 파이프라인에 진입하는 경로가 끊겨 있다.

---

### 경로 3: 엔진 --> 인사이트 --> 액션 --> 리포트

**심각도: S1 (주요 기능 결손)**

```
+------------------+     +-----------------+     +------------------+
| 8개 Analytics    |---->| InsightGeneration|---->| ActionRecommend- |
| Engines (ALL REAL)|    | Service (REAL)   |     | ation (REAL)     |
+------------------+     +-----------------+     +------------------+
  text-analyzer                                          |
  intent-classifier                                      v
  cluster-engine                              +------------------+
  journey-engine                              | Report Compo-    |
  competitor-gap-engine                       | sition Service   |
  geo-aeo-scorer                              | narrative: TODO  |
  action-synthesizer                          +------------------+
  engine-logger                                       ^
                                                      |
                                               GAP: AI 내러티브
                                               생성 미연동
```

| 구성 요소            | 상태 | 근거 파일                                                                 |
| -------------------- | ---- | ------------------------------------------------------------------------- |
| TextAnalyzer         | REAL | `packages/api/src/services/engines/text-analyzer.ts`                      |
| IntentClassifier     | REAL | `packages/api/src/services/engines/intent-classifier.ts`                  |
| ClusterEngine        | REAL | `packages/api/src/services/engines/cluster-engine.ts`                     |
| JourneyEngine        | REAL | `packages/api/src/services/engines/journey-engine.ts`                     |
| CompetitorGapEngine  | REAL | `packages/api/src/services/engines/competitor-gap-engine.ts`              |
| GeoAeoScorer         | REAL | `packages/api/src/services/engines/geo-aeo-scorer.ts`                     |
| ActionSynthesizer    | REAL | `packages/api/src/services/engines/action-synthesizer.ts`                 |
| EngineLogger         | REAL | `packages/api/src/services/engines/engine-logger.ts`                      |
| InsightGeneration    | REAL | `packages/api/src/services/insights/insight-generation.service.ts`        |
| InsightSummary       | REAL | `packages/api/src/services/insights/insight-summary.service.ts`           |
| ExecutiveSummary     | REAL | `packages/api/src/services/insights/executive-summary.service.ts`         |
| ActionRecommendation | REAL | `packages/api/src/services/actions/action-recommendation.service.ts`      |
| ActionOrchestrator   | REAL | `packages/api/src/services/actions/action-recommendation-orchestrator.ts` |
| ReportComposition    | REAL | `packages/api/src/services/reports/report-composition.service.ts`         |
| ReportSectionBuilder | REAL | `packages/api/src/services/reports/report-section-builder.ts`             |
| 섹션 내러티브 생성   | TODO | `packages/api/src/services/reports/report.service.ts` (L138)              |
| 리포트 요약 생성     | TODO | `packages/api/src/services/reports/report.service.ts` (L159)              |
| AI 상세 액션 생성    | TODO | `packages/api/src/services/reports/report-section-builder.ts` (L446)      |

**갭 분석**: 8개 분석 엔진 전부 실제 연산 로직이 구현되어 있고, 인사이트/액션 생성도 동작한다. 그러나 리포트 내러티브 텍스트 생성이 `@x2/ai` 연동 TODO로 남아 있어 최종 리포트의 자연어 서술 부분이 비어 있거나 템플릿 수준이다.

---

### 경로 4: 자동화 --> 트리거 --> 전달

**심각도: S1 (주요 기능 결손)**

```
+-----------+     +----------------+     +------------------+
| Trigger   |---->| Automation     |---->| Delivery         |
| Evaluation|     | Orchestrator   |     | RetryService     |
+-----------+     +----------------+     +------------------+
  4-axis REAL       Idempotency REAL       |      |      |
  - Schedule        SHA256 hash          IN_APP  EMAIL  WEBHOOK
  - Event           Cooldown REAL         REAL   PLHDR  PLHDR
  - State           Retry REAL              ^      ^      ^
  - RolePlan        (5m->15m->60m)          |      |      |
                                           OK    GAP    GAP
```

| 구성 요소                 | 상태        | 근거 파일                                                                 |
| ------------------------- | ----------- | ------------------------------------------------------------------------- |
| ScheduleTrigger           | REAL        | `packages/api/src/services/automation/scheduleRegistryService.ts`         |
| EventTrigger              | REAL        | `packages/api/src/services/automation/triggerEvaluationService.ts`        |
| StateTrigger              | REAL        | 동일 파일                                                                 |
| RolePlanTrigger           | REAL        | 동일 파일                                                                 |
| AutomationOrchestrator    | REAL        | `packages/api/src/services/automation/automationOrchestratorService.ts`   |
| Idempotency (SHA256)      | REAL        | 동일 파일 (L303, L311) -- `createHash("sha256")`                          |
| Cooldown 제어             | REAL        | 동일 파일 (L254-265)                                                      |
| Exponential Backoff       | REAL        | `packages/api/src/services/automation/deliveryRetryService.ts` (L38-40)   |
| Execution Log             | REAL        | `packages/api/src/services/automation/automationExecutionLogService.ts`   |
| AccessControl (플랜 기반) | REAL        | `packages/api/src/services/automation/automationAccessControlService.ts`  |
| IN_APP 전달               | REAL        | `packages/api/src/services/automation/deliveryRetryService.ts` (L296-321) |
| EMAIL 전달                | PLACEHOLDER | 동일 파일 (L323-338) -- 로그만 출력, 실제 발송 없음                       |
| WEBHOOK 전달              | PLACEHOLDER | 동일 파일 (L340-354) -- 로그만 출력, HTTP POST 없음                       |

**갭 분석**: 트리거 평가, 오케스트레이션, 멱등성, 쿨다운, 재시도 로직은 모두 프로덕션 수준으로 구현됨. 그러나 EMAIL과 WEBHOOK 전달 채널이 플레이스홀더 상태로, 로그만 기록하고 실제 전송을 수행하지 않는다. `processEmailDelivery`와 `processWebhookDelivery` 메서드 모두 `// 플레이스홀더` 주석과 함께 즉시 성공 처리한다.

---

### 경로 5: GEO/AEO 가시성

**심각도: S2 (품질/완성도)**

```
+---------------+     +----------------+     +------------------+
| GeoAeoService |---->| GeoAeoScorer   |---->| DB: geoAeo-      |
| (REAL)        |     | (REAL engine)  |     | Enabled flag     |
+---------------+     +----------------+     +------------------+
       |
       v
  Search Engine API
  visibilityScore = 0   <-- TODO: 외부 API 미연동
  (하드코딩)
```

| 구성 요소                     | 상태      | 근거 파일                                                     |
| ----------------------------- | --------- | ------------------------------------------------------------- |
| GeoAeoService                 | REAL      | `packages/api/src/services/geo/geo-aeo.service.ts`            |
| CitationService               | REAL      | `packages/api/src/services/geo/citation.service.ts`           |
| GeoAeoScorer (엔진)           | REAL      | `packages/api/src/services/engines/geo-aeo-scorer.ts`         |
| Prisma 스키마 (geoAeoEnabled) | REAL      | `packages/db/prisma/schema.prisma` (L103)                     |
| AI 검색엔진 API 연동          | TODO      | `packages/api/src/services/geo/geo-aeo.service.ts` (L174-178) |
| visibilityScore               | HARDCODED | 동일 파일 (L178) -- `const visibilityScore = 0`               |

**갭 분석**: 서비스 로직, 스코어러 엔진, DB 스키마 모두 구현되어 있으나 외부 AI 검색엔진 API (Perplexity, Google AI Overview 등) 연동이 TODO 상태이다. 결과적으로 `visibilityScore`가 항상 0을 반환하여 실질적인 가시성 측정이 불가능하다.

---

## 2. 자동화 시스템 감사

### 정상 동작 항목

| 항목                        | 설명                                               | 근거 파일                                                      |
| --------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| 4축 자동화 아키텍처         | Schedule, Event, State, Role/Plan 트리거 모두 구현 | `triggerEvaluationService.ts`, `scheduleRegistryService.ts`    |
| 멱등성 키                   | SHA256 해시 기반 중복 실행 방지                    | `automationOrchestratorService.ts` (L303-311)                  |
| 지수 백오프 재시도          | 5분 -> 15분 -> 60분, 최대 3회                      | `deliveryRetryService.ts` (L38-40)                             |
| 플랜 기반 접근 제어         | 백엔드에서 플랜별 자동화 기능 제한                 | `automationAccessControlService.ts`                            |
| Edge 미들웨어 Rate Limiting | 요청 비율 제한                                     | `apps/web/src/middleware.ts` (L3, L37)                         |
| 쿨다운 제어                 | 규칙별 cooldownMinutes 기반 재실행 방지            | `automationOrchestratorService.ts` (L254-265)                  |
| 실행 로그                   | 실행 이력 및 멱등성 키 기록                        | `automationExecutionLogService.ts`                             |
| 도메인별 자동화 서비스      | Alert, Report, Action, GEO, Campaign 전용 서비스   | `automation/alert/`, `report/`, `action/`, `geo/`, `campaign/` |

### 미동작 / 플레이스홀더 항목

| 항목                    | 상태        | 설명                                            | 영향                        |
| ----------------------- | ----------- | ----------------------------------------------- | --------------------------- |
| EMAIL 전달              | PLACEHOLDER | 로그만 출력, 실제 이메일 발송 없음              | 이메일 알림 불가            |
| WEBHOOK 전달            | PLACEHOLDER | 로그만 출력, HTTP POST 없음                     | 외부 시스템 연동 불가       |
| BullMQ 큐 연동          | TODO        | 댓글 분석 파이프라인 큐 미연결                  | 비동기 분석 파이프라인 단절 |
| Ops 모니터링 API 라우트 | 미등록      | `ops-monitoring.service.ts` 존재, 라우터 미등록 | 운영 모니터링 API 접근 불가 |
| Circuit Breaker 영속성  | 인메모리    | 서버 재시작 시 상태 초기화                      | 재시작 후 장애 상태 유실    |
| Stale Data 임계치       | 미정의      | 오래된 데이터 감지 기준 없음                    | 만료 데이터 표시 가능       |
| Dead Letter Queue       | 미구현      | 최대 재시도 초과 시 별도 큐 없음                | 실패 전달 건 유실 가능      |

---

## 3. 자동화 준비도 매트릭스

```
                    구현 완료          플레이스홀더        미구현(TODO)
                 +--------------+  +--------------+  +--------------+
 트리거 평가     |   READY      |  |              |  |              |
 (4축 모두)      +--------------+  +--------------+  +--------------+
                 +--------------+  +--------------+  +--------------+
 오케스트레이션  |   READY      |  |              |  |              |
                 +--------------+  +--------------+  +--------------+
                 +--------------+  +--------------+  +--------------+
 멱등성/중복방지 |   READY      |  |              |  |              |
                 +--------------+  +--------------+  +--------------+
                 +--------------+  +--------------+  +--------------+
 쿨다운 제어     |   READY      |  |              |  |              |
                 +--------------+  +--------------+  +--------------+
                 +--------------+  +--------------+  +--------------+
 재시도 로직     |   READY      |  |              |  |              |
                 +--------------+  +--------------+  +--------------+
                 +--------------+  +--------------+  +--------------+
 접근 제어       |   READY      |  |              |  |              |
                 +--------------+  +--------------+  +--------------+
                 +--------------+  +--------------+  +--------------+
 IN_APP 전달     |   READY      |  |              |  |              |
                 +--------------+  +--------------+  +--------------+
                 +--------------+  +--------------+  +--------------+
 EMAIL 전달      |              |  |  PLACEHOLDER |  |              |
                 +--------------+  +--------------+  +--------------+
                 +--------------+  +--------------+  +--------------+
 WEBHOOK 전달    |              |  |  PLACEHOLDER |  |              |
                 +--------------+  +--------------+  +--------------+
                 +--------------+  +--------------+  +--------------+
 BullMQ 큐       |              |  |              |  |    TODO      |
                 +--------------+  +--------------+  +--------------+
                 +--------------+  +--------------+  +--------------+
 Circuit Breaker |  PARTIAL     |  |              |  |              |
 (인메모리 한정)  +--------------+  +--------------+  +--------------+
                 +--------------+  +--------------+  +--------------+
 Ops 모니터링    |  PARTIAL     |  |              |  |              |
 (서비스만, 라우트X)+-----------+  +--------------+  +--------------+
                 +--------------+  +--------------+  +--------------+
 Dead Letter Q   |              |  |              |  |    TODO      |
                 +--------------+  +--------------+  +--------------+
```

---

## 4. 종합 요약

### 구성 요소별 상태 분포

추적한 5개 경로에서 식별된 구성 요소 총 **42건**:

```
 REAL (실구현)     : 32건  ========================================  76.2%
 MOCK (모의 데이터) :  6건  =======                                   14.3%
 TODO (미구현)     :  2건  ==                                         4.8%
 PLACEHOLDER       :  2건  ==                                         4.8%

 [===========================REAL===========================][==MOCK==][T][P]
 |                    76.2%                                 | 14.3%  |4.8|4.8|
```

### 심각도별 분류

| 심각도 | 건수 | 경로         | 핵심 이슈                                                          |
| ------ | ---- | ------------ | ------------------------------------------------------------------ |
| **S0** | 1    | 경로 1       | 프론트엔드가 mock 데이터를 읽음 -- 백엔드 실데이터 미반영          |
| **S1** | 3    | 경로 2, 3, 4 | BullMQ 큐 미연동, 리포트 내러티브 TODO, EMAIL/WEBHOOK 플레이스홀더 |
| **S2** | 1    | 경로 5       | GEO/AEO visibilityScore 하드코딩 (0)                               |

### 우선 해결 권장 순서

1. **[S0] 프론트엔드 실데이터 연결** -- 대시보드/채널/댓글/경쟁사/리포트 UI가 tRPC를 통해 DB의 실데이터를 읽도록 전환. 현재 6개 mock-data 파일이 존재하며 프론트엔드 서비스 레이어가 이에 의존.
2. **[S1] EMAIL/WEBHOOK 전달 구현** -- `deliveryRetryService.ts`의 `processEmailDelivery`/`processWebhookDelivery`에 실제 전송 로직 추가.
3. **[S1] BullMQ 큐 연동** -- `collection-runner.ts`의 `triggerAnalytics`에서 댓글 분석 큐 연결.
4. **[S1] 리포트 내러티브 AI 연동** -- `report.service.ts`와 `report-section-builder.ts`의 `@x2/ai` 연동 TODO 해소.
5. **[S2] GEO/AEO 외부 API 연동** -- `geo-aeo.service.ts`에서 실제 검색엔진 API 호출 구현.

### 자동화 시스템 총평

자동화 시스템의 핵심 인프라(트리거 평가, 오케스트레이션, 멱등성, 재시도, 접근 제어)는 프로덕션 수준으로 구현되어 있다. 주요 결손은 **최종 전달 단계**(EMAIL, WEBHOOK)와 **비동기 큐 연동**(BullMQ)에 집중되어 있으며, 이는 외부 서비스 통합 작업으로 분류된다. Circuit Breaker의 인메모리 한계와 Dead Letter Queue 부재는 운영 안정성 개선 항목으로 후속 처리가 필요하다.
