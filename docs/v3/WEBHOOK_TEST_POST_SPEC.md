# Webhook Test POST Spec

> Date: 2026-03-16
> Status: IMPLEMENTED

## 테스트 방식 2가지

### 1. 명시적 테스트 (`notification.testWebhook`)
- **용도:** 사용자가 "테스트" 버튼 클릭 시
- **Timeout:** 10초
- **Payload:**
  ```json
  {
    "event": "test",
    "timestamp": "2026-03-16T10:00:00Z",
    "message": "X2 webhook 연결 테스트예요. 이 메시지가 보이면 정상이에요."
  }
  ```
- **HMAC:** `NOTIFICATION_WEBHOOK_SECRET` 있으면 `X-Webhook-Signature` 헤더 포함

### 2. 저장 시 자동 테스트 (`savePreferences` 내부)
- **용도:** webhook URL 저장 시 자동 연결 확인
- **Timeout:** 5초 (저장 흐름이므로 짧게)
- **Payload:** `{ "event": "save_test", "timestamp": "..." }`
- **실패 시:** 설정은 저장하되 warning 추가

## 에러 분류

| HTTP/Network 상태 | errorType | 사용자 메시지 |
|-------------------|-----------|-------------|
| 200-299 | — | 연결에 성공했어요! |
| 401/403 | auth_error | 인증 문제가 있어요 |
| 404 | not_found | 이 주소를 찾을 수 없어요 |
| 500+ | server_error | 상대 서버에 문제가 있어요 |
| 기타 4xx | http_error | HTTP {status} 응답을 받았어요 |
| Timeout (10s) | timeout | 응답이 10초 안에 오지 않았어요 |
| DNS 실패 | dns_error | 이 주소를 찾을 수 없어요 |
| 연결 거부 | connection_refused | 서버가 연결을 거부했어요 |
| 기타 네트워크 | network_error | 연결에 실패했어요: {message} |

## 민감 정보 보호

- 테스트 payload에 사용자 데이터/API key/토큰 미포함
- `event: "test"` 또는 `event: "save_test"` 로 구분 가능
- HMAC 서명은 선택적 (env secret 있을 때만)
