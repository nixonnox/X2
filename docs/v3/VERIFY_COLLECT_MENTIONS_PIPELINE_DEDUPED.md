# Verify: collectMentions Pipeline (Deduped)

> Date: 2026-03-16

## 파이프라인 연결 (모두 실제 코드)

| 단계 | 구현 | Stub? |
|------|------|-------|
| Provider API fetch | adapter.fetchMentions() | NO |
| → SocialMention 변환 | adapter 내부 map | NO |
| → Sentiment 분석 | SentimentAnalysisService | NO (LLM/rule) |
| → socialMentionSnapshot upsert | persistence service | NO (Prisma DB) |
| → UI LiveMentionStatusPanel | tRPC liveMentions query | NO |
| → intelligence.analyze socialData | commentStats + liveMentions | NO |
| → periodData / benchmarkTrend | snapshot 테이블 조회 | NO |
