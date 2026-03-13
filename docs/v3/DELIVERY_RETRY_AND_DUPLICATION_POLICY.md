# 발송, 재시도 및 중복 방지 정책 (Phase 9)

## 개요

자동화 시스템에서 생성된 리포트, 알림, 액션 등을 사용자에게 전달하는 과정의 정책을 정의한다.
핵심: **발송 실패 시 안전하게 재시도하되, 중복 발송은 절대 방지한다.**

---

## 발송 채널별 처리

### 지원 채널

| 채널        | enum 값          | 설명                        | 최소 플랜  |
| ----------- | ---------------- | --------------------------- | ---------- |
| 인앱 알림   | `IN_APP`         | 대시보드 내 알림 센터       | `PRO`      |
| 이메일      | `EMAIL`          | 등록된 이메일 주소로 발송   | `PRO`      |
| Slack 웹훅  | `SLACK_WEBHOOK`  | Slack 채널로 메시지 전송    | `BUSINESS` |
| 커스텀 웹훅 | `CUSTOM_WEBHOOK` | 사용자 지정 HTTP 엔드포인트 | `BUSINESS` |

### 채널별 발송 로직

#### IN_APP (인앱 알림)

```
DeliveryRetryService.sendInApp()
    → Notification 레코드 생성 (DB)
    → WebSocket 이벤트 발행 (Phase 10에서 연결)
    → DeliveryLog.status = DELIVERED
```

| 항목          | 값                                      |
| ------------- | --------------------------------------- |
| 발송 방식     | DB 기록 + WebSocket 푸시                |
| 실패 가능성   | 매우 낮음 (DB 기록 실패 시에만)         |
| 재시도 필요성 | 거의 없음                               |
| 수신 확인     | 사용자가 알림 확인 시 `readAt` 업데이트 |

#### EMAIL (이메일)

```
DeliveryRetryService.sendEmail()
    → 이메일 템플릿 렌더링
    → SendGrid/Resend API 호출
    → 성공 시 DeliveryLog.status = SENT
    → 바운스/실패 시 재시도 큐 등록
```

| 항목          | 값                                                         |
| ------------- | ---------------------------------------------------------- |
| 발송 방식     | 외부 이메일 서비스 API (SendGrid/Resend)                   |
| 실패 가능성   | 중간 (API 오류, 잘못된 주소, 발송 한도 초과)               |
| 재시도 필요성 | 높음                                                       |
| 수신 확인     | 이메일 서비스의 웹훅으로 `DELIVERED` / `BOUNCED` 상태 수신 |

#### SLACK_WEBHOOK (Slack 웹훅)

```
DeliveryRetryService.sendSlackWebhook()
    → Slack Block Kit 메시지 구성
    → 등록된 웹훅 URL로 POST 요청
    → HTTP 200 → SENT
    → HTTP 4xx/5xx → 재시도
```

| 항목          | 값                                              |
| ------------- | ----------------------------------------------- |
| 발송 방식     | Slack Incoming Webhook POST                     |
| 실패 가능성   | 중간 (웹훅 URL 변경, 네트워크 오류, rate limit) |
| 재시도 필요성 | 높음                                            |
| 수신 확인     | HTTP 200 응답으로 SENT 처리 (DELIVERED 불가)    |

#### CUSTOM_WEBHOOK (커스텀 웹훅)

```
DeliveryRetryService.sendCustomWebhook()
    → JSON 페이로드 구성
    → 등록된 URL로 POST 요청 (HMAC 서명 포함)
    → HTTP 2xx → SENT
    → HTTP 4xx/5xx → 재시도
```

| 항목          | 값                                                |
| ------------- | ------------------------------------------------- |
| 발송 방식     | HTTP POST + HMAC-SHA256 서명 헤더                 |
| 실패 가능성   | 높음 (외부 서버 의존)                             |
| 재시도 필요성 | 매우 높음                                         |
| 수신 확인     | HTTP 2xx 응답으로 SENT 처리                       |
| 보안          | `X-Webhook-Signature` 헤더로 페이로드 무결성 검증 |
| 타임아웃      | 10초 (초과 시 실패 처리)                          |

---

## 재시도 정책

### 실행 레벨 재시도 (AutomationExecution)

자동화 실행 자체가 실패한 경우 (도메인 서비스 호출 실패 등)

| 항목             | 값                                                      |
| ---------------- | ------------------------------------------------------- |
| 최대 재시도 횟수 | 3회 (`maxRetries = 3`)                                  |
| 백오프 전략      | 지수 백오프 (Exponential Backoff)                       |
| 1차 재시도 간격  | 5분                                                     |
| 2차 재시도 간격  | 15분                                                    |
| 3차 재시도 간격  | 60분                                                    |
| 간격 계산 공식   | `baseDelay * Math.pow(3, retryCount)` (baseDelay = 5분) |
| 최종 실패 시     | `status = FAILED` + 관리자 에스컬레이션 알림            |

**상태 전이:**

```
PENDING → RUNNING → COMPLETED (성공)
                  → FAILED (실패)
                       → PENDING (재시도 스케줄)
                            → RUNNING → COMPLETED / FAILED
                                           → ... (최대 3회)
                                           → FAILED (최종, 에스컬레이션)
```

**nextRetryAt 계산:**

```typescript
function calculateNextRetry(retryCount: number): Date {
  const baseDelayMs = 5 * 60 * 1000; // 5분
  const delayMs = baseDelayMs * Math.pow(3, retryCount);
  return new Date(Date.now() + delayMs);
}
// retryCount 0 → 5분 후
// retryCount 1 → 15분 후
// retryCount 2 → 45분 후 (실제 적용은 60분으로 캡)
```

### 발송 레벨 재시도 (DeliveryLog)

개별 발송 건이 실패한 경우 (이메일 전송 실패, 웹훅 타임아웃 등)

| 항목             | 값                               |
| ---------------- | -------------------------------- |
| 최대 재시도 횟수 | 3회 (`retryCount <= 3`)          |
| 백오프 전략      | 지수 백오프 (동일)               |
| 1차 재시도 간격  | 5분                              |
| 2차 재시도 간격  | 15분                             |
| 3차 재시도 간격  | 60분                             |
| 최종 실패 시     | `status = FAILED` + 에스컬레이션 |

**상태 전이:**

```
PENDING → SENT → DELIVERED (최종 성공)
       → FAILED (발송 실패)
            → PENDING (재시도 예약)
                 → SENT / FAILED
                      → ... (최대 3회)
                      → FAILED (최종)
       → BOUNCED (이메일 반송 — 재시도 없음)
```

### 재시도 불가 에러

아래 오류는 재시도하지 않고 즉시 `FAILED` 처리한다:

| 오류 유형             | 설명                            | 처리                      |
| --------------------- | ------------------------------- | ------------------------- |
| 잘못된 이메일 주소    | 형식 오류, 존재하지 않는 도메인 | 즉시 FAILED               |
| 웹훅 URL 형식 오류    | 유효하지 않은 URL               | 즉시 FAILED               |
| 인증 오류 (401/403)   | API 키 만료, 권한 부족          | 즉시 FAILED + 관리자 알림 |
| 페이로드 크기 초과    | 발송 메시지가 너무 큼           | 즉시 FAILED               |
| 이메일 반송 (BOUNCED) | 수신자 메일함 없음 등           | 즉시 BOUNCED              |

---

## 중복 방지 정책

### 실행 레벨 중복 방지

**멱등성 키 (Idempotency Key)**

모든 자동화 실행에 고유한 멱등성 키를 부여하여 동일 실행의 중복을 방지한다.

```
멱등성 키 구조: ${ruleId}:${triggerType}:${date}:${payloadHash}
```

| 구성 요소     | 설명                           | 예시          |
| ------------- | ------------------------------ | ------------- |
| `ruleId`      | 자동화 규칙 ID                 | `clxyz123...` |
| `triggerType` | 트리거 유형                    | `RISK_SPIKE`  |
| `date`        | 실행 날짜 (YYYY-MM-DD)         | `2026-03-12`  |
| `payloadHash` | 트리거 페이로드의 SHA-256 해시 | `a1b2c3d4...` |

**동작:**

```typescript
// 1. 멱등성 키 생성
const idempotencyKey = `${rule.id}:${triggerType}:${today}:${hash(payload)}`;

// 2. 기존 실행 확인
const existing = await db.automationExecution.findUnique({
  where: { idempotencyKey }
});

// 3. 이미 존재하면 SKIPPED
if (existing) {
  return { status: 'SKIPPED', reason: 'DUPLICATE_EXECUTION' };
}

// 4. 새 실행 생성
await db.automationExecution.create({
  data: { idempotencyKey, ... }
});
```

**쿨다운 기반 방지:**

```typescript
// 마지막 트리거 이후 쿨다운 시간이 지나지 않았으면 건너뜀
const cooldownEnd = new Date(
  rule.lastTriggeredAt.getTime() + rule.cooldownMinutes * 60 * 1000,
);

if (now < cooldownEnd) {
  return { status: "SKIPPED", reason: "COOLDOWN_ACTIVE" };
}
```

### 발송 레벨 중복 방지

동일 실행 내에서 같은 채널, 같은 수신자에게 중복 발송을 방지한다.

**확인 기준:**

```
유니크 조합: executionId + channel + recipientId
```

| 항목          | 설명                            |
| ------------- | ------------------------------- |
| `executionId` | 자동화 실행 ID                  |
| `channel`     | 발송 채널 (IN_APP, EMAIL 등)    |
| `recipientId` | 수신자 ID (또는 recipientEmail) |

**동작:**

```typescript
// 발송 전 중복 확인
const existingDelivery = await db.deliveryLog.findFirst({
  where: {
    executionId,
    channel,
    recipientId,
    status: { in: ["SENT", "DELIVERED", "PENDING"] },
  },
});

if (existingDelivery) {
  // 이미 발송됨 → 건너뜀
  return { skipped: true, reason: "ALREADY_DELIVERED" };
}
```

---

## 부분 발송 처리

하나의 실행에서 여러 수신자/채널로 발송할 때, 일부만 성공하는 경우의 처리 정책.

### 시나리오별 처리

| 시나리오             | 실행 상태   | DeliveryLog 상태        | 처리                      |
| -------------------- | ----------- | ----------------------- | ------------------------- |
| 전체 성공            | `COMPLETED` | 모두 `SENT`/`DELIVERED` | 정상 완료                 |
| 전체 실패            | `FAILED`    | 모두 `FAILED`           | 실행 재시도               |
| 일부 성공, 일부 실패 | `COMPLETED` | 혼합                    | 실패 건만 개별 재시도     |
| 일부 성공, 일부 반송 | `COMPLETED` | 혼합 (`BOUNCED` 포함)   | 반송은 재시도 없이 기록만 |

### 부분 실패 처리 흐름

```
AutomationExecution (RUNNING)
    │
    ├─ DeliveryLog #1 (EMAIL, user_a) → SENT ✓
    ├─ DeliveryLog #2 (EMAIL, user_b) → FAILED ✗ → 재시도 예약
    ├─ DeliveryLog #3 (SLACK_WEBHOOK) → SENT ✓
    └─ DeliveryLog #4 (EMAIL, user_c) → BOUNCED ✗ → 재시도 없음
    │
    ▼
AutomationExecution → COMPLETED (부분 성공)
    → actionResult에 성공/실패 요약 기록
    → 실패 건(#2)은 DeliveryRetryService가 개별 재시도
```

**부분 성공 결과 기록:**

```json
{
  "totalDeliveries": 4,
  "successful": 2,
  "failed": 1,
  "bounced": 1,
  "failedRecipients": ["user_b"],
  "bouncedRecipients": ["user_c"]
}
```

> 중요: 부분 실패 시에도 실행 상태는 `COMPLETED`로 처리한다. 개별 발송 재시도는 `DeliveryRetryService`가 독립적으로 관리한다.

---

## 에스컬레이션 정책

### 에스컬레이션 트리거 조건

| 조건                              | 에스컬레이션 액션                                |
| --------------------------------- | ------------------------------------------------ |
| 실행 3회 재시도 실패              | 워크스페이스 OWNER/ADMIN에게 IN_APP + EMAIL 알림 |
| 발송 3회 재시도 실패              | 워크스페이스 OWNER/ADMIN에게 IN_APP 알림         |
| 동일 규칙 24시간 내 5회 이상 실패 | 규칙 자동 비활성화 + 관리자 알림                 |
| 수집 실패 연속 3회                | 운영팀 알림 + 수집 일시 중지 권고                |

### 에스컬레이션 알림 내용

```
[자동화 에스컬레이션]

규칙: {rule.name}
상태: 3회 재시도 후 최종 실패
트리거: {triggerType}
마지막 에러: {errorMessage}
실행 ID: {executionId}

조치가 필요합니다. 자동화 관리 화면에서 확인해 주세요.
```

### 자동 비활성화

```typescript
// 24시간 내 실패 횟수 확인
const recentFailures = await db.automationExecution.count({
  where: {
    ruleId: rule.id,
    status: "FAILED",
    createdAt: { gte: twentyFourHoursAgo },
  },
});

// 5회 이상이면 규칙 비활성화
if (recentFailures >= 5) {
  await db.automationRule.update({
    where: { id: rule.id },
    data: { isEnabled: false },
  });

  // 관리자 알림 발송
  await notifyAdmins({
    type: "RULE_AUTO_DISABLED",
    ruleId: rule.id,
    reason: `24시간 내 ${recentFailures}회 실행 실패로 자동 비활성화`,
  });
}
```

---

## 발송 상태 추적

### 전체 상태 다이어그램

```
                    ┌─────────┐
                    │ PENDING │ (DeliveryLog 생성)
                    └────┬────┘
                         │ 발송 시도
                    ┌────▼────┐
              ┌─────┤ 발송 중  ├─────┐
              │     └─────────┘     │
         성공 │                     │ 실패
         ┌────▼────┐           ┌────▼────┐
         │  SENT   │           │ FAILED  │
         └────┬────┘           └────┬────┘
              │                     │ retryCount < 3?
         수신 확인              ┌────▼────┐
         ┌────▼──────┐    예   │ PENDING │ (재시도 예약)
         │ DELIVERED │         └─────────┘
         └───────────┘    아니오
                          ┌────▼────────┐
                          │ FAILED(최종) │ → 에스컬레이션
                          └─────────────┘

         ┌──────────┐
         │ BOUNCED  │ (이메일 반송 — 재시도 없음)
         └──────────┘
```

### DeliveryStatus 값 정의

| 상태        | 설명                         | 재시도 여부               | 최종 상태            |
| ----------- | ---------------------------- | ------------------------- | -------------------- |
| `PENDING`   | 발송 대기 중 / 재시도 예약됨 | —                         | 아니오               |
| `SENT`      | 발송 완료 (수신 확인 전)     | —                         | EMAIL 외 채널은 최종 |
| `DELIVERED` | 수신 확인됨                  | —                         | 예                   |
| `FAILED`    | 발송 실패                    | retryCount < 3이면 재시도 | 3회 초과 시 최종     |
| `BOUNCED`   | 이메일 반송 (수신자 측 거부) | 아니오                    | 예                   |

### 채널별 최종 상태

| 채널             | 성공 최종 상태 | 비고                                  |
| ---------------- | -------------- | ------------------------------------- |
| `IN_APP`         | `DELIVERED`    | DB 기록 즉시 DELIVERED                |
| `EMAIL`          | `DELIVERED`    | 이메일 서비스 웹훅으로 DELIVERED 수신 |
| `SLACK_WEBHOOK`  | `SENT`         | Slack은 수신 확인 불가, SENT가 최종   |
| `CUSTOM_WEBHOOK` | `SENT`         | HTTP 2xx 응답 시 SENT가 최종          |

---

## 모니터링 및 대시보드 지표

### 핵심 지표

| 지표              | 계산 방식                                | 알림 임계값                 |
| ----------------- | ---------------------------------------- | --------------------------- |
| 발송 성공률       | `DELIVERED / (DELIVERED + FAILED) * 100` | 90% 미만 시 경고            |
| 평균 발송 지연    | `AVG(sentAt - createdAt)`                | 10분 초과 시 경고           |
| 재시도 비율       | `SUM(retryCount > 0) / COUNT(*) * 100`   | 20% 초과 시 경고            |
| 반송률 (EMAIL)    | `BOUNCED / total_email * 100`            | 5% 초과 시 이메일 정리 권고 |
| 에스컬레이션 건수 | `COUNT(최종 FAILED)` / 일                | 5건/일 초과 시 경고         |
