# BullMQ Job Flow Spec

> Date: 2026-03-16

## Queue 정의

| Queue | 용도 | Cron | Retry | Concurrency |
|-------|------|------|-------|-------------|
| intelligence-collection | 소셜 멘션 수집 + snapshot | `0 */6 * * *` (6시간) | 3회 | 3 |
| intelligence-snapshot | 벤치마크 snapshot 생성 | `0 2 * * *` (매일 02:00) | 2회 | 2 |

## Job Data

### CollectionJobData
```typescript
{
  projectId: string;
  keyword: string;
  providers?: string[];
  triggeredBy: "scheduler" | "manual" | "webhook";
  scheduledAt: string;
}
```

### SnapshotJobData
```typescript
{
  projectId: string;
  keyword: string;
  industryType: string;
  runAnalysis: boolean;
  triggeredBy: "scheduler" | "manual" | "post-collection";
  scheduledAt: string;
}
```

## Deduplication 전략

### Collection
- `socialMentionSnapshot` 테이블에 오늘 날짜 데이터가 있으면 **skip**
- Upsert로 같은 날짜 데이터는 덮어쓰기 (최신 우선)

### Snapshot
- `intelligenceAnalysisRun`에 오늘 날짜 데이터가 있으면 **skip** (runAnalysis=false 시)
- `benchmarkSnapshot` upsert — composite unique (projectId + keyword + industryType + date)

## Scheduler 등록

```bash
# 반복 작업 등록 (저장된 키워드 기반)
tsx workers/analyzer/src/scheduler.ts

# Worker 실행 (작업 처리)
pnpm --filter @x2/analyzer dev
```

## Backoff 전략

| 시도 | Collection 대기 | Snapshot 대기 |
|------|----------------|---------------|
| 1차 실패 | 30초 | 15초 |
| 2차 실패 | 60초 | 30초 |
| 3차 실패 | 120초 | — (최대 2회) |
