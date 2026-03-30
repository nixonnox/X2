# Provider Expansion Implementation Notes

> Date: 2026-03-16

## 이번 단계에서 확인/정리한 것

### Adapter 구현 상태

| Provider | 파일 | isConfigured | testConnection | fetchMentions | 상태 |
|----------|------|-------------|----------------|---------------|------|
| YouTube | `youtube-data-api.adapter.ts` | envKey 체크 | YouTube API 호출 | 댓글 수집 | **완전 구현** |
| Instagram | `instagram-graph-api.adapter.ts` | envKey 체크 | Graph API 호출 | 해시태그 검색 | **완전 구현** |
| TikTok | `tiktok-research-api.adapter.ts` | envKey 체크 | Research API 호출 | 영상+댓글 검색 | **구조 구현 (SCAFFOLD)** |
| X | `x-api.adapter.ts` | envKey 체크 | Twitter API 호출 | 트윗 검색 | **완전 구현** |

### Registry 연결

모든 adapter는 `LiveSocialMentionBridgeService` 생성자에서 자동 등록:
```typescript
this.registry.register(new YouTubeDataApiAdapter());
this.registry.register(new InstagramGraphApiAdapter());
this.registry.register(new TikTokResearchApiAdapter());
this.registry.register(new XApiAdapter());
```

### Partial Coverage 처리

- `providerStatuses` 배열에 각 provider의 연결 상태 포함
- `coverage.isPartial` = connected < total && connected > 0
- UI: `LiveMentionStatusPanel`에서 provider별 연결/미연결 표시
- 알림: `PROVIDER_COVERAGE_LOW` 조건 (isPartial && confidence < 0.5)

## 새 provider 추가 시 해야 할 것

1. `.env.local`에 토큰 추가
2. 앱 재시작 (adapter가 생성자에서 env 읽음)
3. 끝 — Registry가 자동으로 isConfigured 체크

## 남은 과제

| 항목 | 우선순위 | 설명 |
|------|---------|------|
| Instagram 토큰 발급 | HIGH | Business 계정 + Facebook Page + OAuth |
| Instagram 토큰 자동 갱신 | MEDIUM | 60일 만료 → 자동 교환 로직 |
| TikTok Research API 승인 신청 | HIGH | 2~4주 소요, 빨리 시작해야 함 |
| X/Twitter 비용 결정 | LOW | $100/월 Basic tier 필요 |
| Provider health dashboard | LOW | 관리자 화면에서 연결 상태 확인 |
| OAuth token storage (DB) | MEDIUM | 현재 env 변수 → DB 저장으로 전환 |
