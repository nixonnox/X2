# Channel Prefs Fallback Notes

> Date: 2026-03-16

## Fallback 정책

### 설정 미존재 시 (userAlertPreference 레코드 없음)

```typescript
return {
  channelInApp: true,    // 항상 ON
  channelEmail: false,   // 기본 OFF
  channelWebhook: false, // 기본 OFF
  webhookUrl: null,
};
```

→ **IN_APP만 발송** (가장 안전한 기본값)

### DB 조회 실패 시

동일한 기본값 반환 (try-catch 내부)

### 왜 IN_APP 기본인가

| 이유 | 설명 |
|------|------|
| 외부 의존 없음 | DB 저장만으로 완료 — API key, 네트워크 불필요 |
| 사용자 피로 없음 | 이메일/슬랙 폭주 위험 없음 |
| 명시적 opt-in | 외부 채널은 사용자가 설정에서 직접 켜야 함 |
| 즉시 반영 | Bell 뱃지에 바로 표시 |

### 설정 변경 경로

1. `/settings/notifications` 페이지 → 알림 방식 토글
2. `notification.savePreferences` tRPC mutation
3. DB: `user_alert_preferences` 테이블 upsert
