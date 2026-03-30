# Phase 7: Backfill Scope Verification

> Date: 2026-03-16
> Status: PASS

## 1. Scope Control

| 항목 | 상태 | 근거 |
|------|------|------|
| Project 기준 | PASS | `BackfillScope.projectId` 필수 — service.ts:16 |
| Keyword 기준 | PASS | `BackfillScope.keyword` 필수 — service.ts:17 |
| 기간 기준 | PASS | `startDate`, `endDate` 필수 — service.ts:19-20 |
| Provider 기준 | PASS | `BackfillScope.provider` — "youtube"/"instagram"/"all" — service.ts:21 |
| Industry 기준 | PASS | `BackfillScope.industryType` — benchmark용 — service.ts:18 |
| 선택적 실행 | PASS | `createPlan()` dry-run 후 수동 job 등록 — 자동 실행 경로 없음 |

## 2. 전체 자동 backfill 방지

| 항목 | 상태 | 근거 |
|------|------|------|
| 범위 지정 필수 | PASS | `BackfillScope` 전체 필드 required |
| 최대 기간 제한 | PASS | `MAX_BACKFILL_DAYS = 90` — service.ts:55 |
| Scheduler에 등록 안 됨 | PASS | `scheduler.ts`에 backfill cron 없음 — 수동만 |
| 자동 트리거 없음 | PASS | Worker만 존재, 자동 등록 경로 없음 |

## 3. 기간 유효성

| 항목 | 상태 | 근거 |
|------|------|------|
| 90일 초과 경고 | PASS | `totalDays > MAX_BACKFILL_DAYS` → warning 추가 — service.ts:84-86 |
| 시작>종료 경고 | PASS | `totalDays <= 0` → `canProceed: false` — service.ts:88-97 |
| 배치 분할 | PASS | 7일 단위 (`BATCH_SIZE_DAYS = 7`) — service.ts:105-118 |
| 기존 데이터 확인 | PASS | `existingSnapshots` count → warning — service.ts:126-138 |
