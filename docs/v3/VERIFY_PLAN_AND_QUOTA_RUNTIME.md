# Verify: Plan & Quota Runtime

> Date: 2026-03-16

## 플랜 구조 (DB에 존재)

| 필드 | 상태 | Enforcement |
|------|------|-------------|
| canAccessApi | PASS | External API route에서 체크 |
| canExportData | 존재 | CSV 다운로드 시 사용 가능 (현재 미체크) |
| maxChannels | 존재 | 채널 등록 시 체크 가능 |
| maxReportsPerMonth | 존재 | 리포트 생성 시 체크 가능 |
| maxAiTokensPerDay | 존재 | AI 서비스 호출 시 체크 가능 |

## Enforcement 상태

| 정책 | 실제 체크 | 위치 |
|------|----------|------|
| API 접근 제한 | **DONE** | route.ts:62 `canAccessApi` |
| 일일 알림 한도 | **DONE** | intelligence-alert.service `maxAlertsPerDay` |
| Rate limit (API) | **미구현** | 향후 Redis middleware |
| 다운로드 제한 | **미구현** | canExportData 필드 존재, UI 미체크 |
