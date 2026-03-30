# Email Verification Status Spec

> Date: 2026-03-16
> Status: IMPLEMENTED (Auth.js 기존 필드 활용)

## 상태 구조

| 상태 | DB 값 | 의미 |
|------|-------|------|
| **Verified** | `emailVerified: DateTime` (값 있음) | Auth.js OAuth/이메일 인증 완료 |
| **Unverified** | `emailVerified: null` | 인증 미완료 |
| **Unknown** | user 조회 실패 | DB 오류 등 |

## 기존 인프라

Auth.js가 이미 `User.emailVerified` 필드를 관리:
- Google OAuth 로그인 → 자동으로 `emailVerified = now()` 설정
- 이메일 매직 링크 → 인증 완료 시 설정
- `AUTH_DEV_LOGIN=true` (개발 모드) → emailVerified 미설정 가능

## Dispatch 연동

```
createAlertNotification()
  └─ externalChannels에 EMAIL 포함?
       └─ user.findUnique({ select: { email, emailVerified } })
            ├─ emailVerified 있음 → recipientEmail 설정 → dispatch
            └─ emailVerified null → EMAIL 제거 → skip + 로그
```

## 로그

```
[ChannelDecision] EMAIL skipped: email not verified for user usr-001
```
