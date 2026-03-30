# Channel Prefs → Dispatch Spec

> Date: 2026-03-16
> Status: IMPLEMENTED (이번 세션)

## 이전 상태 (문제)

```
채널 결정 = dispatcher.getChannelStatus() (환경변수만)
→ 사용자가 이메일을 꺼도 env에 API key 있으면 발송됨
```

## 현재 상태 (수정됨)

```
채널 결정 = loadUserChannelPrefs(userId) + dispatcher.getChannelStatus()
→ 사용자 설정 ON + 환경 설정 가능 = 양쪽 모두 충족 시만 발송
```

## 결정 매트릭스

| 사용자 pref | 환경 config | 결과 |
|------------|------------|------|
| channelEmail=true | EMAIL_API_KEY 있음 | ✓ EMAIL 발송 |
| channelEmail=true | EMAIL_API_KEY 없음 | ✗ skip |
| channelEmail=false | EMAIL_API_KEY 있음 | ✗ skip |
| channelWebhook=true | WEBHOOK_URL 있음 | ✓ WEBHOOK 발송 |
| channelWebhook=true | user webhookUrl 있음 | ✓ WEBHOOK 발송 |
| channelWebhook=false | 어떤 경우든 | ✗ skip |
| channelInApp | — | ✓ 항상 (DB 저장) |

## 기본 fallback 정책

설정이 없는 사용자 (`userAlertPreference` 미존재):
- channelInApp: true (항상)
- channelEmail: false
- channelWebhook: false
- webhookUrl: null

→ **기본값은 IN_APP만 발송** (안전한 기본값)

## 구현 코드

`intelligence-alert.service.ts` — `createAlertNotification()` 내부:
```typescript
const userPrefs = await this.loadUserChannelPrefs(params.userId);
if (userPrefs.channelEmail && envChannelStatus.EMAIL.configured) channels.push("EMAIL");
if (userPrefs.channelWebhook && (envChannelStatus.WEBHOOK.configured || userPrefs.webhookUrl)) channels.push("WEBHOOK");
```
