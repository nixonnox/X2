# Verify: Sentiment Associated Terms

> Date: 2026-03-16
> Status: 완료

| 항목 | 상태 | 근거 |
|------|------|------|
| `sentimentTerms` endpoint | PASS | router:1379 |
| Positive/Negative/Neutral 분리 | PASS | `m.sentiment === "POSITIVE"` → positiveTerms Map |
| Topics 기반 | PASS | rawSocialMention.topics + sentiment 교차 |
| Top 15 per sentiment | PASS | `.slice(0,15)` |
| Sentiment pipeline 연결 | PASS | `sentiment: { not: null }` 필터 — 분석된 것만 |
| `SentimentTermsPanel` UI | PASS | 3열 그리드 (긍정/부정/중립) |
| Empty state | PASS | "감성별 연관어 데이터가 아직 없어요" |
| Mock 아님 | PASS — rawSocialMention 실제 집계 |
