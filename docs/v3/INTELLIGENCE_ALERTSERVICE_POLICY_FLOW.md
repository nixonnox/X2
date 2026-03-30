# IntelligenceAlertService Policy Flow

> Date: 2026-03-16

## 전체 흐름

```
evaluateAndAlert(params)
  │
  ├─ [1] Load prefs: project → global → DEFAULT_PREFS
  │    └─ prefsSource = "project" | "global" | "default"
  │
  ├─ [2] [AlertPolicy] trace log (어떤 설정이 적용됐는지)
  │
  ├─ [3] Daily cap: prefs.maxAlertsPerDay
  │    └─ count(userId, today UTC) >= max → SKIP
  │
  ├─ [4] evaluateConditions(prefs):
  │    ├─ prefs.enableWarningSpike? → warningSpike_minCount
  │    ├─ prefs.enableLowConfidence? → lowConfidence_threshold
  │    ├─ prefs.enableBenchmarkDecline? → benchmarkDecline_threshold
  │    └─ prefs.enableProviderCoverage? → isPartial + confidence
  │
  ├─ [5] Per-condition:
  │    ├─ cooldownMs = max(userCooldown, typeCooldown)
  │    ├─ isWithinCooldown(sourceId, cooldownMs)?
  │    └─ createAlertNotification(prefs → channels)
  │
  └─ [6] createAlertNotification:
       ├─ loadUserChannelPrefs(userId, projectId) → channels
       ├─ [ChannelDecision] trace log
       ├─ notification.create
       └─ dispatch + retry
```

## 설정값 → 엔진 매핑

| 설정 필드 | 엔진 사용 위치 | 코드 |
|-----------|-------------|------|
| enableWarningSpike | `if (prefs.enableWarningSpike)` | evaluateConditions |
| warningSpike_minCount | `current.warnings.length >= prefs.warningSpike_minCount` | evaluateConditions |
| lowConfidence_threshold | `current.confidence < prefs.lowConfidence_threshold` | evaluateConditions |
| benchmarkDecline_threshold | `prevScore - currentScore >= prefs.benchmarkDecline_threshold` | evaluateConditions |
| globalCooldownMinutes | `Math.max(userCooldownMs, typeCooldownMs)` | per-condition loop |
| maxAlertsPerDay | `dailyAlertCount >= prefs.maxAlertsPerDay` | daily cap check |
| channelEmail | `loadUserChannelPrefs → channels` | createAlertNotification |
| channelWebhook | `loadUserChannelPrefs → channels` | createAlertNotification |
