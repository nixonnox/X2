# Snapshot Cleanup Job Spec

> Date: 2026-03-16

## Job 정의

| 항목 | 값 |
|------|-----|
| Queue | `data-retention` |
| Cron | `0 3 * * 0` (매주 일요일 03:00 UTC) |
| Retry | 1회 (idempotent, 재시도 불필요) |
| Concurrency | 1 (동시 1건만) |

## Job Data

```typescript
type RetentionJobData = {
  retentionDays: number;    // 90
  dryRun: boolean;          // false (production), true (검증)
  triggeredBy: "scheduler" | "manual";
  scheduledAt: string;
};
```

## 실행 흐름

```
1. Worker가 data-retention job 수신
2. IntelligenceRetentionPolicyService.executeCleanup() 호출
3. 테이블별 순차 처리:
   a. analysis_runs → 보호 대상 식별 → 나머지 삭제
   b. comparison_runs → 날짜 기준 삭제
   c. social_mention_snapshots → 보호 대상 식별 → 나머지 삭제
   d. benchmark_snapshots → 보호 대상 식별 → 나머지 삭제
   e. raw_social_mentions → 배치 삭제 (1000건씩)
4. 결과 로그 출력
```

## Dry-Run 모드

```bash
# 수동 dry-run (삭제하지 않고 대상만 확인)
# dataRetentionQueue.add("manual-dryrun", { retentionDays: 90, dryRun: true, ... })
```

## 삭제 로그 형식

```
[Retention] EXECUTED: deleted=1234, protected=21, duration=456ms
[Retention] targets: [
  "intelligence_analysis_runs: -45 (protected: 12)",
  "intelligence_comparison_runs: -23 (protected: 0)",
  "social_mention_snapshots: -89 (protected: 9)",
  "benchmark_snapshots: -67 (protected: 0)",
  "raw_social_mentions: -1010 (protected: 0)"
]
```
