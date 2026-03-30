# Bell Notification Runtime Spec

> Date: 2026-03-16
> Status: VERIFIED

## tRPC Endpoints

### notification.unreadCount (Query)
- **Input:** 없음 (userId는 ctx에서)
- **Output:** `{ count: number }`
- **DB:** `SELECT COUNT(*) FROM notifications WHERE userId=? AND isRead=false`
- **폴링:** 30초
- **소비자:** Bell 뱃지, Dashboard 카드, /notifications 페이지

### notification.list (Query)
- **Input:** `{ page, pageSize, unreadOnly?, priority?, sourceType?, since?, search? }`
- **Output:** `{ items[], total, unreadCount, page, pageSize, totalPages }`
- **DB:** `SELECT * FROM notifications WHERE userId=? [filters] ORDER BY createdAt DESC`
- **활성화:** Bell 드롭다운 열릴 때만 (`enabled: bellOpen`)

### notification.markRead (Mutation)
- **Input:** `{ id: string }`
- **동작:** `UPDATE notifications SET isRead=true, readAt=NOW() WHERE id=? AND userId=?`
- **onSuccess:** `unreadCount.refetch()` + `list.refetch()`

### notification.markAllRead (Mutation)
- **Input:** 없음
- **동작:** `UPDATE notifications SET isRead=true, readAt=NOW() WHERE userId=? AND isRead=false`
- **onSuccess:** `unreadCount.refetch()` + `list.refetch()`

## 상태 처리

| 상태 | 조건 | UI |
|------|------|-----|
| Loading | `notificationsQuery.isLoading` | 스피너 + "알림을 불러오는 중이에요" |
| Error | `notificationsQuery.isError` | AlertTriangle + "알림을 불러오지 못했어요" + "다시 시도" |
| Empty | items.length === 0 | Bell 아이콘 + "새로운 알림이 없어요" |
| Items | items.length > 0 | 알림 목록 (최대 10개) |

## 뱃지 로직

```
unreadCount === 0  → 뱃지 숨김
1 ≤ count ≤ 9      → 숫자 표시
count > 9          → "9+" 표시
```

## 알림 항목 표시

| 필드 | 표시 |
|------|------|
| title | 제목 ("Intelligence Alert: " 접두어 제거) |
| message | 본문 (최대 2줄) |
| priority | HIGH/URGENT → 뱃지 (중요/긴급) |
| sourceType | intelligence_alert → "Intelligence" 뱃지 |
| createdAt | 상대 시간 (방금 전, N분 전, N시간 전, N일 전, M월 D일) |
| isRead | false → 파란 점 + 배경 하이라이트 |
| actionUrl | 클릭 시 해당 URL로 이동 |
