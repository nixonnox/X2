# Alert Daily Cap Verification

> Date: 2026-03-16
> Status: PASS

## 1. Guardrail 적용 위치

| 항목 | 상태 | 근거 |
|------|------|------|
| evaluateAndAlert 내부 | PASS | line 137-158 — 조건 평가 전에 daily cap 체크 |
| createAlertNotification 전 | PASS | line 174-179 — 반복문 내에서도 remainingDailyCap 체크 |
| 우회 경로 없음 | PASS | intelligence alert는 **오직** evaluateAndAlert → createAlertNotification 경로만 사용 |

### 보호 흐름

```
intelligence.analyze (tRPC route, line 312-313)
  └─ alertService.evaluateAndAlert()
       ├─ [1] prefs.maxAlertsPerDay 로드 (기본 20)
       ├─ [2] 오늘 intelligence_alert 수 카운트 (line 142-148)
       ├─ [3] dailyAlertCount >= maxAlertsPerDay → SKIP ALL (line 153-158)
       ├─ [4] remainingDailyCap = max - count (line 169)
       └─ [5] 조건별 loop:
            ├─ remainingDailyCap <= 0 → break (line 174-179)
            ├─ cooldown 체크 → skip if active
            └─ createAlertNotification → remainingDailyCap-- (line 212)
```

## 2. Runtime 동작

| 시나리오 | 예상 동작 | 검증 |
|----------|----------|------|
| 첫 분석, 조건 3개 충족 | 3건 생성 (0→3) | PASS — remainingDailyCap 20→17 |
| 이후 반복 분석 (cooldown 내) | 0건 (cooldown) | PASS — isWithinCooldown 체크 |
| cooldown 만료 후 반복 분석 | 조건수만큼 생성 | PASS |
| 20번째 알림 이후 | 0건 + dailyCapped=true | PASS — line 153-157 |
| maxAlertsPerDay=5로 설정 | 5건 이후 차단 | PASS — userPref에서 로드 |

## 3. Cap 초과 시 상태/로그

| 항목 | 상태 | 근거 |
|------|------|------|
| console.info 로그 | PASS | `"Daily cap reached for user {userId}: {count}/{max} — skipping all alerts"` |
| mid-evaluation 로그 | PASS | `"Daily cap reached mid-evaluation — skipping remaining conditions"` |
| 반환값 metadata | PASS | `{ alertsTriggered: [], dailyCapped: true }` |
| analyze response | PASS | `metadata.alertsTriggered` 배열 + `dailyCapped` 필드 |

## 4. 하루 단위 reset 기준

| 항목 | 상태 | 근거 |
|------|------|------|
| 기준 시각 | PASS | `todayStart.setHours(0, 0, 0, 0)` — 로컬 자정 기준 |
| 쿼리 | PASS | `createdAt: { gte: todayStart }` — 오늘 0시 이후 |
| scope | **userId 단위** | `where: { userId, sourceType: "intelligence_alert" }` |

## 5. 다른 알림 생성 경로

| 서비스 | Daily cap 적용 | 이유 |
|--------|---------------|------|
| `intelligence-alert.service.ts` | **YES** | evaluateAndAlert → daily cap 체크 |
| `risk-signal.service.ts` | NO | 다른 sourceType ("risk_signal"), 별도 guardrail 필요 |
| `alertAutomationService.ts` | NO | automation 규칙 기반, 별도 cooldown 있음 |
| `ops-monitoring.service.ts` | NO | 시스템 알림, 별도 scope |
| `notification.service.ts` | NO | 범용 서비스, 호출자가 guardrail 책임 |

**intelligence alert 경로는 완벽히 보호됨.** 다른 유형은 별도 스코프.
