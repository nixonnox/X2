# Alert Policy Fallback Rules

> Date: 2026-03-16

## DEFAULT_PREFS (하드코딩 기본값)

```typescript
const DEFAULT_PREFS = {
  enableWarningSpike: true,
  enableLowConfidence: true,
  enableBenchmarkDecline: true,
  enableProviderCoverage: true,
  warningSpike_minCount: 3,
  lowConfidence_threshold: 0.4,
  benchmarkDecline_threshold: 15,
  globalCooldownMinutes: 60,
  maxAlertsPerDay: 20,
  channelEmail: false,
  channelWebhook: false,
  webhookUrl: null,
};
```

## DEFAULT_TYPE_COOLDOWNS (타입별 최소 쿨다운)

| Alert Type | 최소 Cooldown | 용도 |
|-----------|--------------|------|
| WARNING_SPIKE | 1시간 | 경고 급증은 자주 올 수 있으므로 짧게 |
| LOW_CONFIDENCE | 24시간 | 같은 키워드의 신뢰도는 단기간에 안 변함 |
| BENCHMARK_DECLINE | 24시간 | 벤치마크도 단기 변동 적음 |
| PROVIDER_COVERAGE_LOW | 6시간 | provider 상태는 중간 빈도 변화 |

**이 값들은 사용자가 globalCooldownMinutes를 아무리 낮춰도 보장되는 최소값입니다.**

## Fallback 발동 조건

| 조건 | fallback |
|------|----------|
| UserAlertPreference 레코드 없음 | DEFAULT_PREFS 전체 사용 |
| DB 쿼리 실패 | DEFAULT_PREFS 전체 사용 (prefsSource="default") |
| project-specific 없음 | global fallback → 없으면 DEFAULT_PREFS |
| 특정 필드가 null | Prisma 기본값 (@default) 적용 |
