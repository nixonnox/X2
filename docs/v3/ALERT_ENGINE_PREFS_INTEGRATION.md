# Alert Engine ← Prefs Integration

> Date: 2026-03-16
> Status: IMPLEMENTED

## 현재 상태 (수정 후)

| 정책 항목 | 소스 | 하드코딩 여부 |
|-----------|------|-------------|
| enableWarningSpike/LowConfidence/etc | **UserAlertPreference** | ✗ (DB에서 읽음) |
| warningSpike_minCount | **UserAlertPreference** | ✗ |
| lowConfidence_threshold | **UserAlertPreference** | ✗ |
| benchmarkDecline_threshold | **UserAlertPreference** | ✗ |
| globalCooldownMinutes | **UserAlertPreference** | ✗ |
| maxAlertsPerDay | **UserAlertPreference** | ✗ |
| channelEmail/Webhook | **UserAlertPreference** | ✗ |
| 타입별 cooldown (WARNING_SPIKE=1h 등) | **DEFAULT_TYPE_COOLDOWNS** (fallback floor) | △ (최소값으로만 사용) |

## Cooldown 해결 로직

```
cooldownMs = Math.max(
  userCooldownMs,      // prefs.globalCooldownMinutes * 60 * 1000 (사용자 설정)
  typeCooldownMs       // DEFAULT_TYPE_COOLDOWNS[type] (타입별 최소 보장)
)
```

- 사용자가 globalCooldownMinutes=120(2시간) 설정 → 모든 타입에 2시간 적용
- 사용자가 globalCooldownMinutes=30(30분) 설정 → WARNING_SPIKE는 1시간(타입 최소), LOW_CONFIDENCE는 24시간(타입 최소)
- 사용자가 설정 없음 → DEFAULT_PREFS.globalCooldownMinutes=60분 → 타입별 최소와 비교

## Prefs Source Tracking

```json
[AlertPolicy] {
  "userId": "usr-001",
  "projectId": "proj-001",
  "prefsSource": "project",
  "appliedPolicy": {
    "maxAlertsPerDay": 5,
    "globalCooldownMinutes": 30,
    "thresholds": { "warningSpike": 3, "lowConfidence": 0.4, "benchmarkDecline": 15 },
    "channels": { "email": true, "webhook": false },
    "enabledAlerts": { "warningSpike": true, "lowConfidence": true, ... }
  }
}
```

## Lookup 우선순위

```
1차: project-specific (userId + projectId) → prefsSource = "project"
2차: global (userId + projectId=null) → prefsSource = "global"
3차: DEFAULT_PREFS (하드코딩) → prefsSource = "default"
```
