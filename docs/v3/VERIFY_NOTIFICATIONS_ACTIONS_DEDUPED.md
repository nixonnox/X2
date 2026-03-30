# Verify: Notifications Actions (Deduped)

> Date: 2026-03-16

## 구현된 Actions

| Action | 구현 | Persistence |
|--------|------|-------------|
| 개별 읽음 (markRead) | DONE | DB isRead=true, readAt |
| 전체 읽음 (markAllRead) | DONE | DB bulk update |
| 클릭 → navigate | DONE | markRead + router.push(actionUrl) |

## 미구현 Actions (S3)

| Action | 상태 | 필요한 것 |
|--------|------|----------|
| Dismiss | 미착수 | isDismissed 필드 + schema migration |
| Snooze | 미착수 | snoozedUntil 필드 + UI |

## Real-time

| 방식 | 상태 |
|------|------|
| 30초 polling | DONE — `refetchInterval: 30000` |
| mutation invalidate | DONE — markRead/markAllRead onSuccess |
| WebSocket | 미착수 S3 |
| Browser notification | 미착수 S3 |
