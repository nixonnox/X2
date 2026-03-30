# Verify: Social Provider Runtime (Deduped)

> Date: 2026-03-16
> **모든 provider 코드 완료. 실연결은 토큰/Key 설정 시 즉시 동작.**

## Provider별 상태

| Provider | 코드 | 실제 fetch | 토큰 | 판정 |
|----------|------|-----------|------|------|
| YouTube | 완전 (search+comments) | `YOUTUBE_API_KEY` 시 즉시 | 무료 API Key | **완료** |
| Instagram | 완전 (hashtag+media) | `INSTAGRAM_ACCESS_TOKEN` 필요 | OAuth (무료) | **완료 (토큰 필요)** |
| TikTok | scaffold | Research API 승인 필요 | 승인 2~4주 | **일부 완료 (외부)** |
| X | 완전 (tweet search) | `X_API_BEARER_TOKEN` 필요 | $100/월 | **완료 (비용 필요)** |

## collectMentions Runtime

```
LiveSocialMentionBridgeService.collectLiveMentions()
  └─ registry.fetchAllMentions() → 4개 adapter 순회
       └─ adapter.isConfigured()? → YES: fetchMentions() / NO: skip
  └─ sentimentService.analyzeBatch() → sentiment 할당
  └─ saveSocialSnapshot() → DB upsert
```
- Stub: **아님** — 실제 `fetch()` 호출
- Fake data: **아님** — provider API 응답 사용
