# Alert Daily Cap Runtime Evidence

> Date: 2026-03-16

## 코드 경로 증거

### 진입점
- `intelligence.ts:312-313` — `alertService.evaluateAndAlert(params)`
- 유일한 intelligence alert 생성 경로

### Daily Cap 체크 (전체)
- `intelligence-alert.service.ts:137-158`
- `notification.count({ userId, sourceType: "intelligence_alert", createdAt: { gte: todayStart } })`
- `dailyAlertCount >= prefs.maxAlertsPerDay` → `return { alertsTriggered: [], dailyCapped: true }`

### Daily Cap 체크 (반복문 내)
- `intelligence-alert.service.ts:169-179`
- `remainingDailyCap = prefs.maxAlertsPerDay - dailyAlertCount`
- `if (remainingDailyCap <= 0) break`
- `remainingDailyCap--` after each createAlertNotification

### Cooldown 체크 (독립)
- `intelligence-alert.service.ts:186-199`
- `isWithinCooldown(sourceId, cooldownMs)` — sourceId별 시간 기반
- Daily cap과 별도: cooldown은 조건별, daily cap은 전체

### 반환값
- `{ alertsTriggered: string[], dailyCapped: boolean }`
- `analyze` route에서 `metadata.alertsTriggered`로 전달

## Bell/Notification 영향

| 항목 | 영향 |
|------|------|
| unreadCount | SAFE — daily cap으로 알림 생성 자체가 차단되므로 unreadCount 급증 없음 |
| notification list | SAFE — 생성되지 않은 알림은 목록에 나타나지 않음 |
| Bell 뱃지 | SAFE — cap에 의해 최대 maxAlertsPerDay 건만 생성 |
| External delivery | SAFE — 알림 미생성 → dispatch도 실행되지 않음 |

## Cooldown과의 차이

| 기준 | Daily Cap | Cooldown |
|------|----------|----------|
| 범위 | userId + 전체 intelligence_alert | sourceId (projectId:type:keyword) |
| 시간 | 오늘 0시~현재 | cooldownMs 이내 |
| 효과 | 전체 알림 생성 차단 | 동일 경고만 skip |
| 초과 시 | break + dailyCapped=true | continue (다른 조건은 평가) |
