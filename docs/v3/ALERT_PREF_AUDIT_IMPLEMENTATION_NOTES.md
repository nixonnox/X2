# Alert Preference Audit Implementation Notes

> Date: 2026-03-16

## 수정한 파일

| 파일 | 변경 |
|------|------|
| `packages/api/src/routers/notification.ts` | `getPreferenceAuditLog` endpoint 추가, `savePreferences`에 audit diff + log + DB 기록 추가 |

## 설계 결정

| 결정 | 이유 |
|------|------|
| notification 테이블 활용 | 별도 audit 테이블 추가 없이 기존 인프라 재사용 |
| sourceType="pref_audit" | 일반 알림과 구분, 전용 쿼리 가능 |
| isRead=true | 감사 로그는 Bell 뱃지에 영향 주지 않음 |
| priority="LOW" | 알림 목록에서 낮은 우선순위 |
| 변경 없으면 skip | 불필요한 레코드 방지 |
| webhookUrl 전체 기록 | 민감도 LOW (사용자 자신의 URL) |

## 남은 과제

| 항목 | 우선순위 |
|------|---------|
| project-specific 변경 시 projectId 포함 | MEDIUM (projectId 파라미터 추가 후) |
| Settings UI에서 변경 이력 보기 | LOW |
| 90일 이상 audit 로그 정리 (retention 연동) | LOW |
| 관리자 전용 audit 대시보드 | LOW |
