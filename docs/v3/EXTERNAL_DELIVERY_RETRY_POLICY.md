# External Delivery Retry Policy

> Date: 2026-03-16
> Status: IMPLEMENTED

## Retry 정책

| 시도 | 대기 시간 | 누적 시간 |
|------|----------|----------|
| 1차 실패 → 재시도 | 5분 | 5분 |
| 2차 실패 → 재시도 | 15분 | 20분 |
| 3차 실패 → 포기 | 60분 | 80분 |
| **최대 3회** | | |

## 대상 채널

| 채널 | Retry 대상 |
|------|-----------|
| IN_APP | ✗ (DB 저장이므로 retry 불필요) |
| EMAIL | ✓ |
| WEBHOOK | ✓ |

## 동작 흐름

```
dispatch() 실행
  ├─ SUCCESS → persistDeliveryLog(sent) → 완료
  └─ FAILED → persistDeliveryLog(failed) → scheduleRetry()
       ├─ attemptCount < 3 → setTimeout(delayMs) → dispatch() 재실행
       │    ├─ SUCCESS → persistDeliveryLog(sent) → 완료
       │    └─ FAILED → scheduleRetry(attemptCount + 1)
       └─ attemptCount >= 3 → persistDeliveryLog(max_retry_reached) → 포기
```

## 정합성

| 항목 | 충돌 없음 |
|------|----------|
| Daily cap | ✓ — retry는 이미 생성된 알림의 delivery 재시도이므로 새 알림 생성 아님 |
| Cooldown | ✓ — retry는 동일 알림의 채널 재발송이므로 cooldown 무관 |
| Dedup | ✓ — 같은 notificationId의 같은 채널 재시도이므로 중복 아님 |

## 구현 위치

`intelligence-alert.service.ts`:
- `RETRY_DELAYS = [5*60*1000, 15*60*1000, 60*60*1000]`
- `MAX_RETRY_ATTEMPTS = 3`
- `scheduleRetry()` — setTimeout 기반 (향후 BullMQ delayed job으로 전환 가능)
