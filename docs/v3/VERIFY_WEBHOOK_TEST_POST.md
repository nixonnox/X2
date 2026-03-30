# Verify: Webhook Test POST

> Date: 2026-03-16
> Status: PASS

## 1. 저장 시 Test POST 실행

| 항목 | 상태 | 근거 |
|------|------|------|
| 자동 테스트 조건 | PASS | `channelWebhook=true && webhookUrl` — line 153 |
| POST 요청 | PASS | `fetch(webhookUrl, { method: "POST" })` — line 157 |
| Payload | PASS | `{ event: "save_test", timestamp }` — 최소, 민감 정보 없음 |
| Timeout | PASS | 5초 AbortController — line 155-156 |
| 실패해도 저장 | PASS | 테스트는 warning만, DB upsert는 항상 실행 — line 177+ |
| 반환값에 결과 포함 | PASS | `webhookTestResult: { success, message }` — line 212 |

## 2. 명시적 테스트 (`testWebhook` endpoint)

| 항목 | 상태 | 근거 |
|------|------|------|
| tRPC endpoint | PASS | `notification.testWebhook` mutation — line 216 |
| Input validation | PASS | `z.string().url()` — line 219 |
| Timeout | PASS | 10초 — line 248 |
| Payload | PASS | `{ event: "test", timestamp, message }` — 민감 정보 없음 |
| HMAC 서명 | PASS | env secret 있으면 `X-Webhook-Signature` 포함 — line 236-244 |

## 3. 에러 분류

| 상태 | errorType | 메시지 | 검증 |
|------|-----------|--------|------|
| 200-299 | — | 연결에 성공했어요! | PASS — line 259-264 |
| 401/403 | auth_error | 인증 문제가 있어요 | PASS — line 268-274 |
| 404 | not_found | 이 주소를 찾을 수 없어요 | PASS — line 276-282 |
| 500+ | server_error | 상대 서버에 문제가 있어요 | PASS — line 284-290 |
| 기타 HTTP | http_error | HTTP {status} 응답을 받았어요 | PASS — line 293-298 |
| Timeout | timeout | 응답이 10초 안에 오지 않았어요 | PASS — line 302-308 |
| DNS 실패 | dns_error | 이 주소를 찾을 수 없어요 | PASS — line 311-317 |
| 연결 거부 | connection_refused | 서버가 연결을 거부했어요 | PASS — line 320-326 |
| 기타 | network_error | 연결에 실패했어요: {msg} | PASS — line 329-334 |

## 4. Payload 안전성

| 항목 | 상태 |
|------|------|
| 사용자 ID 미포함 | PASS |
| API key 미포함 | PASS |
| 프로젝트 데이터 미포함 | PASS |
| 이메일 미포함 | PASS |
| event 필드로 테스트 구분 | PASS — "test" / "save_test" |
