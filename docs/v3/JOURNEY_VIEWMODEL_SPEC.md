# Journey ViewModel Spec

> 프론트엔드 View Model, Screen State, Metadata 구조 명세

## 1. PathfinderNodeViewModel

```typescript
type PathfinderNodeViewModel = {
  id: string;                      // "node-0"
  label: string;                   // "화장품 추천"
  nodeType: string;                // "keyword" | "seed" | "question" | "brand"
  direction: "before" | "seed" | "after";
  depth: number;                   // 시드로부터의 거리 (0 = 시드)
  intent: string;                  // "discovery"
  intentLabel: string;             // "정보 탐색"
  intentColor: string;             // "#3b82f6"
  stage?: string;                  // "awareness" (로드뷰 스테이지)
  stageLabel?: string;             // "인지"
  stageColor?: string;             // "#8b5cf6"
  searchVolume: number;
  gapScore: number;
  isRising: boolean;
  centrality: number;              // 0-1
  displaySize: number;             // 로그 스케일 시각화 크기
  confidenceLevel: "low" | "medium" | "high";
  lowConfidenceFlag: boolean;      // confidenceLevel === "low"
  isSeed: boolean;                 // nodeType === "seed"
};
```

### 매핑 규칙
- `intentLabel` — `INTENT_CATEGORY_LABELS[intent].label`
- `intentColor` — `INTENT_CATEGORY_LABELS[intent].color`
- `stageLabel` — `ROAD_STAGE_LABELS[stage]`
- `stageColor` — `ROAD_STAGE_COLORS[stage]`
- `isSeed` — `nodeType === "seed"`
- `lowConfidenceFlag` — `confidenceLevel === "low"`

## 2. PathfinderEdgeViewModel

```typescript
type PathfinderEdgeViewModel = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationType: string;            // "search_refinement"
  relationLabel: string;           // "검색어 수정"
  transitionType: string;          // "refinement"
  transitionLabel: string;         // "정제"
  direction: string;               // "forward" | "backward" | "bidirectional"
  weight: number;                  // 0-1
  confidence: number;              // 0-1
};
```

## 3. PathfinderPathViewModel

```typescript
type PathfinderPathViewModel = {
  id: string;
  pathLabel: string;               // "정보탐색 → 비교 → 구매"
  pathType: string;                // "linear" | "branching" | "circular"
  pathTypeLabel: string;           // "직선" | "분기" | "순환"
  pathScore: number;
  totalSteps: number;
  dominantIntent: string;
  dominantIntentLabel: string;
  intentFlow: string[];
  steps: {
    stepIndex: number;
    keyword: string;
    nodeId: string;
    direction: string;
    intent: string;
    intentLabel: string;
    transitionType: string;
    transitionLabel: string;
    transitionWeight: number;
  }[];
};
```

## 4. RoadStageViewModel

```typescript
type RoadStageViewModel = {
  id: string;
  stageType: string;               // "awareness"
  label: string;                   // "인지"
  description: string;
  order: number;                   // 0 = 첫 번째
  color: string;                   // "#8b5cf6"
  representativeKeywords: string[];
  dominantIntent: string;
  dominantIntentLabel: string;
  majorQuestions: string[];
  keywordCount: number;
  avgSearchVolume: number;
  avgGapScore: number;
  nextTransition?: {
    toStageLabel: string;
    strength: number;              // 0-1
    reason: string;
    transitionKeywords: string[];
  };
  lowConfidenceFlag: boolean;      // avgGapScore < 15 && keywordCount < 3
};
```

## 5. BranchPointViewModel

```typescript
type BranchPointViewModel = {
  stepIndex: number;
  keyword: string;
  dropOffRate: number;             // 0-1
  alternatives: {
    keyword: string;
    weight: number;
    intentLabel: string;
  }[];
};
```

## 6. JourneyScreenState

```typescript
type JourneyScreenState = {
  status: "idle" | "loading" | "success" | "error";
  isEmpty: boolean;
  isPartial: boolean;
  hasError: boolean;
  errorMessage?: string;
  lowConfidenceItems: number;
  staleData: boolean;              // 24시간 이상 경과
  lastUpdatedAt?: string;
  durationMs?: number;
  sourceCount?: number;
};
```

### 상태 전환 규칙

| 이전 | 이벤트 | 다음 |
|------|--------|------|
| idle | 분석 시작 | loading |
| loading | 성공 (결과 있음) | success, isEmpty=false |
| loading | 성공 (결과 없음) | success, isEmpty=true |
| loading | 실패 | error |
| success/error | 재분석 | loading |
| any | reset | idle |

## 7. Summary View Models

### PathfinderSummaryViewModel
```typescript
{
  seedKeyword: string;
  totalNodes: number;
  totalEdges: number;
  totalPaths: number;
  totalClusters: number;
  maxDepth: number;
  avgGapScore: number;
  topBlueOceans: { keyword: string; gapScore: number }[];
  intentDistribution: { label: string; count: number; color: string }[];
  stageDistribution: { label: string; count: number; color: string }[];
}
```

### RoadViewSummaryViewModel
```typescript
{
  seedKeyword: string;
  endKeyword?: string;
  totalStages: number;
  totalKeywords: number;
  avgGapScore: number;
  dominantJourney: string[];       // ["인지", "관심", "비교", ...]
  topContentGaps: { stageLabel: string; keyword: string; gapScore: number }[];
  topQuestions: string[];
}
```

## 8. 변환 레이어 구조

```
Engine Output           Mapper                      View Model
─────────────         ──────────                  ───────────
PathfinderResult   → mapPathfinderResult()      → PathfinderNodeViewModel[]
                                                   PathfinderEdgeViewModel[]
                                                   PathfinderPathViewModel[]
                                                   PathfinderSummaryViewModel
                                                   Partial<JourneyScreenState>

RoadViewResult     → mapRoadViewResult()        → RoadStageViewModel[]
                                                   PathfinderPathViewModel (primary)
                                                   PathfinderPathViewModel[] (alternatives)
                                                   BranchPointViewModel[]
                                                   RoadViewSummaryViewModel
                                                   Partial<JourneyScreenState>

Partial<State>     → buildJourneyScreenState()  → JourneyScreenState
```
