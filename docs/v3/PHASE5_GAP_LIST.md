# Phase 5: Gap List

> Date: 2026-03-16
> Total: 0 S0, 0 S1, 1 S2, 3 S3

## S0 — History/Compare 깨짐

**없음**

## S1 — 출시 전 반드시 수정

**없음**

## S2 — 제한 오픈 가능

### S2-1. Retention 실행 결과 DB 로그 미저장

- **현상:** cleanup 결과가 console.log로만 출력되고 DB에 저장되지 않음
- **영향:** 운영자가 과거 retention 실행 이력을 DB에서 조회할 수 없음
- **수정:** cleanup 결과를 별도 audit_log 테이블 또는 scheduled_jobs에 저장

## S3 — 개선 권장

### S3-1. Archive 테이블 미구현

- **현상:** Hard delete만 지원, 삭제된 데이터 복구 불가
- **영향:** 실수로 중요 데이터 삭제 시 복구 경로 없음
- **수정:** archive 테이블로 이동 후 일정 기간 후 hard delete

### S3-2. 프로젝트별 차등 retention 미지원

- **현상:** 모든 프로젝트에 동일한 90일 정책 적용
- **영향:** 엔터프라이즈 고객이 더 긴 보존 기간을 원할 수 있음
- **수정:** 프로젝트/워크스페이스별 retentionDays 설정

### S3-3. 관리자 UI 미구현

- **현상:** retention 설정 변경이 코드 수준에서만 가능
- **수정:** Settings 페이지에 retention 설정 섹션 추가
