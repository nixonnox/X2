# Retention Implementation Notes

> Date: 2026-03-16

## 새로 만든 파일

| 파일 | 역할 |
|------|------|
| `packages/api/src/services/intelligence/intelligence-retention.service.ts` | Retention 정책 서비스 (5개 테이블 cleanup + 보호 + dry-run) |

## 수정한 파일

| 파일 | 변경 |
|------|------|
| `packages/queue/src/queues.ts` | `data-retention` queue + `RetentionJobData` 타입 추가 |
| `packages/queue/src/index.ts` | `dataRetentionQueue`, `RetentionJobData` export 추가 |
| `workers/analyzer/src/index.ts` | Retention worker + event handlers + graceful shutdown 추가 |
| `workers/analyzer/src/scheduler.ts` | 매주 일요일 03:00 retention job 등록 |

## 실행 방법

```bash
# Worker 실행 (retention 포함)
pnpm --filter @x2/analyzer dev

# Scheduler 등록 (retention 포함)
cd workers/analyzer && npx tsx src/scheduler.ts

# 수동 dry-run (코드에서)
# import { dataRetentionQueue } from "@x2/queue";
# await dataRetentionQueue.add("manual", { retentionDays: 90, dryRun: true, triggeredBy: "manual", scheduledAt: new Date().toISOString() });
```

## 남은 과제

| 항목 | 우선순위 |
|------|---------|
| Archive 테이블 (삭제 대신 이동) | LOW — 현재 hard delete로 충분 |
| 관리자 UI에서 retention 설정 변경 | LOW |
| retention 실행 결과를 DB에 로그 저장 | MEDIUM |
| 프로젝트별 retention 정책 차등 적용 | LOW |
