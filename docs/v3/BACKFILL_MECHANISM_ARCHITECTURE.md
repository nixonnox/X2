# Backfill Mechanism Architecture

> Date: 2026-03-16
> Status: IMPLEMENTED

## 구조

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Admin/User  │────>│ Backfill    │────>│ BullMQ       │
│  (범위 지정) │     │ Service     │     │ backfill Q   │
│              │     │ (계획 생성) │     │              │
└──────────────┘     └──────┬──────┘     └──────┬───────┘
                            │                    │
                     ┌──────▼──────┐      ┌──────▼───────┐
                     │ BackfillPlan│      │ Worker       │
                     │ (배치 분할) │      │ (executeBatch│
                     │ (쿼터 확인) │      │  per 7일)    │
                     └─────────────┘      └──────┬───────┘
                                                 │
                                          ┌──────▼───────┐
                                          │ PostgreSQL   │
                                          │ - snapshot   │
                                          │   upsert     │
                                          │ - 기존 데이터│
                                          │   보호       │
                                          └──────────────┘
```

## 핵심 원칙

| 원칙 | 구현 |
|------|------|
| **전체 자동 backfill 금지** | 범위 지정 필수 (project + keyword + 기간) |
| **선택적 범위** | project, keyword, industryType, startDate, endDate, provider |
| **최대 90일** | `MAX_BACKFILL_DAYS = 90` (retention과 일치) |
| **쿼터 보호** | 일일 쿼터의 30%만 backfill에 사용 (`DAILY_QUOTA_RESERVE = 0.3`) |
| **기존 데이터 보호** | 이미 존재하는 snapshot은 skip (덮어쓰지 않음) |
| **배치 단위** | 7일씩 분할 (`BATCH_SIZE_DAYS = 7`) |
| **실패 격리** | 배치별 독립 실행, 한 배치 실패가 다른 배치에 영향 없음 |

## 실행 흐름

### 1. 계획 생성 (dry-run)
```typescript
const plan = await backfillService.createPlan({
  projectId: "proj-001",
  keyword: "스킨케어",
  industryType: "BEAUTY",
  startDate: new Date("2026-01-01"),
  endDate: new Date("2026-03-01"),
  provider: "youtube",
});
// → { backfillId, batches: [...], estimatedQuota, canProceed, warnings }
```

### 2. Job 등록
```typescript
for (const batch of plan.batches) {
  await backfillQueue.add(`backfill:${plan.backfillId}:${batch.index}`, {
    projectId, keyword, industryType,
    startDate: batch.dateStart,
    endDate: batch.dateEnd,
    batchIndex: batch.index,
    totalBatches: plan.batches.length,
    triggeredBy: "manual",
    backfillId: plan.backfillId,
  });
}
```

### 3. Worker 처리 (배치별)
```
각 배치 (7일):
  날짜별 순회:
    1. socialMentionSnapshot 존재? → skip
    2. rawSocialMention 집계 → snapshot create
    3. intelligenceAnalysisRun 있으면 → benchmarkSnapshot upsert
```

## Queue 설정

| 항목 | 값 |
|------|-----|
| Queue 이름 | `intelligence-backfill` |
| Retry | 2회 (exponential, 1분 base) |
| Concurrency | 1 (순차 — 쿼터 보호) |
| Rate limit | 2 batches/분 |
| 완료 보관 | 50건 |
| 실패 보관 | 100건 |

## Provenance 구분

backfill로 생성된 snapshot은 `freshness: "backfill"` 값으로 구분:

| freshness | 의미 |
|-----------|------|
| `"fresh"` | 실시간 수집 |
| `"no_data"` | 데이터 없음 |
| `"backfill"` | 소급 수집 |

## History/Compare 통합

backfill snapshot은 기존 쿼리와 **자동 통합**:
- `intelligence.periodData` → socialSnapshots에 backfill 데이터 포함
- `intelligence.benchmarkTrend` → benchmarkSnapshots에 backfill 데이터 포함
- 별도 필터 없이 날짜 기반 조회에 자연스럽게 합류
