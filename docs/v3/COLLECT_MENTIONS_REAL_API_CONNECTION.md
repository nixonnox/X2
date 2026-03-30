# collectMentions Real API Connection

> Date: 2026-03-16

## 현재 상태: **완전 구현**

`LiveSocialMentionBridgeService.collectLiveMentions()` 가 실제 API를 호출합니다.

### 호출 경로
```
intelligence.liveMentions (tRPC route)
  └─ bridge.collectLiveMentions(keyword, projectId)
       └─ registry.fetchAllMentions(keyword)
            └─ 각 adapter.fetchMentions(keyword) ← 실제 fetch()
```

### ListeningAnalysisService와의 관계

| 서비스 | 용도 | Intelligence 연결 |
|--------|------|-----------------|
| `LiveSocialMentionBridgeService` | Intelligence 실시간 멘션 | **직접 연결** (liveMentions route) |
| `ListeningAnalysisService` | Listening Hub 분석 | 별도 경로 (listening router) |

Intelligence 파이프라인은 `LiveSocialMentionBridgeService`를 사용합니다.
`ListeningAnalysisService`는 Listening Hub 전용이며 intelligence와 다른 흐름입니다.

## 추가 구현 필요: **없음**
