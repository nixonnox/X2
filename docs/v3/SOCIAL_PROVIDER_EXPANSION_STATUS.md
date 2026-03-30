# Social Provider Expansion Status

> Date: 2026-03-16

## Provider 현황

| Provider | Adapter | 토큰 | 실제 연결 | 상태 |
|----------|---------|------|----------|------|
| **YouTube** | DONE | `YOUTUBE_API_KEY` | **가능** (API Key만으로 작동) | **CONNECTED** (Key 설정 시) |
| **Instagram** | DONE | `INSTAGRAM_ACCESS_TOKEN` | **토큰 필요** | **READY** (토큰 발급 후 즉시 연결) |
| **TikTok** | SCAFFOLD | `TIKTOK_ACCESS_TOKEN` | **승인+토큰 필요** | **PENDING** (Research API 승인 대기) |
| **X (Twitter)** | DONE | `X_API_BEARER_TOKEN` | **유료 구독 필요** ($100/월 Basic) | **BLOCKED** (비용 결정 필요) |

## Coverage 상태별 의미

| 상태 | UI 표시 | 의미 |
|------|---------|------|
| CONNECTED | 초록 Wifi + "실시간" | 토큰 유효, API 호출 가능 |
| NOT_CONNECTED | 회색 WifiOff + "미연결" | 토큰 미설정 |
| AUTH_EXPIRED | 주황 경고 | 토큰 만료 (Instagram 60일) |
| RATE_LIMITED | 주황 경고 | 일일 할당량 초과 |
| ERROR | 빨강 경고 | API 호출 실패 |

## 현실적 확장 우선순위

### 1순위: YouTube (현재 CONNECTED 가능)
- **난이도:** LOW — API Key만 발급하면 됨
- **비용:** 무료 (일일 10,000 quota units)
- **데이터 품질:** 댓글 텍스트 + 작성자 + 시간
- **현재 상태:** Adapter 완전 구현, Key 설정 시 즉시 작동

### 2순위: Instagram (READY)
- **난이도:** MEDIUM — Business 계정 + Facebook Page + OAuth Token
- **비용:** 무료
- **데이터 품질:** 해시태그 미디어 (캡션 + 시간, 작성자 미제공)
- **제약:** 7일 데이터만, 60일마다 토큰 갱신
- **현재 상태:** Adapter 완전 구현, 토큰만 있으면 작동

### 3순위: TikTok (PENDING)
- **난이도:** HIGH — Research API 승인 필요 (2~4주)
- **비용:** 무료 (승인 후)
- **데이터 품질:** 영상 + 댓글 (키워드 검색)
- **제약:** 승인 절차가 가장 큰 blocker
- **현재 상태:** Scaffold 구현, 승인 후 연결 가능

### 4순위: X/Twitter (BLOCKED)
- **난이도:** MEDIUM (기술적) + HIGH (비용)
- **비용:** **$100/월** (Basic tier) 또는 $5,000/월 (Pro)
- **데이터 품질:** 트윗 텍스트 + 작성자 + 시간
- **제약:** 유료 구독 필수, Free tier는 검색 API 없음
- **현재 상태:** Adapter 완전 구현, 비용 결정 필요

## providerCoverage 구조

현재 `intelligence.analyze` route에서 provider coverage를 계산:

```typescript
const statuses = await liveMentionService.getRegistry().getAllStatuses();
const connected = statuses.filter(s => s.isAvailable).length;
providerCoverage = {
  connectedProviders: connected,    // 예: 1 (YouTube만)
  totalProviders: statuses.length,  // 예: 5 (YouTube+IG+TikTok+X+Comments)
  isPartial: connected < statuses.length && connected > 0,
  providers: statuses.map(s => ({
    name: s.provider,
    platform: s.platform,
    status: s.connectionStatus,
    error: s.error ?? null,
  })),
};
```
