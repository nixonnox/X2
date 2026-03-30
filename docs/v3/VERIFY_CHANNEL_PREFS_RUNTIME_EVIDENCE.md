# Verify: Channel Prefs Runtime Evidence

> Date: 2026-03-16

## Trace 로그 예시

### Scenario A: email ON, webhook OFF
```json
[ChannelDecision] {
  "notificationId": "abc123",
  "userId": "ch-user",
  "resolvedChannels": ["IN_APP", "EMAIL"],
  "userPrefs": { "email": true, "webhook": false, "webhookUrl": false },
  "envStatus": { "emailConfigured": true, "webhookConfigured": false },
  "skippedChannels": ["WEBHOOK(user:false,env:false)"]
}
```

### Scenario B: 둘 다 OFF
```json
[ChannelDecision] {
  "resolvedChannels": ["IN_APP"],
  "skippedChannels": ["EMAIL(user:false,env:true)", "WEBHOOK(user:false,env:false)"]
}
```
→ channels.length === 1 → dispatch 호출 안 됨 (line 389)

### Scenario C: 설정 없음
```
loadUserChannelPrefs → findUnique → null → default { email: false, webhook: false }
→ resolvedChannels: ["IN_APP"]
```

## False 채널 차단 증거 경로

```
1. loadUserChannelPrefs → channelEmail: false
2. if (false && ...) → 조건 불충족 → push 안 됨
3. channels = ["IN_APP"] (EMAIL 없음)
4. externalChannels = channels.filter(c => c !== "IN_APP") → []
5. channels.length === 1 → if 블록 진입 안 함 → dispatch 호출 없음
```
