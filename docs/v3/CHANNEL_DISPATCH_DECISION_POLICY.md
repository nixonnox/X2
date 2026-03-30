# Channel Dispatch Decision Policy

> Date: 2026-03-16

## 결정 매트릭스

| 채널 | User pref | Env config | 결과 |
|------|----------|-----------|------|
| IN_APP | — | — | **항상 포함** |
| EMAIL | true | configured | 포함 |
| EMAIL | true | 미설정 | **제외** |
| EMAIL | false | configured | **제외** |
| EMAIL | false | 미설정 | **제외** |
| WEBHOOK | true | configured | 포함 |
| WEBHOOK | true | user URL 있음 | 포함 |
| WEBHOOK | true | 둘 다 없음 | **제외** |
| WEBHOOK | false | 어떤 경우든 | **제외** |

## 규칙 요약

1. **IN_APP** — 무조건. DB 저장이므로 설정 불필요
2. **EMAIL** — `userPrefs.channelEmail === true` AND `NOTIFICATION_EMAIL_API_KEY` 환경변수 있음
3. **WEBHOOK** — `userPrefs.channelWebhook === true` AND (`NOTIFICATION_WEBHOOK_URL` 있음 OR `userPrefs.webhookUrl` 있음)

## Guardrail 실행 순서 내 위치

```
[1] Daily cap → [2] Cooldown → [3] Channel decision → [4] Dispatch → [5] Retry
                                    ↑ 여기
```

Channel decision은 알림 생성(notification.create) 직전에 결정되어 `channels` 배열에 기록됩니다.
