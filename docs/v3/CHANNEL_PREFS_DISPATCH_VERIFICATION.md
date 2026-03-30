# Channel Prefs → Dispatch Verification

> Date: 2026-03-16
> Status: PASS

## 1. 설정 읽기

| 항목 | 상태 | 근거 |
|------|------|------|
| Dispatch 전 user preference 조회 | PASS | `loadUserChannelPrefs(params.userId)` — alert.service.ts:342 |
| DB 쿼리 | PASS | `prisma.userAlertPreference.findUnique({ where: { userId } })` — line 464 |
| 읽는 필드 | PASS | `channelInApp`, `channelEmail`, `channelWebhook`, `webhookUrl` — line 466-470 |
| User scope | PASS | userId 기반 (프로젝트가 아닌 사용자 단위 설정) |
| 설정 실패 시 | PASS | try-catch → 기본값 반환 — line 474-476 |

## 2. 채널 선택 로직

| 조건 | 채널 포함 | 근거 |
|------|----------|------|
| IN_APP | **항상** | `channels: ["IN_APP"]` 초기값 — line 341 |
| `channelEmail=true` + `EMAIL.configured` | EMAIL 포함 | line 347-349 |
| `channelEmail=false` | EMAIL **미포함** | 조건 불충족 → push 안 됨 |
| `channelEmail=true` + EMAIL 미설정 | EMAIL **미포함** | `envChannelStatus.EMAIL.configured` = false |
| `channelWebhook=true` + `WEBHOOK.configured` | WEBHOOK 포함 | line 351-353 |
| `channelWebhook=true` + `userPrefs.webhookUrl` | WEBHOOK 포함 | OR 조건 — 사용자 URL도 허용 |
| `channelWebhook=false` | WEBHOOK **미포함** | 조건 불충족 |

## 3. False 채널 차단

| 항목 | 상태 | 근거 |
|------|------|------|
| channels 배열에 미포함 | PASS | false 채널은 `channels.push()` 안 됨 |
| dispatch에 전달 안 됨 | PASS | `externalChannels = channels.filter(c => c !== "IN_APP")` — line 374 |
| ChannelDispatch가 배열만 순회 | PASS | `for (const channel of input.channels)` — dispatch.service.ts:96 |
| 배열 외 채널 시도 없음 | PASS | 명시적 `input.channels` 순회만 |

## 4. Fallback 정책

| 상황 | 처리 | 근거 |
|------|------|------|
| `userAlertPreference` 미존재 | 기본값 반환 | line 477-482 |
| 기본값 | `channelInApp: true, channelEmail: false, channelWebhook: false` | **IN_APP만** |
| DB 조회 실패 | 기본값 반환 (IN_APP만) | line 474 — catch block |
| `webhookUrl` 미설정 + `channelWebhook=true` | `WEBHOOK.configured` 체크 → env URL 사용 또는 skip | line 351 |

## 5. Notification 레코드의 channels 필드

| 항목 | 상태 | 근거 |
|------|------|------|
| DB에 실제 발송 채널 기록 | PASS | `channels` 배열이 notification.create의 data에 포함 — line 367 |
| 추적 가능 | PASS | notification 레코드에서 어떤 채널로 발송했는지 확인 가능 |
