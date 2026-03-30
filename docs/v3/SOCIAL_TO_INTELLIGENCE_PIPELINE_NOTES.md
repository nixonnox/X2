# Social → Intelligence Pipeline Notes

> Date: 2026-03-16

## 데이터 흐름 (구현 완료)

```
[수집]
  Provider API → SocialMention[] (sentiment: null)

[분석]
  MentionSentimentAnalysisService → sentiment 할당 (LLM/rule)

[저장]
  socialMentionSnapshot (daily upsert) → positiveCount/negativeCount/unclassifiedCount
  rawSocialMention (원본, sentiment 업데이트 가능)

[Intelligence 소비]
  intelligence.liveMentions → UI LiveMentionStatusPanel
  intelligence.periodData → 기간별 소셜 스냅샷 비교
  intelligence.analyze → socialData 인풋으로 signal fusion
  intelligence.benchmarkTrend → (간접) signalQuality 영향

[Alert 연동]
  PROVIDER_COVERAGE_LOW → isPartial && confidence < 0.5 시 알림
```

## 이미 동작하는 연결

| 연결 | 상태 |
|------|------|
| liveMentions → UI | DONE (60초 auto-refresh) |
| liveMentions → snapshot 저장 | DONE (daily upsert) |
| analyze → socialData 인풋 | DONE (commentStats + liveMentions 통합) |
| scheduled collection → snapshot | DONE (BullMQ 6시간) |
| sentiment → snapshot 카운트 | DONE (4-bucket) |
| providerCoverage → analyze metadata | DONE |
