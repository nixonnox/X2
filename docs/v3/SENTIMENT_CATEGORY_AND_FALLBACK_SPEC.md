# Sentiment Category & Fallback Spec

> Date: 2026-03-16

## 카테고리 정의

| 카테고리 | 의미 | downstream 처리 | UI 표시 |
|----------|------|----------------|---------|
| POSITIVE | 긍정적 반응 | positiveCount++ | 초록 뱃지 "긍정" |
| NEGATIVE | 부정적 반응 | negativeCount++ | 빨강 뱃지 "부정" |
| NEUTRAL | 중립적 반응 | neutralCount++ | 회색 뱃지 "중립" |
| MIXED | 긍정+부정 혼합 | neutralCount++ (현재) | 주황 뱃지 "혼합" |
| UNCLASSIFIED | 분류 불가 | unclassifiedCount++ | 주황 뱃지 "미분류" |
| ANALYSIS_FAILED | 분석 실패 | unclassifiedCount++ | 주황 뱃지 "미분류" |

## null → UNCLASSIFIED 분리 정책

**핵심 원칙: null sentiment를 NEUTRAL로 흡수하지 않는다.**

| 이전 | 이후 |
|------|------|
| sentiment: null → neutral 취급 | sentiment: null → 분석 시도 → 결과 할당 |
| 분석 실패 → neutral 취급 | 분석 실패 → UNCLASSIFIED (별도 카운트) |

### 데이터 흐름
```
Provider에서 수집 (sentiment: null)
  ↓
MentionSentimentAnalysisService.analyzeBatch()
  ├─ LLM 성공 → POSITIVE/NEGATIVE/NEUTRAL/MIXED
  ├─ LLM 실패 → Rule fallback
  │   ├─ 키워드 매칭 → POSITIVE/NEGATIVE/MIXED
  │   └─ 매칭 없음 → NEUTRAL (적극 분류)
  └─ 전체 실패 → UNCLASSIFIED
```

## Snapshot 저장 시 카운트

```typescript
// intelligence.liveMentions route (기존)
for (const m of result.mentions) {
  if (m.sentiment === "POSITIVE") positive++;
  else if (m.sentiment === "NEGATIVE") negative++;
  else if (m.sentiment === "NEUTRAL") neutral++;
  else unclassified++; // MIXED, UNCLASSIFIED, ANALYSIS_FAILED, null
}
```

## Confidence 처리

| Provider | 기본 Confidence |
|----------|----------------|
| Claude Haiku | 0.85 |
| Rule (키워드 매칭) | 0.3 ~ 0.7 (매칭 수에 비례) |
| Rule (매칭 없음 → NEUTRAL) | 0.5 |
| UNCLASSIFIED | 0 |
