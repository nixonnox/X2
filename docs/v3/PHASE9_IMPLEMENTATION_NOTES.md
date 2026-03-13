# Phase 9 Implementation Notes

## 아키텍처 요약

Phase 9는 Phase 7-8에서 구축된 분석/인사이트/리포트 파이프라인을 **정책 기반 자동화 시스템**으로 전환한다.
핵심 원칙: **수동 확인 → 조건/스케줄/이벤트 기반 자동 실행, 중복 방지와 안전한 재시도 보장**.

4축 자동화 구조(시간/이벤트/상태/역할 기반)를 통해 리포트 자동 생성, 위험 알림, 수집 후속 처리, 캠페인 종료 대응 등을 자동화한다.

---

## 변경된 파일 목록

### schema.prisma 변경 사항

| 구분                | 항목                        | 설명                                                         |
| ------------------- | --------------------------- | ------------------------------------------------------------ |
| **모델 추가 (3개)** | `AutomationRule`            | 자동화 규칙 정의 (트리거 + 조건 + 액션)                      |
|                     | `AutomationExecution`       | 자동화 실행 기록 (멱등성 키, 재시도, 상태 추적)              |
|                     | `DeliveryLog`               | 발송 기록 (채널별 발송, 재시도, 수신 확인)                   |
| **Enum 추가 (5개)** | `AutomationTriggerType`     | 13개 트리거 유형 (SCHEDULE, RISK_SPIKE 등)                   |
|                     | `AutomationActionType`      | 10개 액션 유형 (GENERATE_REPORT, SEND_ALERT 등)              |
|                     | `AutomationExecutionStatus` | 6개 실행 상태 (PENDING → RUNNING → COMPLETED/FAILED)         |
|                     | `DeliveryChannel`           | 4개 발송 채널 (IN_APP, EMAIL, SLACK_WEBHOOK, CUSTOM_WEBHOOK) |
|                     | `DeliveryStatus`            | 5개 발송 상태 (PENDING → SENT → DELIVERED/FAILED/BOUNCED)    |
| **기존 모델 수정**  | `Workspace`                 | `automationRules AutomationRule[]` 관계 필드 추가            |

### 코어 자동화 서비스 — 신규 생성 (6개)

| 파일                                                                     | 서비스                           | 설명                                                                |
| ------------------------------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------- |
| `packages/api/src/services/automation/automationOrchestratorService.ts`  | `AutomationOrchestratorService`  | 중앙 조율: 트리거 수신 → 평가 위임 → 실행 생성 → 도메인 서비스 호출 |
| `packages/api/src/services/automation/triggerEvaluationService.ts`       | `TriggerEvaluationService`       | 트리거 조건 평가 (임계값, 비교 연산, 복합 조건 AND/OR)              |
| `packages/api/src/services/automation/automationAccessControlService.ts` | `AutomationAccessControlService` | 플랜별 기능 제한 (규칙 수, 채널, 리포트), 역할 검증, 사용량 쿼터    |
| `packages/api/src/services/automation/scheduleRegistryService.ts`        | `ScheduleRegistryService`        | 자동화 규칙 CRUD, cron 관리, 활성/비활성 토글                       |
| `packages/api/src/services/automation/automationExecutionLogService.ts`  | `AutomationExecutionLogService`  | 실행 기록 생성, 상태 전이, 통계 조회, 이력 검색                     |
| `packages/api/src/services/automation/deliveryRetryService.ts`           | `DeliveryRetryService`           | 채널별 발송 실행, 재시도 관리, 중복 발송 방지                       |

### 도메인 자동화 서비스 — 신규 생성 예정 (5개)

| 서비스                        | 역할                       | 연결 트리거                                                               |
| ----------------------------- | -------------------------- | ------------------------------------------------------------------------- |
| `ReportAutomationService`     | 리포트 자동 생성/발송 조율 | `SCHEDULE`, `ANALYSIS_COMPLETE`, `REPORT_READY`                           |
| `AlertAutomationService`      | 알림 자동 생성/발송        | `RISK_SPIKE`, `SENTIMENT_SPIKE`, `KEYWORD_TREND_CHANGE`, `ACTION_CREATED` |
| `CollectionAutomationService` | 수집 완료/실패 후속 처리   | `COLLECTION_COMPLETE`, `COLLECTION_FAILURE`                               |
| `CampaignAutomationService`   | 캠페인 종료/이상 대응      | `CAMPAIGN_ENDED`, `CAMPAIGN_ANOMALY`                                      |
| `GeoAutomationService`        | GEO/AEO 점수 변동 대응     | `GEO_SCORE_CHANGE`                                                        |

### 인덱스/익스포트 수정 (2개)

| 파일                                            | 변경 내용                       |
| ----------------------------------------------- | ------------------------------- |
| `packages/api/src/services/automation/index.ts` | 6개 코어 서비스 + 타입 익스포트 |
| `packages/api/src/services/index.ts`            | automation 모듈 re-export 추가  |

### 문서 — 신규 생성 (4개)

| 파일                                               | 설명                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/v3/AUTOMATION_ARCHITECTURE.md`               | 4축 자동화 구조, 서비스 맵, 실행 흐름, 중복 방지, 재시도 정책      |
| `docs/v3/TRIGGER_AND_RULE_MAP.md`                  | 전체 트리거 유형별 조건, 임계값, 액션, 우선순위, 쿨다운, 플랜 매핑 |
| `docs/v3/DELIVERY_RETRY_AND_DUPLICATION_POLICY.md` | 채널별 발송 처리, 재시도 정책, 중복 방지, 부분 발송, 에스컬레이션  |
| `docs/v3/PHASE9_IMPLEMENTATION_NOTES.md`           | 본 문서                                                            |

---

## 의존성 그래프

```
schema.prisma (AutomationRule, AutomationExecution, DeliveryLog)
    → 모든 자동화 서비스의 데이터 레이어

AutomationOrchestratorService (중앙 조율)
    → TriggerEvaluationService (조건 평가)
    → AutomationAccessControlService (권한/플랜 확인)
    → ScheduleRegistryService (규칙 조회)
    → AutomationExecutionLogService (실행 기록)
    → DeliveryRetryService (발송 + 재시도)

TriggerEvaluationService
    → AutomationRule.triggerCondition (JSON 조건 파싱)
    → 각 분석 서비스의 최신 데이터 참조

AutomationAccessControlService
    → Workspace.plan (플랜 확인)
    → WorkspaceMember.role (역할 확인)

ScheduleRegistryService
    → AutomationRule CRUD
    → BullMQ (Phase 10에서 실제 스케줄 등록)

DeliveryRetryService
    → DeliveryLog (발송 기록)
    → 외부 발송 채널 (Email, Slack, Webhook — Phase 10 연결)

도메인 자동화 서비스 (5개)
    → Phase 7 서비스 (InsightGeneration, ReportComposition 등)
    → AutomationOrchestratorService (실행 결과 반환)

AlertTriggerPreparationService (Phase 7, 기존)
    → Phase 9 자동화 트리거의 입력 소스
    → TriggerEvaluationService에서 참조
```

---

## TypeScript 컴파일 상태

- Phase 9 신규/수정 파일: **0 에러** (목표)
- 코어 자동화 서비스 6개: Prisma 타입 기반, 외부 의존성 최소화
- 도메인 자동화 서비스 5개: 인터페이스 정의 완료, 구현은 Phase 10에서 실연동
- 기존 에러: `@x2/social` 패키지 (Instagram/TikTok) — Phase 9 무관

---

## 설계 결정 기록

### 1. 멱등성 키 기반 중복 방지

- **결정**: 모든 자동화 실행에 `${ruleId}:${triggerType}:${date}:${payloadHash}` 형태의 멱등성 키 부여
- **이유**: 이벤트 기반 시스템에서 동일 트리거가 여러 번 발화될 수 있음. DB UNIQUE 제약으로 물리적 중복 차단
- **구현**: `AutomationExecution.idempotencyKey` UNIQUE 인덱스, 생성 전 존재 여부 확인

### 2. 플랜 기반 자동화 제어

- **결정**: FREE/PRO/BUSINESS 플랜별 자동화 기능 범위 차등 적용
- **이유**: 자동화는 서버 리소스를 지속적으로 소비하므로 플랜별 제한 필수
- **구현**: `AutomationAccessControlService`가 규칙 생성 시점과 실행 시점 모두 검증
- **세부 제한**:
  - FREE: 자동화 없음 (규칙 0개)
  - PRO: 규칙 5개, 주간 리포트, IN_APP/EMAIL 채널
  - BUSINESS: 규칙 50개, 모든 리포트/알림, 전 채널 포함 웹훅

### 3. 쿨다운 기반 과잉 실행 방지

- **결정**: 규칙별 `cooldownMinutes` 설정으로 연속 트리거 방지
- **이유**: 이벤트 스파이크 시 동일 규칙이 수십 번 트리거될 수 있음. 쿨다운 없이는 알림 폭주 발생
- **구현**: `AutomationRule.lastTriggeredAt`과 `cooldownMinutes` 비교, 쿨다운 내이면 SKIPPED
- **기본값**: 트리거 유형별 차등 (RISK_SPIKE: 30분, FAQ_SURGE: 120분, GEO_SCORE_CHANGE: 360분)

### 4. 한국어 우선 알림 메시지

- **결정**: 자동화 알림/에스컬레이션 메시지를 한국어로 작성
- **이유**: 주 사용자층이 한국어 사용자, Phase 8에서 한국어 우선 원칙 확립
- **구현**: 알림 템플릿과 에스컬레이션 메시지를 한국어로 하드코딩, 추후 i18n 전환 가능
- **예시**: `"24시간 내 위험 신호 5건 이상 발생 — 즉시 확인이 필요합니다"`

---

## Phase 10에서 해야 할 일

### 필수 (Must)

1. **tRPC 라우터 연결**: 자동화 규칙 CRUD, 실행 이력 조회, 발송 로그 조회 라우터 생성
2. **실제 이메일 발송**: SendGrid 또는 Resend API 연동, 이메일 템플릿 렌더링
3. **WebSocket 푸시**: IN_APP 채널의 실시간 알림 전달 (Socket.IO 또는 ws)
4. **BullMQ 워커 연결**: 시간 기반 트리거(SCHEDULE)의 실제 cron 스케줄 실행
5. **도메인 자동화 서비스 구현**: 5개 도메인 서비스의 실제 비즈니스 로직 구현

### 권장 (Should)

6. **Slack 웹훅 실연동**: Slack Block Kit 메시지 구성 + Incoming Webhook 발송
7. **PDF/PPT 내보내기**: 리포트를 PDF/PPTX 파일로 자동 생성 + 발송 첨부
8. **자동화 대시보드 UI**: 규칙 목록, 실행 이력, 발송 로그 확인 화면
9. **이메일 수신 확인 웹훅**: SendGrid/Resend의 이벤트 웹훅으로 DELIVERED/BOUNCED 상태 추적

### 선택 (Nice to have)

10. **커스텀 워크플로우 빌더**: 사용자가 UI에서 트리거 → 조건 → 액션을 조합하는 비주얼 편집기
11. **A/B 테스트 자동화**: 캠페인 변형별 자동 성과 비교 + 우승 변형 자동 적용
12. **자동화 분석 대시보드**: 규칙별 성공률, 평균 실행 시간, 발송 성공률 등 운영 지표
13. **커스텀 웹훅 HMAC 서명**: 외부 시스템 연동 시 페이로드 무결성 검증
