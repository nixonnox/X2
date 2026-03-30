# Home Dashboard Listening Card Spec

> 홈 대시보드에 통합된 리스닝 인텔리전스 카드 7개의 사양

## 1. 카드 목록

| # | 컴포넌트 | 파일 | 역할 |
|---|---------|------|------|
| 1 | TrendingIntentCard | `components/dashboard/TrendingIntentCard.tsx` | 급상승 검색 의도 top 3 |
| 2 | ClusterSummaryCard | `components/dashboard/ClusterSummaryCard.tsx` | 주요 클러스터 + 키워드 |
| 3 | PersonaSummaryCard | `components/dashboard/PersonaSummaryCard.tsx` | 페르소나 아키타입 top 3 |
| 4 | TopJourneyPreviewCard | `components/dashboard/TopJourneyPreviewCard.tsx` | 검색 여정 경로 미리보기 |
| 5 | ListeningSummaryCard | `components/dashboard/ListeningSummaryCard.tsx` | 전체 메트릭 요약 |
| 6 | ListeningActionCard | `components/dashboard/ListeningActionCard.tsx` | 추천 액션 top 3 |
| 7 | SearchIntelligenceStatusBar | `components/dashboard/SearchIntelligenceStatusBar.tsx` | 데이터 품질/상태 바 |

## 2. 대시보드 레이아웃 (재구성 후)

```
┌──────────────────────────────────────────────────────┐
│ PageHeader + DataStatusBar                           │
├──────────────────────────────────────────────────────┤
│ QuickAddChannel (접이식)                              │
├──────────────────────────────────────────────────────┤
│ SearchIntelligenceStatusBar (데이터 상태)              │
├──────────────────────────────────────────────────────┤
│ "오늘의 핵심 발견" → 리스닝 허브 링크                    │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│ │Trending  │ │Cluster   │ │Persona   │              │
│ │Intent    │ │Summary   │ │Summary   │              │
│ └──────────┘ └──────────┘ └──────────┘              │
├──────────────────────────────────────────────────────┤
│ ┌────────────────┐ ┌────────────────┐               │
│ │TopJourney      │ │Listening       │               │
│ │Preview         │ │Summary         │               │
│ └────────────────┘ └────────────────┘               │
├──────────────────────────────────────────────────────┤
│ ListeningActionCard (추천 액션)                       │
├──────────────────────────────────────────────────────┤
│ "소셜 & 댓글 분석" (기존 InsightCard 3종)              │
├──────────────────────────────────────────────────────┤
│ KPI Cards → Chart + GEO/AEO → Content Table → Links │
└──────────────────────────────────────────────────────┘
```

## 3. 각 카드 상세 사양

### 3.1 TrendingIntentCard

- **Props**: `intents?: IntentItem[]`, `confidence?: number`, `freshness?`
- **표시**: 키워드명, 의도 배지 (색상 코딩), 검색량, 변화율
- **빈 상태**: "검색 의도 분석이 시작되면 급상승 의도가 여기에 표시됩니다"
- **링크**: `/intent`
- **의도 색상**: 정보탐색(파랑), 구매의도(녹색), 비교분석(보라), 문제해결(주황), 브랜드(분홍)

### 3.2 ClusterSummaryCard

- **Props**: `clusters?`, `totalClusters?`
- **표시**: 클러스터명, 키워드 수, 상위 키워드 태그
- **빈 상태**: 클러스터 아이콘 + "클러스터 분석 결과가 여기에 표시됩니다"
- **링크**: `/cluster-finder`

### 3.3 PersonaSummaryCard

- **Props**: `personas?`, `confidence?`
- **표시**: 페르소나명, 비율 바, 설명
- **빈 상태**: Users 아이콘 + "페르소나 분석 결과가 여기에 표시됩니다"
- **링크**: `/persona`

### 3.4 TopJourneyPreviewCard

- **Props**: `paths?`, `totalPaths?`
- **표시**: 검색 경로 (step → step → step), 노드 수
- **빈 상태**: GitBranch 아이콘 + "검색 여정이 여기에 표시됩니다"
- **링크**: `/pathfinder`

### 3.5 ListeningSummaryCard

- **Props**: `seedKeyword?`, `clusterCount?`, `personaCount?`, `pathCount?`, `stageCount?`, `confidence?`
- **표시**: 시드 키워드, 분석 메트릭 4개 (클러스터/페르소나/경로/단계)
- **빈 상태**: Radio 아이콘 + "분석이 시작되면 요약이 표시됩니다"
- **링크**: `/listening-hub`

### 3.6 ListeningActionCard

- **Props**: `actions?`
- **표시**: 액션 제목, 카테고리 배지, 우선순위 표시
- **빈 상태**: Zap 아이콘 + "추천 액션이 여기에 표시됩니다"
- **링크**: `/insights/actions`

### 3.7 SearchIntelligenceStatusBar

- **Props**: `status?: StatusData` (confidence, freshness, engineCount, successCount, seedKeyword, analyzedAt, isMockOnly, isPartial, warnings)
- **표시**: 시드 키워드, 신뢰도%, 데이터 신선도, 엔진 성공률, 분석 시점
- **빈 상태**: AlertTriangle + "검색 인텔리전스 상태 정보를 불러올 수 없습니다"
- **배지**: 목업 데이터(빨강), 부분 데이터(주황), 전체 성공(녹색 체크)

## 4. 공통 패턴

- 모든 카드는 `"use client"` 컴포넌트
- 링크: `<Link>` 또는 카드 전체를 `<Link>`로 감싸기
- 아이콘: `lucide-react`
- 텍스트 크기: 제목 13px, 본문 12px, 배지 10-11px
- 색상: CSS 변수 (`var(--foreground)`, `var(--muted-foreground)`, `var(--secondary)`)
- hover 효과: `group-hover` 패턴으로 화살표/밑줄 표시
- 빈 상태: 아이콘 + 설명 텍스트 (데이터 없을 때)
- 신뢰도/신선도: 배지 색상으로 시각적 구분

## 5. 데이터 연결 (다음 단계)

현재 카드들은 props를 통해 데이터를 받는 구조. 실제 데이터 연결은:

1. `useSearchIntelligenceLatest` 훅 생성 → 최근 분석 결과 캐싱
2. tRPC `searchIntelligence.latest` 라우터 추가
3. dashboard page.tsx에서 훅 호출 → 카드에 props 전달
