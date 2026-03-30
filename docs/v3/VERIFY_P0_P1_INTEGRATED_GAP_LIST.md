# Verify: P0+P1 Integrated Gap List

> Date: 2026-03-16
> Total: 0 S0, 0 S1, 1 S2, 3 S3

## S0
**없음**

## S1
**없음** — P0 S1 2건 모두 해결됨 (delivery_logs FK + setTimeout→BullMQ)

## S2

### S2-1. Settings UI 프로젝트 드롭다운 미구현
- **severity:** S2
- **영향:** 사용자가 UI에서 project-specific 설정을 만들 수 없음 (API는 가능)
- **코드:** `/settings/notifications/page.tsx`
- **수정:** 프로젝트 선택 드롭다운 + projectId를 savePreferences에 전달
- **빠른 수정:** YES (UI만)
- **구조 수정:** NO

## S3

### S3-1. Settings UI webhook "테스트" 버튼 미연결
- **severity:** S3
- **영향:** 사용자가 저장 없이 연결만 테스트하려면 API 직접 호출 필요
- **수정:** 버튼 + `trpc.notification.testWebhook.useMutation()` 호출

### S3-2. delivery_logs에 projectId 직접 컬럼 없음
- **severity:** S3
- **영향:** sourceId 파싱으로 project 추출 가능하나 직접 쿼리 어려움
- **수정:** `projectId String?` 컬럼 추가

### S3-3. Webhook test 이력 DB 미저장
- **severity:** S3
- **영향:** 과거 테스트 결과 조회 불가
- **수정:** `lastWebhookTestAt`, `lastWebhookTestStatus` 필드 추가
