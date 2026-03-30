# Channel Prefs Runtime Evidence

> Date: 2026-03-16

## 코드 경로 증거

### 1. User Preference 로드
```
createAlertNotification() — line 342
  └─ loadUserChannelPrefs(params.userId)
       └─ prisma.userAlertPreference.findUnique({ where: { userId } })
       └─ 실패 시 기본값: { channelInApp: true, channelEmail: false, channelWebhook: false }
```

### 2. 채널 결정
```
line 341: channels = ["IN_APP"]   ← 항상 포함
line 347: if (userPrefs.channelEmail && envChannelStatus.EMAIL.configured) channels.push("EMAIL")
line 351: if (userPrefs.channelWebhook && (envChannelStatus.WEBHOOK.configured || userPrefs.webhookUrl)) channels.push("WEBHOOK")
```

### 3. Dispatch 전달
```
line 374: externalChannels = channels.filter(c => c !== "IN_APP")
line 394: dispatcher.dispatch({ channels: externalChannels })
```

### 4. Dispatcher 실행
```
channel-dispatch.service.ts:96: for (const channel of input.channels) {
  └─ deliverToChannel(channel, input)  ← 전달된 채널만 실행
}
```

## 시나리오별 결과

### 시나리오 A: 기본값 (설정 없는 사용자)
```
userPrefs = { channelInApp: true, channelEmail: false, channelWebhook: false }
channels = ["IN_APP"]
externalChannels = []
dispatch 호출 안 됨 (channels.length === 1)
결과: IN_APP만 (DB 저장)
```

### 시나리오 B: 이메일만 켠 사용자
```
userPrefs = { channelEmail: true, channelWebhook: false }
envChannelStatus.EMAIL.configured = true (NOTIFICATION_EMAIL_API_KEY 있음)
channels = ["IN_APP", "EMAIL"]
externalChannels = ["EMAIL"]
dispatch({ channels: ["EMAIL"] })
결과: IN_APP + EMAIL
```

### 시나리오 C: 웹훅만 켠 사용자
```
userPrefs = { channelEmail: false, channelWebhook: true, webhookUrl: "https://..." }
channels = ["IN_APP", "WEBHOOK"]
externalChannels = ["WEBHOOK"]
dispatch({ channels: ["WEBHOOK"] })
결과: IN_APP + WEBHOOK
```

### 시나리오 D: 이메일 켰지만 API key 없음
```
userPrefs = { channelEmail: true }
envChannelStatus.EMAIL.configured = false (NOTIFICATION_EMAIL_API_KEY 없음)
channels = ["IN_APP"]  ← EMAIL 추가 안 됨
결과: IN_APP만 (email 시도 없음)
```

### 시나리오 E: 전체 채널 켬
```
userPrefs = { channelEmail: true, channelWebhook: true }
envChannelStatus = { EMAIL: { configured: true }, WEBHOOK: { configured: true } }
channels = ["IN_APP", "EMAIL", "WEBHOOK"]
externalChannels = ["EMAIL", "WEBHOOK"]
dispatch({ channels: ["EMAIL", "WEBHOOK"] })
결과: IN_APP + EMAIL + WEBHOOK
```
