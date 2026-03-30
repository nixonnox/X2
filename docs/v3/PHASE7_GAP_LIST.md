# Phase 7: Gap List

> Date: 2026-03-16
> Total: 0 S0, 0 S1, 2 S2, 3 S3

## S0 — History/Compare 깨짐

**없음** — 기존 데이터 보호 (skip), upsert, provenance 구분 확인.

## S1 — 출시 전 반드시 수정

**없음**

## S2 — 제한 오픈 가능

### S2-1. Provider API 실시간 호출 미연동

- **현상:** `executeBatch`가 `rawSocialMention` DB 집계만 수행. 실제 provider API를 호출하여 새 데이터를 수집하지 않음
- **영향:** DB에 기존 rawSocialMention이 없으면 빈 snapshot만 생성
- **수정:** `LiveSocialMentionBridgeService.collectLiveMentions()` 호출 추가

### S2-2. 진행 상태 DB 저장 미구현

- **현상:** `BackfillProgress` 타입은 정의되었으나 실제 DB 저장/조회 없음
- **영향:** 진행 중인 backfill 상태를 관리자가 확인할 수 없음
- **수정:** backfill_sessions 테이블 또는 기존 scheduled_jobs 활용

## S3 — 개선 권장

### S3-1. Cancel API 미구현

- **현상:** BullMQ `queue.drain()`으로 가능하나 전용 취소 경로 없음
- **수정:** tRPC endpoint로 `queue.obliterate()` 또는 job ID 기반 제거

### S3-2. 관리자 UI 미구현

- **현상:** 코드 레벨에서만 backfill 실행 가능
- **수정:** Settings 또는 Admin 페이지에 backfill 실행 UI

### S3-3. UI에서 backfill provenance 표시 없음

- **현상:** `freshness: "backfill"` 값이 DB에 저장되지만 UI에서 별도 표시 없음
- **수정:** 시계열 차트에서 backfill 구간 시각 구분 (점선/색상 차이)
