# Alert Daily Cap Policy Gap List

> Date: 2026-03-16
> Total: 0 S0, 0 S1, 2 S2, 2 S3

## S0 — Daily cap guardrail 미동작

**없음** — intelligence alert 경로에서 정상 동작 확인.

## S1 — 출시 전 수정 필요

**없음**

## S2 — 제한 오픈 가능

### S2-1. 비-intelligence 알림에 daily cap 미적용

- **현상:** risk-signal, automation, ops-monitoring 등의 notification.create가 daily cap 없이 직접 생성
- **영향:** intelligence alert 외 유형이 대량 생성될 수 있음
- **수정:** 범용 NotificationGuardrailService 도입 (모든 알림 경로에서 호출)
- **현재 영향도:** LOW — 이들 서비스는 아직 실제 트리거 빈도가 낮음

### S2-2. Daily cap count 실패 시 cap 비적용

- **현상:** `notification.count` 쿼리 실패 시 `dailyAlertCount = 0`으로 진행 (line 149-151)
- **영향:** DB 오류 시 일시적으로 cap 미적용
- **수정:** 실패 시 보수적으로 cap 적용 (dailyAlertCount = maxAlertsPerDay)

## S3 — 개선 권장

### S3-1. 하루 기준이 로컬 시간

- **현상:** `setHours(0,0,0,0)` — 서버 로컬 시간 기준
- **영향:** UTC vs KST 차이로 자정 기준이 불일치할 수 있음
- **수정:** UTC 기준으로 통일 (`new Date().setUTCHours(0,0,0,0)`)

### S3-2. Project 단위 cap 미구현

- **현상:** Daily cap이 userId 단위 (모든 프로젝트 합산)
- **영향:** 프로젝트가 많은 사용자는 일부 프로젝트 알림을 놓칠 수 있음
- **수정:** userId + projectId 기준 per-project cap 옵션
