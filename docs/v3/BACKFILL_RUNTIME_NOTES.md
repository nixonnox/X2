# Backfill Runtime Notes

> Date: 2026-03-16

## 새로 만든 파일

| 파일 | 역할 |
|------|------|
| `packages/api/src/services/intelligence/intelligence-backfill.service.ts` | Backfill 계획 생성 + 배치 실행 서비스 |

## 수정한 파일

| 파일 | 변경 |
|------|------|
| `packages/queue/src/queues.ts` | `BackfillJobData` 타입 + `backfillQueue` 추가 |
| `packages/queue/src/index.ts` | `backfillQueue`, `BackfillJobData` export |
| `workers/analyzer/src/index.ts` | `processBackfill` 함수 + `backfillWorker` + event handlers + shutdown |

## 실행 방법

```typescript
// 1. 계획 생성 (dry-run)
import { IntelligenceBackfillService } from "@x2/api/services/intelligence/intelligence-backfill.service";
const service = new IntelligenceBackfillService(db);
const plan = await service.createPlan({
  projectId: "proj-001",
  keyword: "스킨케어",
  industryType: "BEAUTY",
  startDate: new Date("2026-01-01"),
  endDate: new Date("2026-03-01"),
  provider: "youtube",
});

// 2. 계획 확인
console.log(plan.warnings);    // 경고 확인
console.log(plan.canProceed);  // 진행 가능 여부
console.log(plan.batches);     // 배치 목록

// 3. Job 등록
import { backfillQueue } from "@x2/queue";
for (const batch of plan.batches) {
  await backfillQueue.add(`bf:${plan.backfillId}:${batch.index}`, {
    projectId: plan.scope.projectId,
    keyword: plan.scope.keyword,
    industryType: plan.scope.industryType,
    startDate: batch.dateStart,
    endDate: batch.dateEnd,
    batchIndex: batch.index,
    totalBatches: plan.batches.length,
    provider: plan.scope.provider,
    triggeredBy: "manual",
    backfillId: plan.backfillId,
  });
}
```

## 남은 과제

| 항목 | 우선순위 |
|------|---------|
| 관리자 UI에서 backfill 실행 | MEDIUM |
| 진행 상태 실시간 표시 | MEDIUM |
| tRPC endpoint로 backfill 계획/실행 노출 | MEDIUM |
| Provider API 실시간 호출 연동 (현재 DB 집계만) | HIGH |
| 취소(cancel) 기능 | LOW |
