# Sentiment Downstream Integration Spec

> Date: 2026-03-16

## Downstream 소비자

### 1. SocialMentionSnapshot
- **경로:** `intelligence.liveMentions` → `saveSocialSnapshot()`
- **반영:** positiveCount, neutralCount, negativeCount, unclassifiedCount
- **상태:** CONNECTED — sentiment 분석 후 분류된 값으로 저장

### 2. BenchmarkTrend
- **경로:** `intelligence.benchmarkTrend` → benchmarkSnapshot
- **반영:** 간접 — sentiment 분포가 signal quality에 영향
- **상태:** CONNECTED — signalQuality.hasSocialData로 반영

### 3. Compare (period_vs_period)
- **경로:** `intelligence.periodData` → socialSnapshots
- **반영:** 기간별 sentiment 분포 비교
- **상태:** CONNECTED — unclassifiedCount 포함

### 4. Alerts
- **경로:** `IntelligenceAlertService.evaluateConditions()`
- **반영:** PROVIDER_COVERAGE_LOW 조건에서 isPartial 판단
- **상태:** CONNECTED — sentiment null 비율이 높으면 isPartial=true

### 5. Evidence Bundle
- **경로:** `EvidenceBundleService` → sentiment breakdown
- **반영:** 리포트에 감성 분포 차트 포함
- **상태:** CONNECTED — 기존 구조 활용

### 6. UI 표시
- **LiveMentionStatusPanel:** 긍정/중립/부정/미분류 뱃지
- **IntelligenceSummaryCards:** 소셜 시그널 카드
- **Compare DifferenceCard:** 소셜 비교 항목

## 데이터 흐름 요약

```
Provider API → LiveMention (sentiment: null)
    ↓
SentimentAnalysisService → LiveMention (sentiment: POSITIVE/NEGATIVE/...)
    ↓
┌───────────────────────────────────────────────┐
│ socialMentionSnapshot (DB)                     │
│   positiveCount, neutralCount, negativeCount,  │
│   unclassifiedCount                            │
└──────────────────────┬────────────────────────┘
                       │
    ┌──────────────────┼──────────────────┐
    ▼                  ▼                  ▼
periodData      benchmarkTrend      compare
(시계열)        (트렌드)            (비교)
```
