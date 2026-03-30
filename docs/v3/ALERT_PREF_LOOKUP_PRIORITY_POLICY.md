# Alert Preference Lookup Priority Policy

> Date: 2026-03-16

## 조회 순서

```
loadUserChannelPrefs(userId, projectId?)
  │
  ├─ projectId 있음?
  │    ├─ YES → findFirst({ userId, projectId })
  │    │    ├─ 있음 → 반환 (project-specific)
  │    │    └─ 없음 → fallback to global
  │    └─ NO → skip
  │
  ├─ findFirst({ userId, projectId: null })
  │    ├─ 있음 → 반환 (global)
  │    └─ 없음 → fallback to defaults
  │
  └─ defaults: { channelInApp: true, channelEmail: false, channelWebhook: false }
```

## evaluateAndAlert 내 prefs 로드 (동일 순서)

```
1차: findFirst({ userId, projectId })  ← project-specific thresholds
2차: findFirst({ userId, projectId: null })  ← global thresholds
3차: DEFAULT_CONFIG  ← 하드코드
```

## 왜 project-specific이 우선인가

| 시나리오 | 예시 |
|----------|------|
| 뷰티 프로젝트: 민감한 키워드 → 알림 많이 | maxAlertsPerDay=50, 쿨다운 30분 |
| 금융 프로젝트: 중요 키워드만 → 알림 적게 | maxAlertsPerDay=5, 쿨다운 6시간 |
| 기본 설정 | maxAlertsPerDay=20, 쿨다운 1시간 |

프로젝트마다 다른 민감도와 빈도가 필요합니다.
