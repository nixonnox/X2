# Verify: Alert Engine Prefs Runtime

> Date: 2026-03-16
> Status: PASS (정적 + 동적 4시나리오)

## 정적 검증

| 항목 | 상태 | 근거 |
|------|------|------|
| DEFAULT_THRESHOLDS 제거 | PASS | → `DEFAULT_PREFS` 단일 객체로 통합 |
| DEFAULT_COOLDOWNS → DEFAULT_TYPE_COOLDOWNS | PASS | 최소 floor로만 사용, user pref이 우선 |
| prefs 로드: project → global → default | PASS | line 113-131, prefsSource 추적 |
| thresholds from prefs | PASS | warningSpike_minCount, lowConfidence_threshold, benchmarkDecline_threshold |
| enable toggles from prefs | PASS | enableWarningSpike, enableLowConfidence, etc. |
| cooldown = max(user, type) | PASS | line 231-233 |
| maxAlertsPerDay from prefs | PASS | line 185 |
| channels from prefs | PASS | loadUserChannelPrefs(userId, projectId) |
| [AlertPolicy] trace log | PASS | line 135-157 — prefsSource + appliedPolicy |

## 동적 검증 (DB 시뮬레이션)

| 시나리오 | 기대 | 실제 | 판정 |
|----------|------|------|------|
| A: Project prefs | threshold=5, cooldown=120min, max=10 (not defaults) | USER_PREF confirmed | PASS |
| B: Global fallback | threshold=3, cooldown=60min, max=20 | GLOBAL_PREF | PASS |
| C: Cooldown resolution | user 120min(7.2M ms) > type 1h(3.6M ms) → user wins | 7200000, USER_PREF wins | PASS |
| D: Disabled type | enableBenchmarkDecline=false → SKIPPED | SKIPPED (user disabled) | PASS |
