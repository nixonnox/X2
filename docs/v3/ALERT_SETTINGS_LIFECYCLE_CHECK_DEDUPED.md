# Alert Settings Lifecycle Check (Deduped)

> Date: 2026-03-16

## E2E Lifecycle (검증됨)

```
[1] 사용자가 설정 저장
     └─ savePreferences({ projectId, channelEmail, maxAlertsPerDay, ... })
          ├─ oldPrefs 로드 → diff → audit log (pref_audit)
          ├─ webhook test POST (channelWebhook=true 시)
          └─ DB upsert (project-scoped or global)

[2] Alert 발생
     └─ evaluateAndAlert({ projectId, userId })
          ├─ loadPrefs: project(1차) → global(2차) → DEFAULT_PREFS(3차)
          ├─ [AlertPolicy] trace log (prefsSource + appliedPolicy)
          ├─ Daily cap: count >= maxAlertsPerDay → SKIP
          ├─ Conditions: enable toggles + thresholds from prefs
          ├─ Cooldown: max(userCooldown, typeCooldown)
          └─ createAlertNotification:
               ├─ loadUserChannelPrefs(userId, projectId)
               ├─ emailVerified 확인 → unverified면 EMAIL 제거
               ├─ channels = [IN_APP, +EMAIL?, +WEBHOOK?]
               └─ dispatch → delivery_log → retry(BullMQ)

[3] 운영자 추적
     └─ audit log: 누가/언제/뭘 바꿨는지
     └─ delivery_log: 어떤 채널/결과/재시도
     └─ [AlertPolicy] log: 어떤 설정이 적용됐는지
     └─ [ChannelDecision] log: 왜 특정 채널이 선택/제외됐는지
```
