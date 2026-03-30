# Alert Runtime Guardrail Notes

> Date: 2026-03-16

## 3중 보호 구조

```
evaluateAndAlert() 호출
  │
  ├─ 1. Daily Cap (maxAlertsPerDay)
  │    └─ 오늘 alert 수 >= 한도 → 전체 skip
  │
  ├─ 2. Cooldown (globalCooldownMinutes + type별)
  │    └─ 동일 sourceId가 cooldown 내에 존재 → 개별 skip
  │
  └─ 3. Channel Prefs (channelEmail/channelWebhook)
       └─ 사용자 설정 OFF → 해당 채널 dispatch 안 함
```

## 각 guardrail의 역할

| Guardrail | 보호 대상 | 판단 시점 |
|-----------|----------|----------|
| Daily Cap | 사용자 알림 피로 | evaluateAndAlert 시작 시 |
| Cooldown | 동일 경고 반복 | 조건별 dispatch 직전 |
| Channel Prefs | 원치 않는 채널 발송 | createAlertNotification 내부 |
| Retry Max | 외부 채널 무한 재시도 | scheduleRetry 시작 시 |

## 상호 독립성

| 시나리오 | Daily Cap | Cooldown | Channel | 결과 |
|----------|----------|----------|---------|------|
| 첫 분석, 경고 3건 | OK (0/20) | OK (첫 실행) | IN_APP only | 3건 IN_APP 알림 |
| 같은 키워드 재분석 (10분 후) | OK (3/20) | SKIP (cooldown 1h) | — | 0건 |
| 같은 키워드 재분석 (2시간 후) | OK (3/20) | OK (cooldown 만료) | IN_APP + EMAIL | 3건 IN_APP + EMAIL |
| 20번째 분석 | CAPPED (20/20) | — | — | 0건, dailyCapped=true |

## 수정 이력

| 날짜 | 변경 |
|------|------|
| 이전 | channelEmail/Webhook이 env 기반으로만 결정됨 (사용자 설정 무시) |
| 2026-03-16 | `loadUserChannelPrefs()` 추가 → 사용자 설정 + env 설정 양쪽 충족 시만 발송 |
| 2026-03-16 | `persistDeliveryLog()` 추가 → 구조화 로그로 발송 결과 기록 |
| 2026-03-16 | `scheduleRetry()` 추가 → 5분/15분/60분 exponential backoff, 최대 3회 |
