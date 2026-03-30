# Delivery Log Runtime Evidence

> Date: 2026-03-16

## 코드 경로

### 성공 시
```
dispatch().then(results => {
  for (r of results) {
    persistDeliveryLog({ status: r.status === "SUCCESS" ? "sent" : "failed", ... })
  }
})
```
→ `[DeliveryLog] {"notificationId":"abc","channel":"EMAIL","status":"sent","attemptCount":1,...}`

### 실패 + 재시도 시
```
persistDeliveryLog({ status: "failed", failureReason: r.error })
  → scheduleRetry({ attemptCount: 1 })
    → 5분 후 dispatch()
      → persistDeliveryLog({ status: "sent" or "failed", attemptCount: 2 })
        → 실패 시 scheduleRetry({ attemptCount: 2 })
          → 15분 후 dispatch()
            → persistDeliveryLog({ attemptCount: 3 })
              → 실패 시 persistDeliveryLog({ status: "failed", failureReason: "max_retry_reached" })
```

### Retry 최대 도달 시
```
scheduleRetry(attemptCount >= 3)
  → persistDeliveryLog({ status: "failed", failureReason: "max_retry_attempts_reached" })
  → return (재시도 안 함)
```

## 로그 출력 예시

```
[DeliveryLog] {"notificationId":"a1b2c3","projectId":"proj-001","channel":"EMAIL","status":"sent","attemptCount":1,"failureReason":null,"deliveredAt":"2026-03-16T10:00:00Z","loggedAt":"2026-03-16T10:00:01Z"}

[DeliveryLog] {"notificationId":"a1b2c3","projectId":"proj-001","channel":"WEBHOOK","status":"failed","attemptCount":1,"failureReason":"Webhook HTTP 500","deliveredAt":null,"loggedAt":"2026-03-16T10:00:01Z"}

[DeliveryRetry] Scheduling retry 2/3 for WEBHOOK in 5min

[DeliveryLog] {"notificationId":"a1b2c3","projectId":"","channel":"WEBHOOK","status":"sent","attemptCount":2,"failureReason":null,"deliveredAt":"2026-03-16T10:05:02Z","loggedAt":"2026-03-16T10:05:02Z"}
```
