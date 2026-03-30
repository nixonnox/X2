# Verify: Alert Daily Cap Evidence

> Date: 2026-03-16

## DB 시뮬레이션 전체 결과

### 테스트 설정
- userId: `cap-user`
- maxAlertsPerDay: **5**
- sourceType filter: `"intelligence_alert"`
- 시간 기준: UTC 당일

### 시나리오 1: 4/5 — 아직 여유
```sql
SELECT COUNT(*) FROM notifications
WHERE userId='cap-user' AND sourceType='intelligence_alert' AND createdAt >= today_utc;
-- → 4
-- evaluateAndAlert: 4 < 5 → 조건 평가 진행
```

### 시나리오 2: 5/5 — cap 도달
```sql
INSERT notification #5;
SELECT COUNT(*) → 5
-- evaluateAndAlert: 5 >= 5 → dailyCapped: true → 전체 skip
```

### 시나리오 3: cap 판정 확인
```sql
SELECT CASE WHEN count >= 5 THEN 'YES — dailyCapped: true' ELSE 'NO' END
-- → 'YES — dailyCapped: true'
```

### 시나리오 4: 비-intelligence 독립
```sql
INSERT notification sourceType='system';
SELECT COUNT(*) WHERE sourceType='intelligence_alert'
-- → 5 (system notif는 무관)
```

## 코드 경로 증거

### evaluateAndAlert 반환값
```typescript
// cap 도달 시
return { alertsTriggered: [], dailyCapped: true };
// → analyze response: metadata.alertsTriggered = [], metadata.dailyCapped = true
```

### 로그 출력
```
[IntelligenceAlert] Daily cap reached for user cap-user: 5/5 — skipping all alerts
```

### 보수적 처리 (count 실패 시)
```
[IntelligenceAlert] Daily cap count query failed for user cap-user — applying conservative cap
[IntelligenceAlert] Daily cap reached for user cap-user: 5/5 (conservative — count query failed) — skipping all alerts
```
