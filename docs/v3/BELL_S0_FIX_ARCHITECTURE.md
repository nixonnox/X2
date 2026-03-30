# Bell S0 Fix Architecture

> Date: 2026-03-16
> Status: VERIFIED — All connections live

## 1. Source of Truth

### 단일 소스: `notification.unreadCount`

```
                    ┌─────────────────┐
                    │  Notification    │
                    │  Table (DB)      │
                    │  WHERE isRead=F  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ notification.    │
                    │ unreadCount      │
                    │ (tRPC query)     │
                    │ polling: 30s     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Bell     │  │ Dashboard│  │ /notif-  │
        │ Badge    │  │ Alert    │  │ ications │
        │ (top-bar)│  │ Count    │  │ Page     │
        └──────────┘  └──────────┘  └──────────┘
```

### 검증 결과

| 소비자 | 쿼리 | 폴링 | 동기화 |
|--------|------|------|--------|
| Bell 뱃지 | `trpc.notification.unreadCount` | 30초 | mutation invalidate |
| Dashboard 카드 | `trpc.notification.unreadCount` (동일) | 30초 | mutation invalidate |
| /notifications 페이지 | `trpc.notification.unreadCount` (동일) | — | mutation invalidate |

**Signal hint 문자열 카운트는 main path에 없음.** Dashboard는 `notification.unreadCount`를 직접 사용.

## 2. Dropdown Runtime Flow

```
1. 페이지 로드
   → notification.unreadCount 시작 (30초 폴링)
   → Bell 뱃지 표시

2. Bell 클릭
   → bellOpen = true
   → notification.list({ page:1, pageSize:10 }) 호출
   → 드롭다운 렌더링 (loading → items)

3. 알림 항목 클릭
   → markRead({ id }) 호출
   → onSuccess → unreadCount.refetch() + list.refetch()
   → router.push(actionUrl) → 관련 화면 이동
   → bellOpen = false

4. "모두 읽음" 클릭
   → markAllRead() 호출
   → onSuccess → unreadCount.refetch() + list.refetch()

5. "알림 전체 보기" 클릭
   → router.push("/notifications")
   → bellOpen = false
```

## 3. Dashboard 연동

Dashboard의 `IntelligenceSummaryCard`:
- `unreadAlertCount` = `notification.unreadCount` (line 485-489)
- Bell과 **동일한 query key** 사용
- mutation invalidate 시 Bell과 Dashboard **동시 갱신**

### 표시 로직
- `unreadAlertCount > 0` → "읽지 않은 알림 N건" (amber)
- `unreadAlertCount === 0` → "새 알림이 없어요" (emerald)

## 4. Deep Link 구조

Alert 생성 시 `actionUrl` 설정:
```typescript
const actionUrl = `/intelligence?keyword=${encodeURIComponent(params.keyword)}`;
```

- sourceId 형식: `${projectId}:${alertType}:${keyword}`
- actionUrl: `/intelligence?keyword=...`
- 알림 클릭 → `router.push(actionUrl)` → Intelligence 화면으로 이동
