# Retry & Delivery Log Integration Check

> Date: 2026-03-16

## 모든 retry 경로에서 delivery log가 기록되는가?

| 경로 | persistDeliveryLog 호출 | 검증 |
|------|------------------------|------|
| 1차 dispatch 성공 | PASS | line 406 — `status: "sent"` |
| 1차 dispatch 실패 | PASS | line 406 — `status: "failed"` |
| Retry 성공 | PASS | line 590 — `status: "sent"`, `attemptCount: N+1` |
| Retry 실패 | PASS | line 590 — `status: "failed"`, `attemptCount: N+1` |
| Max attempts 도달 (포기) | PASS | line 552 — `failureReason: "max_retry_attempts_reached"` |
| Retry setTimeout 내 exception | **MISSING** | line 607-608 — `catch(err)` 있으나 persistDeliveryLog 호출 없음 |

## attemptCount 추적

| 시도 | attemptCount | 기록 |
|------|-------------|------|
| 1차 dispatch | 1 | line 406, 435 |
| 1차 retry | 2 | line 590, 595 |
| 2차 retry | 3 | line 590, 595 |
| 3회 초과 | 3 | line 552-558 (포기) |

## Log 예시 시퀀스

```
# 1차 dispatch 실패
[DeliveryLog] {"notificationId":"abc","channel":"WEBHOOK","status":"failed","attemptCount":1,"failureReason":"Webhook HTTP 500"}
[DeliveryRetry] Scheduling retry 2/3 for WEBHOOK in 5min

# 2차 (5분 후) 성공
[DeliveryLog] {"notificationId":"abc","channel":"WEBHOOK","status":"sent","attemptCount":2}

---

# 1차 실패 → 2차 실패 → 3차 실패 → 포기
[DeliveryLog] {"notificationId":"abc","channel":"EMAIL","status":"failed","attemptCount":1}
[DeliveryRetry] Scheduling retry 2/3 for EMAIL in 5min
[DeliveryLog] {"notificationId":"abc","channel":"EMAIL","status":"failed","attemptCount":2}
[DeliveryRetry] Scheduling retry 3/3 for EMAIL in 15min
[DeliveryLog] {"notificationId":"abc","channel":"EMAIL","status":"failed","attemptCount":3}
[DeliveryRetry] Max attempts reached for EMAIL on abc — giving up
[DeliveryLog] {"notificationId":"abc","channel":"EMAIL","status":"failed","attemptCount":3,"failureReason":"max_retry_attempts_reached"}
```
