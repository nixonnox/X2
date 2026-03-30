# Phase 3: Gap List

> Date: 2026-03-16
> Total: 0 S0, 1 S1, 3 S2, 2 S3

## S0 — 자동 수집/snapshot 흐름 불성립

**없음**

## S1 — 출시 전 반드시 수정

### S1-1. JobType Enum 불일치 (updateJobStatus 무효화)

- **위치:** `workers/analyzer/src/index.ts:125, 209`
- **현상:** `MENTION_COLLECT`, `SNAPSHOT_GEN`이 Prisma `JobType` enum에 없음
- **영향:** `scheduledJob` 테이블의 lastRunAt이 업데이트되지 않음 → 운영자가 "마지막 성공 시점" 확인 불가
- **수정:** Prisma schema에 enum 값 추가 후 migration, 또는 기존 `KEYWORD_TRACK` / `INSIGHT_GENERATE` 매핑
- **snapshot 생성 자체에는 영향 없음**

## S2 — 제한 오픈 가능

### S2-1. LiveSocialMentionBridgeService 미연동

- **현상:** Collection worker가 `rawSocialMention` 테이블에서 직접 조회만 함. 실제 provider API 호출 없음
- **영향:** 새 데이터 유입이 없으면 snapshot이 빈 값 (totalCount: 0)
- **수정:** processCollection에서 LiveSocialMentionBridgeService.collectLiveMentions() 호출 추가

### S2-2. Signal Fusion 자동 실행 미구현

- **현상:** Snapshot job에서 `runAnalysis: true` 경로가 기존 analysisRun 재사용만 함
- **영향:** 새 분석 결과가 자동 생성되지 않음 (수동 분석에만 의존)
- **수정:** processSnapshot에서 signal fusion pipeline 호출 추가

### S2-3. Scheduler 자동 실행 없음

- **현상:** Scheduler가 별도 수동 실행 필요 (`tsx scheduler.ts`)
- **영향:** 서버 재시작 시 repeatable job이 재등록되지 않음
- **수정:** Worker 시작 시 scheduler 자동 실행 또는 cron endpoint에서 호출

## S3 — 개선 권장

### S3-1. BullMQ Dashboard 미설치

- **현상:** Job 상태를 Redis CLI 또는 로그로만 확인 가능
- **수정:** bull-board 또는 arena 설치

### S3-2. 알림 연동 없음

- **현상:** 수집 실패 시 사용자에게 알림이 가지 않음
- **수정:** Worker failed event에서 notification 생성 연동
