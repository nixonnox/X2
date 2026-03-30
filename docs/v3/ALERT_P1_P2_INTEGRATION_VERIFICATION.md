# Alert P1/P2 Integration Verification

> Date: 2026-03-16
> Status: PASS (S1 2건)

## End-to-End Alert Lifecycle

```
intelligence.analyze (tRPC mutation)
  │
  ├─ [1] alertService.evaluateAndAlert(params)
  │    ├─ [1a] Load user prefs (maxAlertsPerDay, channels, thresholds)
  │    ├─ [1b] Daily cap check ← P1-1
  │    │    └─ notification.count({ userId, "intelligence_alert", today })
  │    │    └─ >= maxAlertsPerDay → SKIP ALL, dailyCapped: true
  │    ├─ [1c] Evaluate conditions (WARNING_SPIKE, LOW_CONFIDENCE, etc.)
  │    └─ [1d] Per-condition loop:
  │         ├─ remainingDailyCap check ← P1-1 (mid-eval)
  │         ├─ Cooldown check (sourceId-based)
  │         └─ createAlertNotification()
  │              │
  │              ├─ [2] Resolve channels ← P1-2
  │              │    ├─ loadUserChannelPrefs(userId)
  │              │    ├─ IN_APP always
  │              │    ├─ EMAIL if userPref.channelEmail && env.configured
  │              │    └─ WEBHOOK if userPref.channelWebhook && (env || url)
  │              │
  │              ├─ [3] notification.create (DB — IN_APP delivery)
  │              │    → Bell unreadCount +1
  │              │    → notification.channels = resolved channels
  │              │
  │              └─ [4] dispatcher.dispatch(externalChannels) ← non-blocking
  │                   │
  │                   ├─ [4a] For each channel result:
  │                   │    ├─ persistDeliveryLog() ← P2-3
  │                   │    │    └─ notification.emailSentAt update
  │                   │    │    └─ Structured JSON log
  │                   │    │
  │                   │    └─ if FAILED → scheduleRetry() ← P2-4
  │                   │         ├─ attemptCount < 3?
  │                   │         │    YES → setTimeout(delay) → dispatch retry
  │                   │         │         └─ persistDeliveryLog(result)
  │                   │         │         └─ if FAILED → scheduleRetry(+1)
  │                   │         │    NO → persistDeliveryLog("max_retry_reached")
  │                   │         └─ return
  │                   │
  │                   └─ [4b] channels === ["IN_APP"] only → no dispatch
  │
  └─ return { alertsTriggered, dailyCapped }
       → analyze response metadata
```

## 통합 검증 매트릭스

| 축 | 상태 | 근거 |
|----|------|------|
| **1. Alert generation guardrail** | PASS | daily cap (전체+mid-eval) + cooldown (sourceId) + 조건별 enable toggle |
| **2. Dispatch decision** | PASS | user prefs × env config = 채널 결정. false → 미포함 → 시도 안 함 |
| **3. Delivery persistence** | PARTIAL | structured log ✓, notification.emailSentAt ✓. delivery_logs 테이블 직접 사용 불가 (S1) |
| **4. Retry lifecycle** | PASS | 5분/15분/60분, 최대 3회, 성공 시 중단, 포기 시 로그. setTimeout 기반 (S1) |
| **5. Bell/notifications 영향** | PASS | daily cap → 알림 생성 자체 차단 → unreadCount 급증 없음. retry는 기존 알림 재발송 → 새 알림 안 만듦 |
| **6. Daily cap/cooldown/dedup 정합성** | PASS | 3개가 독립 경로에서 동작. daily cap(전체) → cooldown(sourceId별) → dispatch(채널별). 충돌 없음 |
| **7. User preference 반영** | PASS | loadUserChannelPrefs → 채널 결정 → dispatch. 미설정 시 IN_APP만 |
| **8. E2E alert lifecycle** | PASS | 조건 충족 → cap → cooldown → 생성 → 채널 결정 → dispatch → log → retry → 완료 |
