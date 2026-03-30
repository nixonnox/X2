# Verify: Alert Preference Change Trace

> Date: 2026-03-16

## 추적 가능 항목

| 질문 | 추적 가능 | 소스 |
|------|----------|------|
| 누가 바꿨나? | ✓ | `notification.userId` (= ctx.userId) |
| 언제 바꿨나? | ✓ | `notification.createdAt` + console log `changedAt` |
| 뭘 바꿨나? | ✓ | `notification.message` — "key: old → new" 형식 |
| 이전값이 뭐였나? | ✓ | message에서 → 앞부분 파싱 |
| 새값이 뭐였나? | ✓ | message에서 → 뒷부분 파싱 |
| 어떤 프로젝트? | ✓ | `notification.sourceId` = "global" 또는 projectId |
| 신규 설정인가? | ✓ | message = "신규 설정 생성" 또는 console log `isNew: true` |
| 변경 없이 저장? | 기록 안 됨 | `changes.length === 0` → skip (의도적) |

## 운영 활용 시나리오

### "왜 알림이 안 오지?"
```sql
SELECT message, "createdAt" FROM notifications
WHERE "userId" = 'usr-001' AND "sourceType" = 'pref_audit'
ORDER BY "createdAt" DESC LIMIT 5;
-- → "channelEmail: true → false" (3시간 전) ← 여기서 꺼짐
```

### "maxAlertsPerDay를 누가 바꿨지?"
```sql
SELECT "userId", message, "createdAt" FROM notifications
WHERE "sourceType" = 'pref_audit' AND message LIKE '%maxAlertsPerDay%'
ORDER BY "createdAt" DESC;
```
