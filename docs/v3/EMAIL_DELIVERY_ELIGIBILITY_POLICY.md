# Email Delivery Eligibility Policy

> Date: 2026-03-16

## 이메일 발송 조건 (4중 체크)

| # | 조건 | 통과 못하면 |
|---|------|-----------|
| 1 | `userPrefs.channelEmail === true` | EMAIL 미포함 |
| 2 | `NOTIFICATION_EMAIL_API_KEY` 설정됨 | EMAIL 미포함 |
| 3 | `user.emailVerified !== null` | EMAIL 제거 + 로그 |
| 4 | `user.email` 존재 | EMAIL 제거 |

## 전체 흐름

```
채널 결정 시:
  [1] channelEmail pref ON? → NO → skip
  [2] EMAIL_API_KEY 있음? → NO → skip
  [3] 이후 dispatch 전:
      user.emailVerified? → NO → EMAIL 제거 + 로그
      user.email 있음? → NO → skip
  [4] 모두 통과 → recipientEmail 설정 → dispatch
```

## AUTH_DEV_LOGIN 환경

| 설정 | emailVerified | 이메일 발송 |
|------|-------------|-----------|
| `AUTH_DEV_LOGIN=true` | 보통 null | **발송 안 됨** (안전) |
| Google OAuth 로그인 | DateTime 값 | 발송됨 |
| 이메일 인증 완료 | DateTime 값 | 발송됨 |

## 향후 확장

| 항목 | 현재 | 향후 |
|------|------|------|
| 이메일 인증 플로우 | Auth.js 기본 | 커스텀 인증 이메일 |
| 바운스 추적 | 없음 | 발송 실패 → emailVerified 해제 |
| 이메일 변경 시 재인증 | 없음 | 변경 → emailVerified=null → 재인증 |
