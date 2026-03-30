# Settings & Delivery Gap Register

> Date: 2026-03-16
> Total: 0 S0, 2 S1, 3 S2, 4 S3

## S0
**없음**

## S1

### S1-1. delivery_logs 테이블 FK 제약
- delivery_logs.executionId NOT NULL → intelligence alert에서 직접 INSERT 불가
- 보완: structured log + notification.emailSentAt
- 수정: executionId nullable migration

### S1-2. Retry setTimeout 서버 재시작 시 소실
- setTimeout 기반 → 배포 시 진행 중 retry 소실
- 수정: BullMQ delayed job 전환

## S2

### S2-1. prisma generate 미완료
- projectId 추가 후 dev 서버 잠금으로 generate 실패
- 수정: dev 서버 정지 → generate → 재시작

### S2-2. notification router에 projectId 파라미터 미추가
- getPreferences/savePreferences에 projectId input 없음
- 수정: `projectId: z.string().optional()` 추가

### S2-3. Settings UI에서 project-specific 설정 미지원
- UI에 프로젝트 선택 드롭다운 없음
- 수정: 프로젝트 드롭다운 + projectId 전달

## S3

### S3-1. 비-intelligence 알림에 guardrail 미적용
### S3-2. AlertType별 채널 세분화 미구현
### S3-3. Webhook test 이력 DB 미저장
### S3-4. Settings UI에 webhook "테스트" 버튼 미연결
