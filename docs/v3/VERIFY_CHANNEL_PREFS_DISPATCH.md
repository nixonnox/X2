# Verify: Channel Prefs → Dispatch

> Date: 2026-03-16
> Status: PASS (정적 + 동적)

## 정적 검증

| 항목 | 상태 | 근거 |
|------|------|------|
| Dispatch 전 preference 조회 | PASS | `loadUserChannelPrefs(params.userId)` — line 348 |
| DB 쿼리 | PASS | `prisma.userAlertPreference.findUnique` — line 464 |
| EMAIL 분기 | PASS | `userPrefs.channelEmail && envChannelStatus.EMAIL.configured` — line 353 |
| WEBHOOK 분기 | PASS | `userPrefs.channelWebhook && (env \|\| webhookUrl)` — line 357 |
| IN_APP 항상 | PASS | `channels = ["IN_APP"]` 초기값 — line 347 |
| False 채널 미포함 | PASS | 조건 불충족 시 `push` 안 됨 |
| Dispatch에 전달 | PASS | `dispatcher.dispatch({ channels: externalChannels })` — line 409 |
| Trace 로그 | PASS | `[ChannelDecision]` JSON 로그 — line 362-379 |
| Fallback | PASS | 설정 미존재 → `{ email: false, webhook: false }` — line 477-482 |

## 동적 검증 (DB 시뮬레이션)

| 시나리오 | email | webhook | 기대 channels | DB 결과 | 판정 |
|----------|-------|---------|--------------|---------|------|
| A: email ON, webhook OFF | true | false | [IN_APP, EMAIL] | EMAIL=t, WEBHOOK=f | PASS |
| B: 둘 다 OFF | false | false | [IN_APP] | EMAIL=f, WEBHOOK=f | PASS |
| C: 설정 없음 (fallback) | — | — | [IN_APP] (default) | pref_exists=0 | PASS |
