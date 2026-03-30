# Phase 3: Snapshot Auto-Generation Verification

> Date: 2026-03-16
> Status: PASS

## 자동 생성 Snapshot

### SocialMentionSnapshot
- **생성 위치:** `processCollection` (index.ts:92-122)
- **Upsert key:** `projectId_keyword_date`
- **생성 조건:** 오늘 날짜에 없을 때 생성, 있으면 업데이트
- **포함 필드:** totalCount, buzzLevel, positive/neutral/negative/unclassifiedCount, freshness
- **History 연결:** `intelligence.periodData` → `socialSnapshots[]`

### BenchmarkSnapshot
- **생성 위치:** `processSnapshot` (index.ts:178-203)
- **Upsert key:** `projectId_keyword_industryType_date`
- **생성 조건:** 최신 analysisRun에 benchmarkComparison이 있을 때
- **포함 필드:** overallScore, comparisons, highlights, warnings
- **History 연결:** `intelligence.benchmarkTrend` → `dataPoints[]`

## History/Compare 연결 검증

| Snapshot 테이블 | 소비하는 API | 검증 |
|----------------|-------------|------|
| social_mention_snapshots | `intelligence.periodData` | PASS — 같은 테이블 |
| benchmark_snapshots | `intelligence.benchmarkTrend` | PASS — 같은 테이블 |
| social_mention_snapshots | `intelligence.compare` (period_vs_period) | PASS — `loadPeriodComparisonData` |

## Deduplication 검증

| 대상 | 방식 | 검증 |
|------|------|------|
| Social snapshot | findFirst(today) → skip + upsert(composite) | PASS — 이중 보호 |
| Benchmark snapshot | upsert(composite unique) | PASS |
| Analysis run | findFirst(today, seedKeyword) → skip if exists | PASS |
