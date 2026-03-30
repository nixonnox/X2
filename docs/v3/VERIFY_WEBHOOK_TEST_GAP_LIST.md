# Verify: Webhook Test Gap List

> Date: 2026-03-16
> Total: 0 S0, 0 S1, 0 S2, 2 S3

## S0
**없음**

## S1
**없음**

## S2
**없음**

## S3

### S3-1. 테스트 이력 DB 저장 없음
- **현상:** 테스트 결과가 반환값에만 포함, DB에 저장 안 됨
- **영향:** 과거 테스트 성공/실패 이력 조회 불가
- **수정:** `lastWebhookTestAt`, `lastWebhookTestStatus` 필드 추가

### S3-2. Settings UI에 "테스트" 버튼 미연결
- **현상:** `testWebhook` endpoint 존재하나 UI에서 호출하는 버튼 없음
- **영향:** 사용자가 저장 없이 연결만 테스트하려면 직접 API 호출 필요
- **수정:** Settings 페이지 webhook URL 옆에 "연결 테스트" 버튼 추가
