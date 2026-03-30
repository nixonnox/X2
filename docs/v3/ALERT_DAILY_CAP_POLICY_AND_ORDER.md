# Alert Daily Cap Policy & Order

> Date: 2026-03-16

## Guardrail 실행 순서

```
evaluateAndAlert() 호출
  │
  ├─ [1] User prefs 로드 (maxAlertsPerDay, cooldown, thresholds)
  │
  ├─ [2] DAILY CAP — 전체 상한 ← 가장 먼저
  │    └─ notification.count(userId, today UTC) >= max → SKIP ALL
  │
  ├─ [3] Condition evaluation (WARNING_SPIKE, LOW_CONFIDENCE, etc.)
  │
  └─ [4] Per-condition loop:
       │
       ├─ [4a] DAILY CAP (mid-eval) — remainingDailyCap <= 0 → break
       │
       ├─ [4b] COOLDOWN — isWithinCooldown(sourceId, cooldownMs)
       │    └─ 동일 sourceId가 cooldown 내 → skip (continue)
       │
       └─ [4c] createAlertNotification()
            └─ 생성 성공 → remainingDailyCap--
```

## 각 guardrail의 독립성

| Guardrail | 범위 | 시점 | 효과 | 다른 guardrail과의 관계 |
|-----------|------|------|------|----------------------|
| Daily cap | userId 전체 | 최초 + 반복 | 전체/나머지 알림 skip | 독립 (cooldown 전에 실행) |
| Cooldown | sourceId별 | 조건별 | 개별 조건 skip | 독립 (daily cap 이후 실행) |
| Enable toggle | 조건 유형별 | 조건 평가 시 | 유형 비활성화 | 독립 |
| Channel prefs | 사용자별 | 생성 시 | 채널 선택 | daily cap/cooldown 이후 |

## 왜 Daily Cap이 Cooldown과 별도로 필요한가

| 시나리오 | Cooldown만 | Daily Cap |
|----------|----------|-----------|
| 키워드 A → B → C → D 순서 분석 | 각각 새 sourceId → cooldown 통과 → 무한 생성 | 총량 제한으로 차단 |
| 같은 키워드 반복 분석 | cooldown이 막음 | 추가 보호 |
| cooldown 만료 후 반복 분석 | 통과 | 총량 제한으로 차단 |

**결론:** Cooldown은 동일 경고 반복을 막고, Daily cap은 전체 총량을 막는다. 둘 다 필요.
