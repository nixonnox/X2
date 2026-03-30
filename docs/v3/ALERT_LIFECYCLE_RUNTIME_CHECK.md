# Alert Lifecycle Runtime Check

> Date: 2026-03-16

## 시나리오별 통합 흐름

### A. 첫 분석, 경고 3건, 이메일 ON
```
evaluateAndAlert()
  → prefs: { maxAlertsPerDay: 20, channelEmail: true }
  → dailyAlertCount: 0 → OK
  → conditions: [WARNING_SPIKE(HIGH), LOW_CONFIDENCE(NORMAL)]
  → cooldown: 첫 실행 → 통과
  → createAlertNotification(WARNING_SPIKE):
      → channels: ["IN_APP", "EMAIL"]
      → notification.create → Bell +1
      → dispatch(["EMAIL"]) → email 발송
      → persistDeliveryLog(sent)
  → createAlertNotification(LOW_CONFIDENCE):
      → channels: ["IN_APP", "EMAIL"]
      → notification.create → Bell +2
      → dispatch(["EMAIL"]) → email 발송
      → persistDeliveryLog(sent)
  → return { alertsTriggered: ["WARNING_SPIKE", "LOW_CONFIDENCE"], dailyCapped: false }
```

### B. 같은 키워드 재분석 (30분 후), cooldown 1h
```
evaluateAndAlert()
  → dailyAlertCount: 2 → OK (< 20)
  → conditions: [WARNING_SPIKE, LOW_CONFIDENCE]
  → WARNING_SPIKE: isWithinCooldown("proj:WARNING_SPIKE:키워드", 1h) → TRUE → skip
  → LOW_CONFIDENCE: isWithinCooldown("proj:LOW_CONFIDENCE:키워드", 24h) → TRUE → skip
  → return { alertsTriggered: [], dailyCapped: false }
```

### C. 20번째 분석, daily cap 도달
```
evaluateAndAlert()
  → dailyAlertCount: 20 → >= maxAlertsPerDay(20)
  → return { alertsTriggered: [], dailyCapped: true }
  (조건 평가조차 안 함)
```

### D. EMAIL 발송 실패 → retry
```
dispatch(["EMAIL"]) → FAILED ("Email API error 503")
  → persistDeliveryLog({ status: "failed", attemptCount: 1 })
  → scheduleRetry({ channel: "EMAIL", attemptCount: 1 })
    → setTimeout(300000) // 5분
    → 5분 후:
      → dispatch(["EMAIL"]) → SUCCESS
      → persistDeliveryLog({ status: "sent", attemptCount: 2 })
      (retry 종료)
```

### E. WEBHOOK 발송 3회 실패 → 포기
```
dispatch(["WEBHOOK"]) → FAILED
  → persistDeliveryLog(failed, 1)
  → scheduleRetry(1)
    → 5분 후 dispatch → FAILED
    → persistDeliveryLog(failed, 2)
    → scheduleRetry(2)
      → 15분 후 dispatch → FAILED
      → persistDeliveryLog(failed, 3)
      → scheduleRetry(3)
        → attemptCount >= 3 → persistDeliveryLog("max_retry_reached") → return
```

### F. 사용자가 이메일 끔 + 웹훅 끔
```
createAlertNotification()
  → loadUserChannelPrefs → { channelEmail: false, channelWebhook: false }
  → channels: ["IN_APP"]  (외부 채널 미포함)
  → channels.length === 1 → dispatch 호출 안 함
  → IN_APP만 저장
```

## Mock/Stub 잔존 확인

| 항목 | Mock/Stub 여부 | 상태 |
|------|---------------|------|
| evaluateAndAlert | 실제 DB 쿼리 | ✓ 실제 |
| notification.create | Prisma DB | ✓ 실제 |
| notification.count (daily cap) | Prisma DB | ✓ 실제 |
| loadUserChannelPrefs | Prisma DB | ✓ 실제 |
| dispatcher.dispatch | 실제 fetch (email/webhook) | ✓ 실제 (API key 필요) |
| persistDeliveryLog | structured log + DB update | ✓ 실제 (부분 DB) |
| scheduleRetry | **setTimeout** | △ 메모리 기반 (서버 재시작 시 소실) |
