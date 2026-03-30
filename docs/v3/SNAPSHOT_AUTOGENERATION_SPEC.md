# Snapshot Auto-Generation Spec

> Date: 2026-03-16

## 자동 생성되는 Snapshot 유형

### 1. SocialMentionSnapshot (소셜 반응 기록)
- **생성 주기:** 6시간마다 (collection job)
- **Unique key:** projectId + keyword + date
- **포함 데이터:** totalCount, buzzLevel, 감성 분류 (positive/neutral/negative/unclassified)
- **History 연결:** `intelligence.periodData` 쿼리에서 기간별 조회 가능
- **Compare 연결:** period_vs_period 비교 시 소셜 트렌드 제공

### 2. BenchmarkSnapshot (기준 비교 기록)
- **생성 주기:** 매일 02:00 UTC (snapshot job)
- **Unique key:** projectId + keyword + industryType + date
- **포함 데이터:** overallScore, comparisons, highlights, warnings
- **History 연결:** `intelligence.benchmarkTrend` 쿼리에서 시계열 조회
- **Compare 연결:** 기간 비교 시 벤치마크 추이 제공

### 3. IntelligenceAnalysisRun (수동 분석 시 생성)
- **생성 주기:** 사용자가 분석 실행할 때마다
- **History 연결:** `intelligence.history` 쿼리
- **Compare 연결:** currentVsPrevious, period_vs_period

## History/Compare 연결 구조

```
                    ┌───────────────────┐
                    │ Scheduled Jobs    │
                    │ (6h/daily)        │
                    └─────────┬─────────┘
                              │ 자동 생성
                              ▼
    ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐
    │ SocialMention  │  │ Benchmark       │  │ AnalysisRun      │
    │ Snapshot       │  │ Snapshot        │  │ (수동)            │
    │ (6시간마다)    │  │ (매일)          │  │ (사용자 실행)     │
    └───────┬────────┘  └────────┬────────┘  └────────┬─────────┘
            │                    │                     │
            ▼                    ▼                     ▼
    ┌─────────────────────────────────────────────────────────┐
    │                  History / Compare                       │
    │  - intelligence.history (분석 이력)                      │
    │  - intelligence.benchmarkTrend (시계열)                  │
    │  - intelligence.periodData (기간별 소셜+벤치마크)        │
    │  - intelligence.currentVsPrevious (변화 비교)            │
    └─────────────────────────────────────────────────────────┘
```

## 자동 수집 대상 키워드

- `intelligenceKeyword` 테이블에서 `isSaved = true`인 키워드
- Scheduler가 실행될 때 DB에서 동적으로 로드
- 키워드 저장/해제 시 다음 scheduler 실행에서 반영
