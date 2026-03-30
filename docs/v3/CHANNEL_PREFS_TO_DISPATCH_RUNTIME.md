# Channel Prefs → Dispatch Runtime

> Date: 2026-03-16
> Status: IMPLEMENTED + Trace 로그 추가

## Preference 조회 경로

```
createAlertNotification(params)
  └─ loadUserChannelPrefs(params.userId)
       └─ prisma.userAlertPreference.findUnique({ where: { userId } })
       └─ select: channelInApp, channelEmail, channelWebhook, webhookUrl
       └─ 실패 시 기본값 반환
```

## 채널 결정 로직

```typescript
const channels: DeliveryChannel[] = ["IN_APP"];  // 항상 포함

// EMAIL: 사용자 설정 ON + 환경 설정 가능
if (userPrefs.channelEmail && envChannelStatus.EMAIL.configured) {
  channels.push("EMAIL");
}

// WEBHOOK: 사용자 설정 ON + (환경 설정 가능 OR 사용자 URL 있음)
if (userPrefs.channelWebhook && (envChannelStatus.WEBHOOK.configured || userPrefs.webhookUrl)) {
  channels.push("WEBHOOK");
}
```

## Dispatch 전달

```typescript
// channels 배열이 dispatch 대상을 완전히 결정
const externalChannels = channels.filter((c) => c !== "IN_APP");
dispatcher.dispatch({ channels: externalChannels });
// → externalChannels에 없는 채널은 절대 시도 안 됨
```

## Trace 로그 (이번 추가)

```json
[ChannelDecision] {
  "notificationId": "abc123",
  "userId": "usr-001",
  "resolvedChannels": ["IN_APP", "EMAIL"],
  "userPrefs": { "email": true, "webhook": false, "webhookUrl": false },
  "envStatus": { "emailConfigured": true, "webhookConfigured": false },
  "skippedChannels": ["WEBHOOK(user:false,env:false)"]
}
```

→ 왜 EMAIL은 포함되고 WEBHOOK은 제외됐는지 **한 줄**로 추적 가능
