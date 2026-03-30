# Verify: Alert Preference Audit Gap List

> Date: 2026-03-16
> Total: 0 S0, 0 S1, 0 S2, 2 S3

## S0
**없음**

## S1
**없음**

## S2
**없음**

## S3

### S3-1. Project-specific 변경 시 sourceId 미연동
- **현상:** 현재 `sourceId: "global"`만. project-specific 설정 변경 시 projectId가 sourceId에 들어가지 않음
- **수정:** savePreferences에 projectId 파라미터 추가 시 `sourceId: projectId` 설정

### S3-2. Structured log의 old value에 webhookUrl 전체 노출
- **현상:** webhookUrl이 audit log에 전체 URL로 기록됨
- **영향:** 민감도 LOW (사용자 자신의 URL)이지만, 외부 시스템 URL이 로그에 남음
- **수정:** `webhookUrl: "***masked***"` 또는 유무만 기록
