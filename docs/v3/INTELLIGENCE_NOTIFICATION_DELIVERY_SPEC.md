# Intelligence Notification Delivery Specification

> Describes how intelligence alert notifications are stored, queried, displayed, and the planned future delivery channels.

---

## 1. Delivery Channel

| Channel   | Status          | Notes                                    |
|-----------|-----------------|------------------------------------------|
| `IN_APP`  | Implemented     | Stored in `Notification` table           |
| `EMAIL`   | TODO            | `emailSentAt` field exists but unused     |
| `WEBHOOK` | TODO            | Not yet designed                         |

Currently, all intelligence alerts are delivered exclusively via the **IN_APP** channel. The `channels` field is stored as `["IN_APP"]` on every notification created by `IntelligenceAlertService`.

---

## 2. Notification Data Model

**Prisma model:** `Notification` (defined in `packages/db/prisma/schema.prisma`)

```prisma
model Notification {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  workspaceId String?

  type     NotificationType
  title    String
  message  String
  priority NotificationPriority @default(NORMAL)

  sourceType String?
  sourceId   String?
  actionUrl  String?

  isRead Boolean   @default(false)
  readAt DateTime?

  channels    String[]
  emailSentAt DateTime?

  createdAt DateTime @default(now())

  @@index([userId, isRead])
  @@index([userId, createdAt(sort: Desc)])
  @@index([workspaceId, createdAt(sort: Desc)])
}
```

### Intelligence Alert Field Values

| Field          | Value                                                        | Example                                    |
|----------------|--------------------------------------------------------------|--------------------------------------------|
| `id`           | 24-char hex string (`randomBytes(12)`)                       | `a1b2c3d4e5f6a7b8c9d0e1f2`               |
| `userId`       | The user who triggered the analysis                          | `clu1234abcdef`                            |
| `type`         | `SYSTEM_ALERT`                                               | —                                          |
| `title`        | `"Intelligence Alert: {ALERT_TYPE}"`                         | `"Intelligence Alert: WARNING_SPIKE"`      |
| `message`      | Korean-language description of the alert                     | `"'스킨케어' 분석에서 경고가 5개로 증가했습니다"` |
| `priority`     | `HIGH` or `NORMAL` (mapped from alert severity)              | `HIGH`                                     |
| `sourceType`   | `"intelligence_alert"`                                       | —                                          |
| `sourceId`     | `"{alertType}:{keyword}"`                                    | `"WARNING_SPIKE:스킨케어"`                 |
| `actionUrl`    | `/intelligence?keyword={encoded_keyword}`                    | `/intelligence?keyword=%EC%8A%A4%ED%82%A8%EC%BC%80%EC%96%B4` |
| `channels`     | `["IN_APP"]`                                                 | —                                          |
| `isRead`       | `false` (initial)                                            | —                                          |

### Priority Mapping

| Alert Severity | Notification Priority |
|----------------|-----------------------|
| `HIGH`         | `HIGH`                |
| `NORMAL`       | `NORMAL`              |

---

## 3. tRPC Notification Endpoints

**Router file:** `packages/api/src/routers/notification.ts`

All endpoints are `protectedProcedure` (require authentication).

### 3.1 `notification.list`

Paginated query for the current user's notifications.

| Parameter   | Type      | Default | Description                    |
|-------------|-----------|---------|--------------------------------|
| `page`      | `number`  | `1`     | Page number (1-indexed)        |
| `pageSize`  | `number`  | `20`    | Items per page (max 50)        |
| `unreadOnly`| `boolean` | `false` | Filter to unread only          |

**Returns:**

```ts
{
  items: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}
```

### 3.2 `notification.markRead`

Marks a single notification as read.

| Parameter | Type     | Description            |
|-----------|----------|------------------------|
| `id`      | `string` | Notification ID        |

Sets `isRead = true` and `readAt = new Date()`. Uses `updateMany` with `userId` guard to prevent cross-user updates.

### 3.3 `notification.markAllRead`

Marks all unread notifications for the current user as read.

No input parameters. Updates all notifications where `userId = ctx.userId AND isRead = false`.

### 3.4 `notification.unreadCount`

Returns the count of unread notifications for the current user.

```ts
// Returns: number
return ctx.db.notification.count({
  where: { userId: ctx.userId, isRead: false },
});
```

---

## 4. Client-Side Integration

### 4.1 Top-Bar Bell Icon

A placeholder bell icon exists in the application's top navigation bar. Currently, it does **not** render a dropdown or popover with notification content. The implementation is limited to:

- Displaying the bell icon
- No badge count
- No dropdown panel

### 4.2 Polling Strategy

There is no WebSocket or Server-Sent Events implementation. Client-side notification freshness is achieved via tRPC's `refetchInterval` option:

```ts
// Example usage pattern (not yet fully implemented):
trpc.notification.unreadCount.useQuery(undefined, {
  refetchInterval: 30_000,  // poll every 30 seconds
});
```

### 4.3 Action URL Navigation

When a user clicks a notification, the `actionUrl` field directs them to the Intelligence Hub with the relevant keyword pre-selected:

```
/intelligence?keyword={encoded_keyword}
```

The Intelligence Hub page reads the `keyword` query parameter and auto-loads the analysis for that keyword.

---

## 5. Notification Lifecycle

```
Analysis completes
  |
  v
IntelligenceAlertService.evaluateAndAlert()
  |
  v
Condition met? ──No──> Skip
  |
  Yes
  v
Within cooldown? ──Yes──> Skip
  |
  No
  v
prisma.notification.create({
  type: "SYSTEM_ALERT",
  channels: ["IN_APP"],
  isRead: false,
  ...
})
  |
  v
User opens notification list
  (notification.list query)
  |
  v
User clicks notification
  → Navigate to actionUrl
  → notification.markRead({ id })
```

---

## 6. Database Indexes

The `Notification` model has three indexes relevant to query performance:

| Index                                       | Purpose                                          |
|---------------------------------------------|--------------------------------------------------|
| `@@index([userId, isRead])`                 | Fast unread count and unread-only filtering       |
| `@@index([userId, createdAt(sort: Desc)])`  | Paginated list ordered by creation time           |
| `@@index([workspaceId, createdAt(sort: Desc)])` | Future workspace-level notification queries   |

The cooldown check in `IntelligenceAlertService` queries by `sourceType + sourceId + createdAt`, which is **not** covered by a dedicated index. For high-volume scenarios, a composite index on `(sourceType, sourceId, createdAt)` would improve performance.

---

## 7. Message Templates

Each alert type produces a specific Korean-language message:

| Alert Type              | Message Template                                                            |
|-------------------------|-----------------------------------------------------------------------------|
| `WARNING_SPIKE`         | `'{keyword}' 분석에서 경고가 {count}개로 증가했습니다`                       |
| `LOW_CONFIDENCE`        | `'{keyword}' 분석 신뢰도가 낮습니다 ({confidence})`                         |
| `BENCHMARK_DECLINE`     | `'{keyword}' 벤치마크 점수가 {prevScore}에서 {currentScore}로 하락했습니다`  |
| `PROVIDER_COVERAGE_LOW` | `소셜 provider 연결이 부분적입니다. 데이터 정확도가 낮을 수 있습니다.`        |

The title follows the pattern: `"Intelligence Alert: {ALERT_TYPE}"` (English).

---

## 8. Future Channel: EMAIL

The `Notification` model includes an `emailSentAt` field (nullable `DateTime`), indicating that email delivery was considered in the schema design. Implementation would require:

1. An email service integration (e.g., Resend, SendGrid, AWS SES)
2. User email preferences / opt-in settings
3. Email template rendering
4. Setting `emailSentAt` after successful send
5. Adding `"EMAIL"` to the `channels` array

---

## 9. Future Channel: WEBHOOK

Not yet designed. Would require:

1. A `WebhookEndpoint` model to store user-configured URLs
2. Retry logic with exponential backoff
3. Payload schema definition
4. Signature verification for security

---

## 10. Known Gaps

| Gap                          | Description                                                                 |
|------------------------------|-----------------------------------------------------------------------------|
| Bell dropdown UI             | Top-bar bell icon is a placeholder; no dropdown to show notifications       |
| Email delivery               | `emailSentAt` field exists but no email sending logic                       |
| Webhook delivery             | Not designed                                                                |
| Real-time updates            | No WebSocket/SSE; relies on polling via `refetchInterval`                   |
| Notification preferences     | No user-configurable alert thresholds or channel preferences                |
| Notification grouping        | Multiple alerts for the same keyword are not grouped/collapsed              |
| Cooldown index               | No dedicated index on `(sourceType, sourceId, createdAt)` for cooldown queries |
