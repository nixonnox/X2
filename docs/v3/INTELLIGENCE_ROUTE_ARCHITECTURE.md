# Intelligence Route Architecture

> `/intelligence` 전용 라우트의 구조, 기존 라우트와의 관계, tRPC 라우터 설계, 페이지 흐름 및 레이아웃 규격을 정리한 문서.

---

## 1. 라우트 구조

### 1.1 `/intelligence` 전용 라우트

| 경로 | 파일 | 역할 |
|---|---|---|
| `/intelligence` | `apps/web/src/app/(dashboard)/intelligence/page.tsx` | 키워드 분석 메인 페이지 |
| `/intelligence/compare` | `apps/web/src/app/(dashboard)/intelligence/compare/page.tsx` | A/B 비교 분석 페이지 |

두 페이지 모두 `(dashboard)` layout group 하위에 위치하며, 공통 사이드바/탑바 레이아웃을 상속받는다.

### 1.2 기존 `/vertical-preview`와의 관계

| 항목 | `/vertical-preview` | `/intelligence` |
|---|---|---|
| **목적** | 문서 생성 (보고서, 제안서 등) | 분석 전용 (신호 융합, 비교, 소셜 멘션) |
| **입력** | 키워드 + 산업 + 템플릿 선택 | 키워드 (+ 선택적 산업/기간) |
| **출력** | 구조화된 문서 블록 | Signal Fusion 시각화, 비교 결과, 라이브 멘션 |
| **데이터 흐름** | VerticalRuntime → Document Template | Intelligence Router → SignalFusion + LiveMention + Comparison |

`/vertical-preview`는 최종 산출물(문서)을 만드는 데 집중하고, `/intelligence`는 원시 분석 데이터를 탐색·비교하는 데 집중한다. 두 라우트는 동일한 하위 서비스(SearchDataConnector, BenchmarkEngine 등)를 공유하지만 상위 조합 레이어가 다르다.

---

## 2. tRPC `intelligence` 라우터

### 2.1 라우터 등록

`packages/api/src/root.ts`에서 `intelligence` 라우터를 등록한다.

```
appRouter = router({
  ...
  intelligence: intelligenceRouter,
  ...
})
```

### 2.2 Endpoints

| Endpoint | 메서드 | 설명 |
|---|---|---|
| `intelligence.analyze` | `mutation` | 키워드 기반 전체 분석 실행 (signal fusion + benchmark + taxonomy) |
| `intelligence.liveMentions` | `query` | 실시간 소셜 멘션 수집 (LiveSocialMentionBridgeService 호출) |
| `intelligence.compare` | `mutation` | A/B 비교 분석 실행 (IntelligenceComparisonService 호출) |

### 2.3 analyze mutation 흐름

1. 입력: `{ seedKeyword, industryType?, period? }`
2. SearchDataConnector로 검색 데이터 수집
3. BenchmarkEngine으로 업계 기준 데이터 산출
4. TopicTaxonomyMapper로 토픽 분류
5. SignalFusionEngine으로 신호 융합
6. 결과를 IntelligenceAnalysisResult 형태로 반환

### 2.4 liveMentions query 흐름

1. 입력: `{ seedKeyword }`
2. LiveSocialMentionBridgeService.collectLiveMentions() 호출
3. 각 provider로부터 멘션 수집 → 병합
4. TopicSignal, BuzzLevel, freshness 계산
5. `refetchInterval: 60_000` (60초)으로 자동 갱신

### 2.5 compare mutation 흐름

1. 입력: `{ mode, sideA, sideB }` (keyword_vs_keyword | industry_vs_industry | period_vs_period)
2. IntelligenceComparisonService.compare() 호출
3. 양측 분석 결과를 독립 실행 후 차이 계산
4. ComparisonResult (KeyDifference[], overallDifferenceScore 등) 반환

---

## 3. 핵심 서비스

### 3.1 IntelligenceComparisonService

- 위치: `packages/api/src/services/intelligence/intelligence-comparison.service.ts`
- 역할: 두 분석 결과(Side A vs Side B)를 비교하여 핵심 차이점, 변화 방향, 점수를 산출
- 의존: SignalFusionEngine, BenchmarkEngine, TopicTaxonomyMapper

### 3.2 LiveSocialMentionBridgeService

- 위치: `packages/api/src/services/intelligence/live-social-mention-bridge.service.ts`
- 역할: 다중 소셜 플랫폼에서 실시간 멘션을 수집하고, signal fusion에 사용할 수 있는 형태로 변환
- 의존: YouTube provider, Instagram provider (미연결), TikTok provider (미연결), X provider (미연결), Comments provider

---

## 4. Page Flow

### 4.1 메인 분석 페이지 (`/intelligence`)

```
키워드 입력
  → [분석 시작] 버튼 클릭
    → intelligence.analyze mutation 호출
      → Signal Fusion 결과 수신
        → 시각화 렌더링 (RadialChart, BenchmarkCard, TaxonomyTree 등)
        → 동시에 intelligence.liveMentions query 시작 (60초 자동 갱신)
          → LiveMentionStatusPanel 렌더링
```

### 4.2 비교 분석 페이지 (`/intelligence/compare`)

```
비교 모드 선택 (keyword / industry / period)
  → Side A, Side B 입력
    → [비교 시작] 버튼 클릭
      → intelligence.compare mutation 호출
        → ComparisonResult 수신
          → DifferenceScoreBanner, DifferenceCard, HighlightCard, ActionDeltaPanel 렌더링
          → Side-by-side SignalSummaryCard 렌더링
```

---

## 5. Layout 규격

### 5.1 Desktop (1280px 이상) — 3-column grid

| 왼쪽 (col-1) | 가운데 (col-2) | 오른쪽 (col-3) |
|---|---|---|
| 키워드 입력 + 필터 | Signal Fusion 시각화 (메인) | LiveMentionStatusPanel + Benchmark 요약 |

그리드 비율: `1fr 2fr 1fr` (약 25% / 50% / 25%)

### 5.2 Tablet (768px ~ 1279px) — 2-column

| 왼쪽 (col-1) | 오른쪽 (col-2) |
|---|---|
| 키워드 입력 + Signal Fusion 시각화 | LiveMentionStatusPanel + Benchmark 요약 |

그리드 비율: `3fr 2fr` (약 60% / 40%)

### 5.3 Mobile (767px 이하) — stacked + tabs

- 상단: 키워드 입력 (고정)
- 탭 전환 방식:
  - **분석** 탭: Signal Fusion 시각화
  - **소셜** 탭: LiveMentionStatusPanel
  - **벤치마크** 탭: Benchmark 요약 + 비교 진입점

모바일에서는 3-column 정보를 탭으로 분리하여 스크롤 부담을 줄인다.

---

## 6. 관련 문서

- [INTELLIGENCE_AB_COMPARISON_SPEC.md](./INTELLIGENCE_AB_COMPARISON_SPEC.md)
- [LIVE_SOCIAL_MENTION_RUNTIME_SPEC.md](./LIVE_SOCIAL_MENTION_RUNTIME_SPEC.md)
- [INTELLIGENCE_ROUTE_IMPLEMENTATION_NOTES.md](./INTELLIGENCE_ROUTE_IMPLEMENTATION_NOTES.md)
- [INTELLIGENCE_UI_ARCHITECTURE.md](./INTELLIGENCE_UI_ARCHITECTURE.md)
- [VERTICAL_PREVIEW_ARCHITECTURE.md](./VERTICAL_PREVIEW_ARCHITECTURE.md)
