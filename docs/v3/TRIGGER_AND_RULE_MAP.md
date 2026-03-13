# 트리거 및 규칙 맵 (Phase 9)

## 개요

모든 자동화 트리거 유형을 정리하고, 각 트리거가 어떤 조건에서 발생하며, 어떤 서비스가 평가하고, 어떤 액션을 실행하는지 매핑한다.

---

## 트리거 분류 체계

```
AutomationTriggerType
├── 시간 기반 (Time-based)
│   └── SCHEDULE
├── 이벤트 기반 (Event-based)
│   ├── RISK_SPIKE
│   ├── SENTIMENT_SPIKE
│   ├── FAQ_SURGE
│   ├── KEYWORD_TREND_CHANGE
│   ├── CAMPAIGN_ANOMALY
│   ├── GEO_SCORE_CHANGE
│   ├── COLLECTION_FAILURE
│   ├── REPORT_READY
│   └── ACTION_CREATED
└── 상태 기반 (State-based)
    ├── COLLECTION_COMPLETE
    ├── ANALYSIS_COMPLETE
    └── CAMPAIGN_ENDED
```

---

## 시간 기반 트리거

### SCHEDULE

| 항목               | 내용                                               |
| ------------------ | -------------------------------------------------- |
| **트리거**         | `SCHEDULE`                                         |
| **발생 조건**      | cron 표현식에 의한 정기 스케줄 도달                |
| **평가 서비스**    | `ScheduleRegistryService`                          |
| **평가 방식**      | cron 파서가 현재 시각과 매칭 여부 확인             |
| **기본 임계값**    | 없음 (cron 표현식 자체가 조건)                     |
| **실행 가능 액션** | `GENERATE_REPORT`, `DELIVER_REPORT`, `NOTIFY_TEAM` |
| **우선순위**       | 낮음 (0) — 정기 작업이므로 긴급하지 않음           |
| **쿨다운 기본값**  | 없음 (cron 주기가 쿨다운 역할)                     |
| **최소 플랜**      | `PRO`                                              |

**스케줄 예시:**

| cron 표현식   | 설명              | 주로 연결되는 액션      |
| ------------- | ----------------- | ----------------------- |
| `0 9 * * 1`   | 매주 월요일 09:00 | 주간 리포트 생성 + 발송 |
| `0 8 1 * *`   | 매월 1일 08:00    | 월간 경영진 요약 리포트 |
| `0 0 * * *`   | 매일 00:00        | 일일 사용량 집계        |
| `0 */6 * * *` | 6시간마다         | 채널 데이터 동기화      |

---

## 이벤트 기반 트리거

### RISK_SPIKE (위험 신호 급증)

| 항목               | 내용                                           |
| ------------------ | ---------------------------------------------- |
| **트리거**         | `RISK_SPIKE`                                   |
| **발생 조건**      | 특정 기간 내 위험 신호 건수가 임계값 초과      |
| **평가 서비스**    | `TriggerEvaluationService`                     |
| **평가 조건**      | `riskSignalCount > threshold` (기간별)         |
| **기본 임계값**    | 24시간 내 5건 이상                             |
| **실행 가능 액션** | `SEND_ALERT`, `ESCALATE_RISK`, `CREATE_ACTION` |
| **우선순위**       | 최고 (100)                                     |
| **쿨다운 기본값**  | 30분                                           |
| **최소 플랜**      | `PRO`                                          |

**triggerCondition 예시:**

```json
{
  "field": "riskSignalCount",
  "operator": "GREATER_THAN",
  "value": 5,
  "period": "24h",
  "description": "24시간 내 위험 신호 5건 이상 발생 시"
}
```

---

### SENTIMENT_SPIKE (부정 감성 급등)

| 항목               | 내용                                                               |
| ------------------ | ------------------------------------------------------------------ |
| **트리거**         | `SENTIMENT_SPIKE`                                                  |
| **발생 조건**      | 부정 감성 비율이 이전 기간 대비 급격히 증가                        |
| **평가 서비스**    | `TriggerEvaluationService`                                         |
| **평가 조건**      | `negativeSentimentRatio > threshold` 또는 `changeRate > threshold` |
| **기본 임계값**    | 부정 비율 30% 초과 또는 전주 대비 50% 이상 증가                    |
| **실행 가능 액션** | `SEND_ALERT`, `GENERATE_REPORT`, `NOTIFY_TEAM`                     |
| **우선순위**       | 높음 (80)                                                          |
| **쿨다운 기본값**  | 60분                                                               |
| **최소 플랜**      | `PRO`                                                              |

**triggerCondition 예시:**

```json
{
  "conditions": [
    {
      "field": "negativeSentimentRatio",
      "operator": "GREATER_THAN",
      "value": 0.3,
      "description": "부정 감성 비율 30% 초과"
    },
    {
      "field": "sentimentChangeRate",
      "operator": "GREATER_THAN",
      "value": 0.5,
      "period": "7d",
      "description": "전주 대비 부정 감성 50% 이상 증가"
    }
  ],
  "logic": "OR"
}
```

---

### FAQ_SURGE (미답변 FAQ 급증)

| 항목               | 내용                                            |
| ------------------ | ----------------------------------------------- |
| **트리거**         | `FAQ_SURGE`                                     |
| **발생 조건**      | 미답변 FAQ 건수가 임계값 초과                   |
| **평가 서비스**    | `TriggerEvaluationService`                      |
| **평가 조건**      | `unansweredFaqCount > threshold` (기간별)       |
| **기본 임계값**    | 24시간 내 미답변 10건 이상                      |
| **실행 가능 액션** | `SEND_ALERT`, `UPDATE_FAQ_QUEUE`, `NOTIFY_TEAM` |
| **우선순위**       | 중간 (60)                                       |
| **쿨다운 기본값**  | 120분                                           |
| **최소 플랜**      | `PRO`                                           |

**triggerCondition 예시:**

```json
{
  "field": "unansweredFaqCount",
  "operator": "GREATER_THAN",
  "value": 10,
  "period": "24h",
  "description": "24시간 내 미답변 FAQ 10건 이상"
}
```

---

### KEYWORD_TREND_CHANGE (키워드 급상승)

| 항목               | 내용                                         |
| ------------------ | -------------------------------------------- |
| **트리거**         | `KEYWORD_TREND_CHANGE`                       |
| **발생 조건**      | 특정 키워드의 검색량/언급량이 급격히 변동    |
| **평가 서비스**    | `TriggerEvaluationService`                   |
| **평가 조건**      | `keywordVolumeChangeRate > threshold`        |
| **기본 임계값**    | 전주 대비 100% 이상 증가                     |
| **실행 가능 액션** | `SEND_ALERT`, `CREATE_ACTION`, `NOTIFY_TEAM` |
| **우선순위**       | 중간 (50)                                    |
| **쿨다운 기본값**  | 180분                                        |
| **최소 플랜**      | `PRO`                                        |

**triggerCondition 예시:**

```json
{
  "field": "keywordVolumeChangeRate",
  "operator": "GREATER_THAN",
  "value": 1.0,
  "period": "7d",
  "keywords": ["*"],
  "description": "전주 대비 키워드 검색량 100% 이상 증가"
}
```

---

### CAMPAIGN_ANOMALY (캠페인 성과 이상)

| 항목               | 내용                                                    |
| ------------------ | ------------------------------------------------------- |
| **트리거**         | `CAMPAIGN_ANOMALY`                                      |
| **발생 조건**      | 캠페인 KPI가 기대 범위를 벗어남 (과도한 하락 또는 상승) |
| **평가 서비스**    | `TriggerEvaluationService`                              |
| **평가 조건**      | `campaignKpiDeviation > threshold`                      |
| **기본 임계값**    | 목표 대비 ±30% 이상 이탈                                |
| **실행 가능 액션** | `SEND_ALERT`, `CAMPAIGN_FOLLOWUP`, `GENERATE_REPORT`    |
| **우선순위**       | 높음 (70)                                               |
| **쿨다운 기본값**  | 120분                                                   |
| **최소 플랜**      | `BUSINESS`                                              |

**triggerCondition 예시:**

```json
{
  "field": "campaignKpiDeviation",
  "operator": "ABS_GREATER_THAN",
  "value": 0.3,
  "kpiType": "CTR",
  "description": "캠페인 CTR이 목표 대비 ±30% 이상 이탈"
}
```

---

### GEO_SCORE_CHANGE (GEO 점수 저하)

| 항목               | 내용                                               |
| ------------------ | -------------------------------------------------- |
| **트리거**         | `GEO_SCORE_CHANGE`                                 |
| **발생 조건**      | GEO/AEO 최적화 점수가 일정 수준 이하로 하락        |
| **평가 서비스**    | `TriggerEvaluationService`                         |
| **평가 조건**      | `geoScoreDelta < threshold` (음수 = 하락)          |
| **기본 임계값**    | 전주 대비 10점 이상 하락                           |
| **실행 가능 액션** | `SEND_ALERT`, `RECOMMEND_GEO_FIX`, `CREATE_ACTION` |
| **우선순위**       | 중간 (60)                                          |
| **쿨다운 기본값**  | 360분 (6시간)                                      |
| **최소 플랜**      | `BUSINESS`                                         |

**triggerCondition 예시:**

```json
{
  "field": "geoScoreDelta",
  "operator": "LESS_THAN",
  "value": -10,
  "period": "7d",
  "description": "전주 대비 GEO 점수 10점 이상 하락"
}
```

---

### COLLECTION_FAILURE (수집 실패)

| 항목               | 내용                                            |
| ------------------ | ----------------------------------------------- |
| **트리거**         | `COLLECTION_FAILURE`                            |
| **발생 조건**      | 데이터 수집 작업이 실패                         |
| **평가 서비스**    | `TriggerEvaluationService`                      |
| **평가 조건**      | 수집 작업 상태가 `FAILED`로 전이                |
| **기본 임계값**    | 없음 (실패 발생 즉시)                           |
| **실행 가능 액션** | `SEND_ALERT`, `PAUSE_COLLECTION`, `NOTIFY_TEAM` |
| **우선순위**       | 높음 (90)                                       |
| **쿨다운 기본값**  | 15분                                            |
| **최소 플랜**      | `PRO`                                           |

**triggerCondition 예시:**

```json
{
  "field": "collectionStatus",
  "operator": "EQUALS",
  "value": "FAILED",
  "description": "수집 작업 실패 시 즉시 트리거"
}
```

---

### REPORT_READY (리포트 생성 완료)

| 항목               | 내용                                  |
| ------------------ | ------------------------------------- |
| **트리거**         | `REPORT_READY`                        |
| **발생 조건**      | 리포트 생성이 완료되어 발송 가능 상태 |
| **평가 서비스**    | `TriggerEvaluationService`            |
| **평가 조건**      | 리포트 상태가 `READY`로 전이          |
| **기본 임계값**    | 없음 (상태 전이 즉시)                 |
| **실행 가능 액션** | `DELIVER_REPORT`, `NOTIFY_TEAM`       |
| **우선순위**       | 낮음 (30)                             |
| **쿨다운 기본값**  | 5분                                   |
| **최소 플랜**      | `PRO`                                 |

---

### ACTION_CREATED (액션 생성 완료)

| 항목               | 내용                        |
| ------------------ | --------------------------- |
| **트리거**         | `ACTION_CREATED`            |
| **발생 조건**      | 새로운 실행 액션이 생성됨   |
| **평가 서비스**    | `TriggerEvaluationService`  |
| **평가 조건**      | 액션 레코드 생성 이벤트     |
| **기본 임계값**    | 없음 (생성 즉시)            |
| **실행 가능 액션** | `SEND_ALERT`, `NOTIFY_TEAM` |
| **우선순위**       | 낮음 (20)                   |
| **쿨다운 기본값**  | 10분                        |
| **최소 플랜**      | `PRO`                       |

---

## 상태 기반 트리거

### COLLECTION_COMPLETE (수집 완료)

| 항목               | 내용                                                |
| ------------------ | --------------------------------------------------- |
| **트리거**         | `COLLECTION_COMPLETE`                               |
| **발생 조건**      | 데이터 수집 작업이 성공적으로 완료                  |
| **평가 서비스**    | `TriggerEvaluationService`                          |
| **평가 조건**      | 수집 작업 상태가 `COMPLETED`로 전이                 |
| **기본 임계값**    | 없음 (상태 전이 즉시)                               |
| **실행 가능 액션** | `GENERATE_REPORT`, `NOTIFY_TEAM`                    |
| **우선순위**       | 중간 (40)                                           |
| **쿨다운 기본값**  | 없음 (수집 완료마다 실행)                           |
| **최소 플랜**      | `PRO`                                               |
| **비고**           | 수집 완료 → 분석 엔진 자동 실행 파이프라인의 시작점 |

---

### ANALYSIS_COMPLETE (분석 완료)

| 항목               | 내용                                              |
| ------------------ | ------------------------------------------------- |
| **트리거**         | `ANALYSIS_COMPLETE`                               |
| **발생 조건**      | 분석 엔진 처리가 완료되어 인사이트 생성 가능      |
| **평가 서비스**    | `TriggerEvaluationService`                        |
| **평가 조건**      | 분석 작업 상태가 `COMPLETED`로 전이               |
| **기본 임계값**    | 없음 (상태 전이 즉시)                             |
| **실행 가능 액션** | `GENERATE_REPORT`, `CREATE_ACTION`, `NOTIFY_TEAM` |
| **우선순위**       | 중간 (40)                                         |
| **쿨다운 기본값**  | 없음                                              |
| **최소 플랜**      | `PRO`                                             |
| **비고**           | 인사이트 생성 + 액션 추천 자동 트리거             |

---

### CAMPAIGN_ENDED (캠페인 종료)

| 항목               | 내용                                                  |
| ------------------ | ----------------------------------------------------- |
| **트리거**         | `CAMPAIGN_ENDED`                                      |
| **발생 조건**      | 캠페인의 종료일 도달 또는 수동 종료                   |
| **평가 서비스**    | `TriggerEvaluationService`                            |
| **평가 조건**      | 캠페인 상태가 `ENDED`로 전이                          |
| **기본 임계값**    | 없음 (상태 전이 즉시)                                 |
| **실행 가능 액션** | `GENERATE_REPORT`, `CAMPAIGN_FOLLOWUP`, `NOTIFY_TEAM` |
| **우선순위**       | 중간 (50)                                             |
| **쿨다운 기본값**  | 없음 (캠페인당 1회)                                   |
| **최소 플랜**      | `BUSINESS`                                            |
| **비고**           | 캠페인 결과 리포트 자동 생성 트리거                   |

---

## 전체 트리거 요약 테이블

| 트리거                 | 평가 조건             | 기본 임계값       | 액션                                   | 우선순위 | 쿨다운 | 최소 플랜  |
| ---------------------- | --------------------- | ----------------- | -------------------------------------- | -------- | ------ | ---------- |
| `SCHEDULE`             | cron 매칭             | —                 | `GENERATE_REPORT`, `DELIVER_REPORT`    | 0        | —      | `PRO`      |
| `RISK_SPIKE`           | 위험 신호 건수 초과   | 24h 내 5건        | `SEND_ALERT`, `ESCALATE_RISK`          | 100      | 30분   | `PRO`      |
| `SENTIMENT_SPIKE`      | 부정 감성 비율/변화율 | 30% 또는 +50%     | `SEND_ALERT`, `GENERATE_REPORT`        | 80       | 60분   | `PRO`      |
| `FAQ_SURGE`            | 미답변 FAQ 건수       | 24h 내 10건       | `SEND_ALERT`, `UPDATE_FAQ_QUEUE`       | 60       | 120분  | `PRO`      |
| `KEYWORD_TREND_CHANGE` | 키워드 변동률         | +100% (전주 대비) | `SEND_ALERT`, `CREATE_ACTION`          | 50       | 180분  | `PRO`      |
| `CAMPAIGN_ANOMALY`     | KPI 이탈도            | ±30%              | `SEND_ALERT`, `CAMPAIGN_FOLLOWUP`      | 70       | 120분  | `BUSINESS` |
| `GEO_SCORE_CHANGE`     | 점수 하락폭           | -10점 (전주 대비) | `SEND_ALERT`, `RECOMMEND_GEO_FIX`      | 60       | 360분  | `BUSINESS` |
| `COLLECTION_FAILURE`   | 수집 실패 상태        | 즉시              | `SEND_ALERT`, `PAUSE_COLLECTION`       | 90       | 15분   | `PRO`      |
| `REPORT_READY`         | 리포트 완성 상태      | 즉시              | `DELIVER_REPORT`                       | 30       | 5분    | `PRO`      |
| `ACTION_CREATED`       | 액션 생성 이벤트      | 즉시              | `SEND_ALERT`, `NOTIFY_TEAM`            | 20       | 10분   | `PRO`      |
| `COLLECTION_COMPLETE`  | 수집 완료 상태        | 즉시              | `GENERATE_REPORT`                      | 40       | —      | `PRO`      |
| `ANALYSIS_COMPLETE`    | 분석 완료 상태        | 즉시              | `GENERATE_REPORT`, `CREATE_ACTION`     | 40       | —      | `PRO`      |
| `CAMPAIGN_ENDED`       | 캠페인 종료 상태      | 즉시              | `GENERATE_REPORT`, `CAMPAIGN_FOLLOWUP` | 50       | —      | `BUSINESS` |

---

## 액션 타입별 설명

| 액션 타입           | 설명                                         | 주요 트리거                                              |
| ------------------- | -------------------------------------------- | -------------------------------------------------------- |
| `GENERATE_REPORT`   | 리포트 자동 생성 (주간/월간/캠페인 결과)     | `SCHEDULE`, `ANALYSIS_COMPLETE`, `CAMPAIGN_ENDED`        |
| `DELIVER_REPORT`    | 생성된 리포트를 수신자에게 발송              | `REPORT_READY`, `SCHEDULE`                               |
| `SEND_ALERT`        | 알림 메시지 발송 (IN_APP, EMAIL 등)          | 모든 이벤트 트리거                                       |
| `CREATE_ACTION`     | 실행 가능한 액션 항목 자동 생성              | `RISK_SPIKE`, `KEYWORD_TREND_CHANGE`, `GEO_SCORE_CHANGE` |
| `ESCALATE_RISK`     | 위험 에스컬레이션 (관리자 직접 알림)         | `RISK_SPIKE`                                             |
| `UPDATE_FAQ_QUEUE`  | FAQ 대응 큐에 항목 등록                      | `FAQ_SURGE`                                              |
| `RECOMMEND_GEO_FIX` | GEO/AEO 최적화 권고 사항 생성                | `GEO_SCORE_CHANGE`                                       |
| `CAMPAIGN_FOLLOWUP` | 캠페인 후속 조치 (결과 분석, 다음 단계 제안) | `CAMPAIGN_ENDED`, `CAMPAIGN_ANOMALY`                     |
| `NOTIFY_TEAM`       | 팀 전체 알림 발송                            | 모든 트리거 (보조 액션)                                  |
| `PAUSE_COLLECTION`  | 데이터 수집 일시 중지                        | `COLLECTION_FAILURE`                                     |

---

## triggerCondition JSON 스키마

```typescript
interface TriggerCondition {
  // 단일 조건
  field: string; // 평가 대상 필드명
  operator: ConditionOperator;
  value: number | string; // 임계값
  period?: string; // 평가 기간 (예: "24h", "7d")
  description?: string; // 한국어 설명

  // 복합 조건 (선택)
  conditions?: TriggerCondition[];
  logic?: "AND" | "OR";
}

type ConditionOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "GREATER_THAN_OR_EQUAL"
  | "LESS_THAN_OR_EQUAL"
  | "ABS_GREATER_THAN" // 절대값 비교 (±)
  | "CONTAINS"
  | "IN";
```

---

## 우선순위 가이드라인

| 범위   | 등급 | 설명                               | 예시                                                       |
| ------ | ---- | ---------------------------------- | ---------------------------------------------------------- |
| 90-100 | 긴급 | 즉각 대응 필요, 비즈니스 임팩트 큼 | `RISK_SPIKE`, `COLLECTION_FAILURE`                         |
| 70-89  | 높음 | 빠른 확인 필요                     | `SENTIMENT_SPIKE`, `CAMPAIGN_ANOMALY`                      |
| 50-69  | 중간 | 당일 내 확인                       | `FAQ_SURGE`, `GEO_SCORE_CHANGE`, `KEYWORD_TREND_CHANGE`    |
| 20-49  | 낮음 | 정보성, 일괄 처리 가능             | `COLLECTION_COMPLETE`, `ANALYSIS_COMPLETE`, `REPORT_READY` |
| 0-19   | 최저 | 정기 작업, 알림 없이 실행          | `SCHEDULE`, `ACTION_CREATED`                               |
