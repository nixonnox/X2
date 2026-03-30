# Verify: Benchmark Time-Series (Deduped)

> Date: 2026-03-16
> Status: 완료+검증 완료 → 건너뛰기

## 연결 구조

```
intelligence.benchmarkTrend (tRPC query)
  └─ persistence.getBenchmarkSnapshots(projectId, keyword, industryType, start, end)
       └─ benchmarkSnapshots 테이블 (daily upsert)
            └─ BenchmarkTrendChart (Recharts AreaChart)
                 └─ trendSummary: direction/volatility/changePercent
```

## 데이터 소스

| 소스 | 실제 DB? |
|------|---------|
| 수동 분석 시 | YES — `saveBenchmarkSnapshot()` |
| 스케줄 수집 시 | YES — snapshot worker upsert |
| Backfill 시 | YES — `executeBatch()` upsert |

Mock/placeholder: **없음**
