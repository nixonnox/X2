# Settings → Dispatch Lifecycle Check

> Date: 2026-03-16

## 전체 Lifecycle

```
[1] 사용자가 /settings/notifications에서 설정 변경
     └─ savePreferences({ channelEmail: true, maxAlertsPerDay: 5, projectId? })
          │
          ├─ [1a] 기존값 로드 (oldPrefs)
          ├─ [1b] Webhook URL test POST (channelWebhook=true 시)
          ├─ [1c] DB upsert (project-specific or global)
          ├─ [1d] Audit diff → notification.create(pref_audit)
          └─ return { saved, warnings, webhookTestResult }

[2] Intelligence 분석 실행
     └─ alertService.evaluateAndAlert({ projectId, userId })
          │
          ├─ [2a] loadPrefs: project-specific → global → default
          ├─ [2b] Daily cap: count(userId, today UTC) >= maxAlertsPerDay?
          │         → YES: return { dailyCapped: true }
          ├─ [2c] Per-condition: cooldown → createAlertNotification
          └─ [2d] createAlertNotification:
               ├─ loadUserChannelPrefs(userId, projectId)
               ├─ channels = [IN_APP, +EMAIL?, +WEBHOOK?]
               ├─ [ChannelDecision] trace log
               ├─ notification.create(channels)
               └─ dispatch(externalChannels)
                    ├─ success → persistDeliveryLog(sent)
                    └─ failed → persistDeliveryLog(failed) → scheduleRetry

[3] 운영자 추적
     └─ getPreferenceAuditLog → 설정 변경 이력
     └─ notification.list → 알림 이력 (pref_audit 제외 가능)
     └─ [ChannelDecision] log → 채널 결정 이유
     └─ [DeliveryLog] log → 발송 결과
     └─ [DeliveryRetry] log → 재시도 이력
```
