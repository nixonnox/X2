# Live Social Mention Runtime Spec

> LiveSocialMentionBridgeService의 provider 구조, 수집 흐름, 타입 정의, coverage 계산, 자동 갱신 정책을 정리한 문서.

---

## 1. LiveSocialMentionBridgeService 개요

- 위치: `packages/api/src/services/intelligence/live-social-mention-bridge.service.ts`
- 역할: 다중 소셜 플랫폼에서 실시간 멘션을 수집하고, signal fusion 파이프라인에 주입할 수 있는 통합 포맷으로 변환
- 진입점: `collectLiveMentions(seedKeyword: string): Promise<LiveMentionBundle>`

---

## 2. Provider 구조

### 2.1 Provider 목록 및 연결 상태

| Provider | 연결 상태 | 데이터 소스 | 비고 |
|---|---|---|---|
| **YouTube** | Connected | DB 저장 데이터 (수집 파이프라인 경유) | 영상 제목, 설명, 댓글에서 키워드 매칭 |
| **Instagram** | Not Connected | — | API 연동 미완료, stub 반환 |
| **TikTok** | Not Connected | — | API 연동 미완료, stub 반환 |
| **X (Twitter)** | Not Connected | — | API 연동 미완료, stub 반환 |
| **Comments** | Connected | DB 저장 댓글 데이터 | 플랫폼 무관 댓글 통합 수집 |

### 2.2 Provider Interface

각 provider는 공통 인터페이스를 구현한다:

```typescript
interface SocialMentionProvider {
  name: string;
  status: SocialProviderStatus;
  fetchMentions(keyword: string): Promise<LiveMention[]>;
}
```

### 2.3 SocialProviderStatus

```typescript
type SocialProviderStatus = 'CONNECTED' | 'NOT_CONNECTED' | 'ERROR' | 'RATE_LIMITED';
```

- `CONNECTED`: 정상 연결, 데이터 수집 가능
- `NOT_CONNECTED`: 아직 API 연동되지 않음 (stub 반환)
- `ERROR`: 연결 시도 실패
- `RATE_LIMITED`: API 호출 제한 도달

---

## 3. collectLiveMentions() 흐름

```
collectLiveMentions(seedKeyword)
  │
  ├─ 1. 각 provider.fetchMentions(seedKeyword) 병렬 호출
  │     → YouTube: DB에서 최근 멘션 조회
  │     → Instagram: stub (빈 배열 + NOT_CONNECTED)
  │     → TikTok: stub (빈 배열 + NOT_CONNECTED)
  │     → X: stub (빈 배열 + NOT_CONNECTED)
  │     → Comments: DB에서 최근 댓글 조회
  │
  ├─ 2. combine: 모든 provider 결과를 단일 LiveMention[] 배열로 병합
  │
  ├─ 3. topic signals 추출
  │     → 멘션 텍스트에서 TopicSignal 배열 생성
  │     → 빈도, 감성, 시간 분포 기반
  │
  ├─ 4. buzz level 계산
  │     → 멘션 수, 증가율, 감성 극성으로 BuzzLevel 결정
  │
  ├─ 5. freshness 계산
  │     → 가장 최근 멘션 시각 기준 freshness score 산출
  │
  └─ 6. LiveMentionBundle 반환
        → mentions, topicSignals, buzzLevel, freshness, coverage, providerStatuses
```

---

## 4. 핵심 타입 정의

### 4.1 LiveMention

```typescript
interface LiveMention {
  id: string;
  provider: string;           // 'youtube' | 'instagram' | 'tiktok' | 'x' | 'comments'
  text: string;
  author: string;
  url?: string;
  publishedAt: Date;
  sentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  relevanceScore: number;     // 0.0 ~ 1.0
}
```

### 4.2 TopicSignal

```typescript
interface TopicSignal {
  topic: string;
  frequency: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  trendDirection: 'RISING' | 'STABLE' | 'DECLINING';
  firstSeenAt: Date;
  lastSeenAt: Date;
}
```

### 4.3 BuzzLevel

```typescript
type BuzzLevel = 'VIRAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'SILENT';
```

산출 기준:

| BuzzLevel | 멘션 수 (최근 24h) | 증가율 (전일 대비) |
|---|---|---|
| VIRAL | 100+ | +200% 이상 |
| HIGH | 50~99 | +100% 이상 |
| MODERATE | 20~49 | +50% 이상 |
| LOW | 5~19 | 증가 또는 유지 |
| SILENT | 0~4 | — |

### 4.4 LiveMentionBundle

```typescript
interface LiveMentionBundle {
  mentions: LiveMention[];
  topicSignals: TopicSignal[];
  buzzLevel: BuzzLevel;
  freshness: FreshnessInfo;
  coverage: CoverageInfo;
  providerStatuses: Record<string, SocialProviderStatus>;
}
```

---

## 5. toSocialCommentData() 변환

signal fusion 파이프라인에 주입하기 위해 LiveMention을 SocialCommentData 형태로 변환하는 유틸리티.

```typescript
function toSocialCommentData(mention: LiveMention): SocialCommentData {
  return {
    platform: mention.provider,
    content: mention.text,
    author: mention.author,
    publishedAt: mention.publishedAt,
    sentiment: mention.sentiment ?? 'NEUTRAL',
    relevance: mention.relevanceScore,
    sourceUrl: mention.url,
  };
}
```

이 변환을 통해 LiveMention 데이터는 기존 signal fusion의 social comment 채널에 자연스럽게 합류한다.

---

## 6. Coverage 계산

### 6.1 Coverage 정의

```typescript
interface CoverageInfo {
  totalProviders: number;      // 전체 provider 수
  connectedProviders: number;  // CONNECTED 상태인 provider 수
  coverageRatio: number;       // connectedProviders / totalProviders (0.0 ~ 1.0)
  isPartial: boolean;          // coverageRatio < 1.0이면 true
}
```

### 6.2 현재 Coverage 상태

- totalProviders: 5 (YouTube, Instagram, TikTok, X, Comments)
- connectedProviders: 2 (YouTube, Comments)
- coverageRatio: 0.4 (40%)
- isPartial: true

### 6.3 Partial Coverage 처리 정책

partial coverage 상태에서는 다음과 같이 처리한다:

1. **UI 표시**: LiveMentionStatusPanel에 연결된 provider와 미연결 provider를 명확히 구분하여 표시
2. **신뢰도 보정**: signal fusion 시 coverage ratio를 가중치로 반영하여 소셜 신호의 신뢰도를 보정
3. **경고 메시지**: "소셜 데이터 커버리지가 40%입니다. 일부 플랫폼의 데이터가 포함되지 않았습니다." 표시
4. **분석 가능 여부**: coverageRatio ≥ 0.2 (최소 1개 provider 연결)이면 분석 진행, 0이면 소셜 신호 비활성화

---

## 7. 자동 갱신 (Auto-Refresh)

### 7.1 갱신 주기

- `refetchInterval: 60_000` (60초)
- tRPC useQuery의 refetchInterval 옵션으로 설정

### 7.2 갱신 정책

| 상황 | 동작 |
|---|---|
| 페이지 포커스 상태 | 60초마다 자동 갱신 |
| 페이지 비포커스 (탭 전환) | 갱신 일시 중지 |
| 페이지 재포커스 시 | 즉시 1회 갱신 후 60초 주기 복귀 |
| 네트워크 오류 | 3회 재시도 후 갱신 일시 중지, 에러 표시 |
| provider ERROR/RATE_LIMITED | 해당 provider만 skip, 나머지 provider는 정상 갱신 |

### 7.3 Freshness 계산

```typescript
interface FreshnessInfo {
  latestMentionAt: Date | null;   // 가장 최근 멘션 시각
  ageInMinutes: number;           // 현재 시각과의 차이 (분)
  level: 'FRESH' | 'RECENT' | 'STALE' | 'OUTDATED';
}
```

| Freshness Level | ageInMinutes |
|---|---|
| FRESH | 0~5분 |
| RECENT | 6~30분 |
| STALE | 31~120분 |
| OUTDATED | 121분 이상 |

---

## 8. 관련 문서

- [INTELLIGENCE_ROUTE_ARCHITECTURE.md](./INTELLIGENCE_ROUTE_ARCHITECTURE.md)
- [SOCIAL_COMMENT_RUNTIME_BRIDGE_SPEC.md](./SOCIAL_COMMENT_RUNTIME_BRIDGE_SPEC.md)
- [LIVE_SIGNAL_RUNTIME_SPEC.md](./LIVE_SIGNAL_RUNTIME_SPEC.md)
