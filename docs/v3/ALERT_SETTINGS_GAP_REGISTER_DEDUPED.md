# Alert Settings Gap Register (Deduped)

> Date: 2026-03-16
> Total: 0 S0, 0 S1, 1 S2, 3 S3

## S0 — 없음
## S1 — 없음

## S2

### S2-1. Settings UI 프로젝트 드롭다운
- API는 projectId 지원. UI에서 프로젝트 선택 미구현

## S3

### S3-1. Settings UI webhook "테스트" 버튼
- endpoint 있음, UI 버튼 미연결

### S3-2. 타입별 cooldown 사용자 설정
- globalCooldownMinutes만 가능, 타입별 세분화 없음

### S3-3. 커스텀 이메일 인증 플로우
- Auth.js 기본만. 바운스 추적, 변경 시 재인증 없음
