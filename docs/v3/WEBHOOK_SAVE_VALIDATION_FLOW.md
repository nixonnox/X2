# Webhook Save & Validation Flow

> Date: 2026-03-16

## 저장 + 테스트 통합 흐름

```
savePreferences({ channelWebhook: true, webhookUrl: "https://..." })
  │
  ├─ [1] Validation warnings (기존)
  │    └─ channelWebhook=true + webhookUrl="" → "URL이 비어 있어요"
  │
  ├─ [2] Webhook URL 자동 테스트 (신규)
  │    └─ channelWebhook=true + webhookUrl 있음 → test POST
  │         ├─ 성공 → webhookTestResult: { success: true }
  │         ├─ HTTP 오류 → warning 추가 + webhookTestResult: { success: false }
  │         └─ 네트워크 실패 → warning 추가 + webhookTestResult: { success: false }
  │
  ├─ [3] DB upsert (항상 실행 — 테스트 실패해도 저장)
  │
  └─ return { id, warnings, saved: true, webhookTestResult }
```

## 설계 결정

| 결정 | 이유 |
|------|------|
| 테스트 실패해도 저장 | 임시 네트워크 문제일 수 있으므로 차단하지 않음 |
| Warning으로 알림 | 저장은 되었지만 URL을 확인하라는 안내 |
| 5초 timeout | 저장 UX가 느려지지 않도록 |
| 별도 testWebhook endpoint도 제공 | 저장 없이 연결만 테스트하고 싶을 때 |
