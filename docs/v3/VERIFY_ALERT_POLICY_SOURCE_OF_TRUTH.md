# Verify: Alert Policy Source of Truth

> Date: 2026-03-16

## Source of Truth 확인

| 정책 항목 | Source of Truth | 하드코딩? | 검증 |
|-----------|----------------|----------|------|
| warningSpike_minCount | UserAlertPreference → DEFAULT_PREFS | fallback만 | PASS (A: 5≠3) |
| lowConfidence_threshold | UserAlertPreference → DEFAULT_PREFS | fallback만 | PASS |
| benchmarkDecline_threshold | UserAlertPreference → DEFAULT_PREFS | fallback만 | PASS |
| enableWarningSpike | UserAlertPreference → DEFAULT_PREFS | fallback만 | PASS (D: false) |
| globalCooldownMinutes | UserAlertPreference → DEFAULT_PREFS | fallback만 | PASS (C: 120≠60) |
| maxAlertsPerDay | UserAlertPreference → DEFAULT_PREFS | fallback만 | PASS (A: 10≠20) |
| channelEmail/Webhook | UserAlertPreference → DEFAULT_PREFS | fallback만 | PASS (A: email=true) |
| 타입별 cooldown | DEFAULT_TYPE_COOLDOWNS | **최소 floor** (의도적) | PASS (C: user>type) |

## "하드코딩이 우선 적용되는가?"

**아닙니다.** 모든 경로에서:
1. UserAlertPreference가 있으면 → 그 값 사용
2. 없을 때만 DEFAULT_PREFS (명시적 fallback)
3. 타입별 cooldown은 `Math.max(user, type)` — user가 더 길면 user 우선

## Trace 증거

```json
[AlertPolicy] {
  "prefsSource": "project",
  "appliedPolicy": {
    "maxAlertsPerDay": 10,
    "globalCooldownMinutes": 120,
    "thresholds": { "warningSpike": 5 }
  }
}
```
→ prefsSource="project" → 설정 UI의 값이 실제 엔진에 반영됨
