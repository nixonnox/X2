# Verify: P1 Webhook Test Runtime

> Date: 2026-03-16
> Status: PASS (endpoint 존재, UI 버튼은 S3)

## Backend

| 항목 | 상태 | 근거 |
|------|------|------|
| `testWebhook` tRPC endpoint | PASS | notification.ts:326 — mutation |
| Input validation | PASS | `z.string().url()` |
| Test POST 실행 | PASS | `fetch(webhookUrl, { method: "POST" })` |
| Timeout | PASS | 10초 AbortController |
| HMAC 서명 | PASS | env secret 있으면 포함 |
| 9가지 에러 분류 | PASS | auth/404/5xx/timeout/dns/refused/http/network + 성공 |

## 저장 시 자동 테스트

| 항목 | 상태 | 근거 |
|------|------|------|
| `savePreferences` 내 자동 test | PASS | channelWebhook=true + webhookUrl → 5초 test POST |
| 실패해도 저장 | PASS | warning 추가, DB upsert 항상 실행 |
| `webhookTestResult` 반환 | PASS | `{ success, message }` |

## UI 버튼

| 항목 | 상태 |
|------|------|
| Settings 페이지 "테스트" 버튼 | **미연결** (S3) — endpoint 존재, UI 호출 미구현 |
