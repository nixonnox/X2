# 자동화 아키텍처 (Phase 9)

## 개요

Phase 8까지 구축된 분석 파이프라인을 정책 기반 자동화 시스템으로 전환한다.
핵심: **수동 버튼 → 조건/스케줄/이벤트 기반 자동 실행**

Phase 9는 "분석 결과가 나왔으니 사람이 확인하세요"에서 "조건이 충족되면 시스템이 알아서 실행합니다"로의 전환점이다.

---

## 4축 자동화 구조

### 1. 시간 기반 (Time-based)

| 스케줄            | 예시                       | 서비스                         | cron 표현식   |
| ----------------- | -------------------------- | ------------------------------ | ------------- |
| 매주 월요일 09:00 | 주간 리포트 자동 생성/발송 | ReportAutomationService        | `0 9 * * 1`   |
| 매월 1일 08:00    | 월간 경영진 요약 리포트    | ReportAutomationService        | `0 8 1 * *`   |
| 매일 00:00        | 사용량 집계                | CollectionOrchestrationService | `0 0 * * *`   |
| 6시간마다         | 채널 데이터 동기화         | CollectionOrchestrationService | `0 */6 * * *` |
| 매일 06:00        | 감성 트렌드 일일 체크      | AlertAutomationService         | `0 6 * * *`   |

> 시간대 기본값: `Asia/Seoul`. AutomationRule.timezone 필드로 워크스페이스별 변경 가능.

### 2. 이벤트 기반 (Event-based)

| 이벤트           | 트리거 타입            | 액션                              | 대상 서비스                 |
| ---------------- | ---------------------- | --------------------------------- | --------------------------- |
| 위험 신호 급증   | `RISK_SPIKE`           | 관리자 즉시 알림 + 대응 액션 생성 | AlertAutomationService      |
| 부정 감성 급등   | `SENTIMENT_SPIKE`      | 알림 + 이슈 리포트 자동 생성      | AlertAutomationService      |
| 미답변 FAQ 급증  | `FAQ_SURGE`            | CS 팀 알림 + FAQ 대응 큐 등록     | FaqAutomationService        |
| 키워드 급상승    | `KEYWORD_TREND_CHANGE` | 콘텐츠 기회 알림                  | AlertAutomationService      |
| 캠페인 성과 이상 | `CAMPAIGN_ANOMALY`     | 성과 알림 + 추가 분석             | CampaignAutomationService   |
| GEO 점수 저하    | `GEO_SCORE_CHANGE`     | 최적화 권고 액션 생성             | GeoAutomationService        |
| 수집 실패        | `COLLECTION_FAILURE`   | 운영 알림 + 재시도                | CollectionAutomationService |

### 3. 상태 기반 (State-based)

| 상태 조건        | 트리거 타입           | 액션                      | 대상 서비스                 |
| ---------------- | --------------------- | ------------------------- | --------------------------- |
| 수집 완료 후     | `COLLECTION_COMPLETE` | 분석 엔진 자동 실행       | CollectionAutomationService |
| 분석 완료 후     | `ANALYSIS_COMPLETE`   | 인사이트 생성 + 액션 추천 | ReportAutomationService     |
| 캠페인 종료      | `CAMPAIGN_ENDED`      | 결과 리포트 자동 생성     | CampaignAutomationService   |
| 리포트 생성 완료 | `REPORT_READY`        | 자동 발송                 | ReportAutomationService     |
| 액션 생성 완료   | `ACTION_CREATED`      | 담당자 알림               | AlertAutomationService      |

### 4. 역할/플랜 기반 (Role/Plan-based)

| 플랜       | 자동화 범위 | 최대 규칙 수 | 리포트 자동화 | 알림 채널                    | 웹훅                |
| ---------- | ----------- | ------------ | ------------- | ---------------------------- | ------------------- |
| `FREE`     | 자동화 없음 | 0            | 불가          | 불가                         | 불가                |
| `PRO`      | 기본 자동화 | 5            | 주간 리포트   | IN_APP, EMAIL                | 불가                |
| `BUSINESS` | 전체 자동화 | 50           | 모든 리포트   | IN_APP, EMAIL, SLACK_WEBHOOK | CUSTOM_WEBHOOK 포함 |

> 플랜 확인은 `AutomationAccessControlService`가 담당하며, 규칙 생성 시점과 실행 시점 모두 검증한다.

---

## 서비스 아키텍처

### 코어 자동화 서비스 (6개)

```
┌─────────────────────────────────────────────────────────────┐
│                  AutomationOrchestratorService               │
│         (중앙 조율: 트리거 수신 → 평가 → 실행 → 기록)          │
└──────────┬──────────┬──────────┬──────────┬─────────────────┘
           │          │          │          │
    ┌──────▼──┐ ┌─────▼────┐ ┌──▼──────┐ ┌▼────────────────┐
    │Trigger  │ │Access    │ │Schedule │ │Execution        │
    │Evalua-  │ │Control   │ │Registry │ │LogService       │
    │tion     │ │Service   │ │Service  │ │                 │
    │Service  │ │(플랜/역할)│ │(cron)   │ │(이력/통계)       │
    └─────────┘ └──────────┘ └─────────┘ └─────────────────┘
                                                │
                                    ┌───────────▼───────────┐
                                    │  DeliveryRetryService  │
                                    │  (발송 + 재시도 관리)    │
                                    └────────────────────────┘
```

| #   | 서비스                             | 파일                                | 역할                                                       |
| --- | ---------------------------------- | ----------------------------------- | ---------------------------------------------------------- |
| 1   | **AutomationOrchestratorService**  | `automationOrchestratorService.ts`  | 트리거 수신, 조건 평가 위임, 실행 생성, 도메인 서비스 호출 |
| 2   | **TriggerEvaluationService**       | `triggerEvaluationService.ts`       | 트리거 조건 평가 (임계값, 비교 연산, 복합 조건)            |
| 3   | **AutomationAccessControlService** | `automationAccessControlService.ts` | 플랜별 기능 제한, 역할 검증, 사용량 쿼터                   |
| 4   | **ScheduleRegistryService**        | `scheduleRegistryService.ts`        | 규칙 CRUD, cron 관리, 활성/비활성 토글                     |
| 5   | **AutomationExecutionLogService**  | `automationExecutionLogService.ts`  | 실행 기록, 상태 전이, 통계 조회                            |
| 6   | **DeliveryRetryService**           | `deliveryRetryService.ts`           | 발송 실행, 재시도 관리, 채널별 발송 로직                   |

### 도메인 자동화 서비스 (5개, Phase 9에서 신규 생성 예정)

| #   | 서비스                          | 역할                   | 연결 트리거                                             |
| --- | ------------------------------- | ---------------------- | ------------------------------------------------------- |
| 1   | **ReportAutomationService**     | 리포트 자동 생성/발송  | `SCHEDULE`, `ANALYSIS_COMPLETE`, `REPORT_READY`         |
| 2   | **AlertAutomationService**      | 알림 생성/발송         | `RISK_SPIKE`, `SENTIMENT_SPIKE`, `KEYWORD_TREND_CHANGE` |
| 3   | **CollectionAutomationService** | 수집 후속 처리/재시도  | `COLLECTION_COMPLETE`, `COLLECTION_FAILURE`             |
| 4   | **CampaignAutomationService**   | 캠페인 종료 후 처리    | `CAMPAIGN_ENDED`, `CAMPAIGN_ANOMALY`                    |
| 5   | **GeoAutomationService**        | GEO/AEO 점수 변동 대응 | `GEO_SCORE_CHANGE`                                      |

### 기존 연결 서비스 (Phase 7)

| 서비스                             | 역할                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------- |
| **AlertTriggerPreparationService** | 분석 결과에서 트리거 후보 스캔 (Phase 7) → Phase 9에서 자동화 트리거로 연결 |

---

## 실행 흐름

```
트리거 발생 (이벤트/스케줄/상태 변경)
    │
    ▼
TriggerEvaluationService (조건 평가)
    │  ✗ 조건 불충족 → 무시
    │  ✓ 조건 충족
    ▼
AutomationAccessControlService (권한/플랜 확인)
    │  ✗ 권한 없음 → SKIPPED 기록
    │  ✓ 권한 확인
    ▼
AutomationOrchestratorService
    │  1. 멱등성 키 생성 + 중복 확인
    │  2. 쿨다운 확인
    │  3. AutomationExecution 레코드 생성 (PENDING)
    │  4. 상태 → RUNNING
    ▼
도메인 서비스 호출 (ReportAutomation / AlertAutomation / ...)
    │  ✗ 실패 → 재시도 큐 등록
    │  ✓ 성공
    ▼
DeliveryRetryService (발송 + 재시도)
    │  채널별 DeliveryLog 생성
    │  발송 시도 → 성공/실패 기록
    ▼
AutomationExecutionLogService (결과 기록)
    │  상태 → COMPLETED / FAILED
    │  통계 업데이트 (totalExecutions, successfulExecutions 등)
    ▼
완료
```

---

## 중복 실행 방지

### 실행 레벨 중복 방지

- **멱등성 키 구조**: `${ruleId}:${triggerType}:${date}:${payloadHash}`
  - `ruleId`: 규칙 고유 ID
  - `triggerType`: 트리거 유형 (예: `RISK_SPIKE`)
  - `date`: 실행 날짜 (YYYY-MM-DD)
  - `payloadHash`: 트리거 페이로드의 SHA-256 해시
- **저장소**: `AutomationExecution.idempotencyKey` (UNIQUE 인덱스)
- **동작**: 동일 멱등성 키로 실행 시도 시 SKIPPED 처리

### 쿨다운 기반 과잉 실행 방지

- `AutomationRule.cooldownMinutes`: 규칙별 최소 실행 간격 (기본 60분)
- `AutomationRule.lastTriggeredAt`: 마지막 트리거 시각
- **동작**: `now() - lastTriggeredAt < cooldownMinutes` → 실행 건너뜀

### 발송 레벨 중복 방지

- `DeliveryLog`: `executionId` + `channel` + `recipientId` 조합으로 중복 체크
- 동일 실행에서 같은 채널, 같은 수신자에게 중복 발송 방지

---

## 재시도 정책

### 실행 재시도

| 항목             | 값                                     |
| ---------------- | -------------------------------------- |
| 최대 재시도 횟수 | 3회 (`AutomationExecution.maxRetries`) |
| 백오프 전략      | 지수 백오프                            |
| 1차 재시도       | 5분 후                                 |
| 2차 재시도       | 15분 후                                |
| 3차 재시도       | 60분 후                                |
| 3회 실패 시      | `FAILED` 상태 처리 + 관리자 알림       |

### 발송 재시도

| 항목             | 값                             |
| ---------------- | ------------------------------ |
| 최대 재시도 횟수 | 3회 (`DeliveryLog.retryCount`) |
| 백오프 전략      | 지수 백오프 (동일)             |
| 3회 실패 시      | `FAILED` 상태 + 에스컬레이션   |

---

## 데이터 모델

### AutomationRule (자동화 규칙)

```prisma
model AutomationRule {
  id                String  @id @default(cuid())
  workspaceId       String
  name              String
  description       String?
  triggerType        AutomationTriggerType
  triggerCondition   Json              // { field, operator, value, description }
  cronExpr          String?            // 시간 기반 트리거에만 사용
  timezone          String  @default("Asia/Seoul")
  actionType        AutomationActionType
  actionConfig      Json              // { recipients, template, format 등 }
  isEnabled         Boolean @default(true)
  priority          Int     @default(0)
  requiredPlan      Plan?
  allowedRoles      String[]
  cooldownMinutes   Int @default(60)
  lastTriggeredAt   DateTime?
  totalExecutions   Int @default(0)
  successfulExecutions Int @default(0)
  failedExecutions  Int @default(0)
}
```

### AutomationExecution (실행 기록)

```prisma
model AutomationExecution {
  id             String @id @default(cuid())
  ruleId         String
  workspaceId    String
  status         AutomationExecutionStatus @default(PENDING)
  idempotencyKey String @unique
  triggerType    AutomationTriggerType
  triggerPayload Json?
  actionType     AutomationActionType
  actionResult   Json?
  errorMessage   String?
  scheduledAt    DateTime?
  startedAt      DateTime?
  completedAt    DateTime?
  durationMs     Int?
  retryCount     Int @default(0)
  maxRetries     Int @default(3)
  nextRetryAt    DateTime?
}
```

### DeliveryLog (발송 기록)

```prisma
model DeliveryLog {
  id             String @id @default(cuid())
  executionId    String
  channel        DeliveryChannel      // IN_APP | EMAIL | SLACK_WEBHOOK | CUSTOM_WEBHOOK
  recipientId    String?
  recipientEmail String?
  status         DeliveryStatus @default(PENDING)
  sentAt         DateTime?
  deliveredAt    DateTime?
  failedAt       DateTime?
  errorMessage   String?
  retryCount     Int @default(0)
  nextRetryAt    DateTime?
  sourceType     String?             // 참조 엔티티 타입 (Report, Alert 등)
  sourceId       String?             // 참조 엔티티 ID
}
```

### 관련 Enum

```prisma
enum AutomationTriggerType {
  SCHEDULE           // 시간 기반
  RISK_SPIKE         // 이벤트 기반
  SENTIMENT_SPIKE
  FAQ_SURGE
  KEYWORD_TREND_CHANGE
  CAMPAIGN_ANOMALY
  GEO_SCORE_CHANGE
  COLLECTION_FAILURE
  REPORT_READY
  ACTION_CREATED
  COLLECTION_COMPLETE  // 상태 기반
  ANALYSIS_COMPLETE
  CAMPAIGN_ENDED
}

enum AutomationActionType {
  GENERATE_REPORT
  DELIVER_REPORT
  SEND_ALERT
  CREATE_ACTION
  ESCALATE_RISK
  UPDATE_FAQ_QUEUE
  RECOMMEND_GEO_FIX
  CAMPAIGN_FOLLOWUP
  NOTIFY_TEAM
  PAUSE_COLLECTION
}

enum AutomationExecutionStatus {
  PENDING | RUNNING | COMPLETED | FAILED | SKIPPED | CANCELLED
}

enum DeliveryChannel {
  IN_APP | EMAIL | SLACK_WEBHOOK | CUSTOM_WEBHOOK
}

enum DeliveryStatus {
  PENDING | SENT | DELIVERED | FAILED | BOUNCED
}
```

---

## 다음 단계 (Phase 10)

- tRPC 라우터 연결 (자동화 규칙 CRUD + 실행 이력 조회)
- BullMQ 워커 연결 (실제 스케줄 실행)
- 실제 이메일 발송 (SendGrid/Resend 연동)
- WebSocket 푸시 (IN_APP 알림)
- Slack 웹훅 실연동
- 자동화 대시보드 UI
