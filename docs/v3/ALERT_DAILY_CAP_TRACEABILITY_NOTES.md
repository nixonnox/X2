# Alert Daily Cap Traceability Notes

> Date: 2026-03-16

## 운영자가 추적할 수 있는 경로

### 1. Daily Cap 도달
```
[IntelligenceAlert] Daily cap reached for user usr-001: 20/20 — skipping all alerts
```
→ 이 로그가 나오면 해당 사용자의 당일 알림이 한도에 도달한 것

### 2. Count 쿼리 실패 (보수적 차단)
```
[IntelligenceAlert] Daily cap count query failed for user usr-001 — applying conservative cap
[IntelligenceAlert] Daily cap reached for user usr-001: 20/20 (conservative — count query failed) — skipping all alerts
```
→ DB 문제로 count를 못 했고, 안전을 위해 전체 차단한 것

### 3. Mid-evaluation Cap
```
[IntelligenceAlert] Daily cap reached mid-evaluation — skipping remaining conditions
```
→ 조건을 평가하는 중에 남은 한도가 0이 된 것

### 4. Cooldown Skip (Daily cap과 별도)
```
[IntelligenceAlert] Skipped WARNING_SPIKE for "스킨케어" — cooldown active (60min)
```
→ Daily cap이 아닌 cooldown에 의한 skip

### 5. API Response
```json
{
  "metadata": {
    "alertsTriggered": [],
    "dailyCapped": true
  }
}
```
→ 프론트엔드에서도 cap 상태 확인 가능

## Bell/Notification 영향 추적

| 상황 | Bell unreadCount | Notification 목록 |
|------|-----------------|-------------------|
| cap 미도달 | 알림 수만큼 +N | N건 추가 |
| cap 도달 | 변화 없음 | 변화 없음 |
| cap 이후 분석 | 변화 없음 | 변화 없음 |
| 다음 날 | 리셋 (UTC 기준) | 새 알림 생성 가능 |

## 설정 변경 가능 경로

1. `/settings/notifications` 페이지 → "하루 최대 알림 수" 필드
2. `notification.savePreferences` tRPC mutation
3. DB: `user_alert_preferences.maxAlertsPerDay` (기본 20, 범위 1~100)
