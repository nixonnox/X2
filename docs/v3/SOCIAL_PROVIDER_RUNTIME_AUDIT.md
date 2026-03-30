# Social Provider Runtime Audit

> Date: 2026-03-16

## 상태 판정

| # | 항목 | 상태 | 조치 |
|---|------|------|------|
| 1 | YouTube adapter (실제 API 호출) | **완료** — search+commentThreads 실제 fetch | 건너뛰기 |
| 2 | Instagram adapter | **완료** — hashtagSearch+recentMedia 실제 fetch | 건너뛰기 (토큰 필요) |
| 3 | TikTok adapter | **scaffold** — API 구조 구현, Research API 승인 필요 | 건너뛰기 (외부) |
| 4 | X adapter | **완료** — tweet search 실제 fetch | 건너뛰기 ($100/월 필요) |
| 5 | SocialProviderRegistry | **완료** — 4개 adapter 자동 등록, 상태 캐시 | 건너뛰기 |
| 6 | LiveSocialMentionBridge | **완료** — registry→수집→sentiment→snapshot | 건너뛰기 |
| 7 | `intelligence.liveMentions` route | **완료** — bridge 호출→snapshot 저장 | 건너뛰기 |
| 8 | Scheduled collection worker | **완료** — BullMQ, 6시간 cron | 건너뛰기 |
| 9 | Sentiment 분석 연동 | **완료** — LLM+rule fallback | 건너뛰기 |
| 10 | ListeningAnalysisService | **별도 경로** — listening hub용, intelligence와 다른 흐름 | 해당 없음 |

## 핵심 파이프라인 (이미 연결됨)

```
사용자 분석 요청 (intelligence.analyze / liveMentions)
  └─ LiveSocialMentionBridgeService.collectLiveMentions()
       └─ SocialProviderRegistryService.fetchAllMentions()
            ├─ YouTubeDataApiAdapter.fetchMentions()  ← 실제 API (KEY 필요)
            ├─ InstagramGraphApiAdapter.fetchMentions() ← 실제 API (TOKEN 필요)
            ├─ TikTokResearchApiAdapter.fetchMentions() ← scaffold (승인 필요)
            └─ XApiAdapter.fetchMentions()             ← 실제 API ($100/월 필요)
       └─ SentimentAnalysisService.analyzeBatch()
       └─ saveSocialSnapshot() → DB
```

## Provider별 실연결 조건

| Provider | 코드 | 실제 연결 | 필요한 것 |
|----------|------|----------|----------|
| **YouTube** | 완전 구현 | `YOUTUBE_API_KEY` 설정 시 즉시 | API Key (무료) |
| Instagram | 완전 구현 | `INSTAGRAM_ACCESS_TOKEN` 필요 | OAuth Token (무료, Business 계정) |
| TikTok | Scaffold | Research API 승인 필요 | 승인 (2~4주) + Token |
| X | 완전 구현 | `X_API_BEARER_TOKEN` 필요 | $100/월 Basic tier |
