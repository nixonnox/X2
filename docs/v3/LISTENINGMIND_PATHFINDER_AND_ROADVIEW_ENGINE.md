# 패스파인더 & 로드뷰 엔진 설계

> 작성일: 2026-03-13
> 목적: 검색 여정 그래프 엔진의 node/edge 모델, 입력/출력 구조, traceability 설계

---

## 1. 현재 구현 상태

### 1.1 패스파인더 (pathfinder/page.tsx)

**현재 그래프 구조:**
- Canvas 2D 기반 커스텀 렌더링 (ECharts 아님, raw Canvas)
- 3열 고정 레이아웃: before(18%) / current(50%) / after(82%)
- 열당 최대 20개 노드, 총 최대 150개 노드
- 노드 크기: `log(searchVolume)` 기반
- 엣지: 베지어 곡선 + 화살표 (hover 시)
- 인터랙션: 드래그, 줌(0.3x~3x), 클릭, 툴팁

**현재 노드/엣지 모델 (프론트엔드):**
```typescript
type PathNode = {
  id: string;          // 키워드
  name: string;
  phase: TemporalPhase;     // "before" | "current" | "after"
  intent: IntentCategory;    // discovery | comparison | action | troubleshooting
  volume: number;            // searchVolume
  gapScore: number;
  isRising: boolean;
  isSeed: boolean;
  journeyStage?: SearchJourneyStage;
};

type PathEdge = {
  source: string;      // parent keyword
  target: string;      // child keyword
  strength: number;    // 0-1
  type: string;        // relationshipType
};
```

**현재 백엔드 그래프 모델 (graph-builder.ts):**
```typescript
IntentGraphNode = {
  id, name, intentCategory, subIntent, temporalPhase,
  searchVolume, socialVolume, gapScore, isRising, isSeed,
  depth, symbolSize, category, clusterId, centrality, journeyStage
};

IntentGraphLink = {
  source, target, relationshipType, strength
};

// RelationshipType: autocomplete | related | temporal | semantic |
//                   co_search | derived | question | cluster
```

### 1.2 로드뷰 (road-view/page.tsx)

**현재 구현:**
- 키워드 1개 입력 (시작+끝 2개 불가)
- 3탭: 검색 여정 / 경쟁 분석 / 콘텐츠 갭
- 브랜드 추출: 단순 휴리스틱 (시드 키워드 제거 → 첫 단어를 브랜드로 추정)
- 방향성 경로 분석 없음

---

## 2. 목표 아키텍처

### 2.1 핵심 차이: 리스닝마인드 vs 현재 X2

| 항목 | 리스닝마인드 | 현재 X2 | 목표 |
|------|-------------|---------|------|
| 데이터 소스 | 실제 SERP (연관 검색어, 추천 검색어) | 접미사 사전 템플릿 | SERP 기반 |
| 경로 단계 | 최대 10단계 | 3단계 고정 | 최대 10단계 |
| 노드 수 | 최대 1,000개 | 최대 150개 | 최대 1,000개 |
| 방향성 | Before → Target → After (순차적) | 부모-자식 관계만 | 검색 시퀀스 기반 방향성 |
| 로드뷰 입력 | 시작 + 끝 2개 키워드 | 1개 키워드 | 2개 키워드 |
| 경로 추적 | A→B 사이 중간 단계 추적 | 없음 | BFS/다익스트라 |

---

## 3. 검색 여정 그래프 엔진 설계

### 3.1 새로운 Node 모델

```typescript
// packages/search-data/src/types.ts

interface SearchJourneyNode {
  // === 식별 ===
  id: string;                          // 유니크 ID (cuid)
  keyword: string;                     // 검색어 텍스트
  normalizedKeyword: string;           // 소문자/공백 정규화

  // === 위치 (그래프 내 위치) ===
  depth: number;                       // 시드로부터의 거리 (0 = 시드)
  direction: "before" | "seed" | "after";  // 시드 기준 방향
  stepIndex: number;                   // 시드로부터의 단계 (0~9)

  // === 검색 데이터 (Phase 1에서 실제 데이터로 채워짐) ===
  searchVolume: number;                // 월간 검색량 (Google Ads)
  cpc?: number;                        // 클릭당 비용
  competitionIndex?: number;           // 광고 경쟁도 (0-1)
  trendData?: TrendDataPoint[];        // 12~48개월 트렌드

  // === 분류 데이터 (기존 분류기 활용) ===
  intentCategory: IntentCategory;
  subIntent: SubIntent;
  temporalPhase: TemporalPhase;
  journeyStage: SearchJourneyStage;

  // === 분석 지표 ===
  gapScore: number;                    // 콘텐츠 갭 (0-100)
  centrality: number;                  // 그래프 중심성 (0-1)
  pageRankScore?: number;              // PageRank (방향성 그래프에서)
  isRising: boolean;
  isSeed: boolean;

  // === 클러스터 ===
  clusterId?: string;
  clusterLabel?: string;

  // === 출처 추적 (Traceability) ===
  sources: NodeSource[];               // 이 노드가 어떻게 발견되었는지
}

interface NodeSource {
  type: "autocomplete" | "related_search" | "people_also_ask" |
        "serp_suggestion" | "naver_related" | "manual";
  parentKeyword: string;               // 어떤 키워드에서 파생되었는지
  collectedAt: string;                 // 수집 시점
  rawData?: unknown;                   // 원본 API 응답 (디버깅용)
}
```

### 3.2 새로운 Edge 모델

```typescript
interface SearchJourneyEdge {
  // === 식별 ===
  id: string;
  sourceId: string;                    // from node
  targetId: string;                    // to node

  // === 방향성 (핵심) ===
  direction: "forward" | "backward" | "bidirectional";
  // forward: source를 검색한 후 target을 검색
  // backward: target을 검색한 후 source를 검색
  // bidirectional: 양방향 (연관 검색어)

  // === 강도 ===
  weight: number;                      // 0-1, 전환 강도
  frequency?: number;                  // 이 경로를 통한 검색 빈도 (SERP 데이터 기반)

  // === 관계 유형 ===
  relationshipType: EdgeRelationshipType;

  // === 출처 추적 ===
  source: EdgeSource;
}

type EdgeRelationshipType =
  | "search_refinement"     // 검색어 수정 (autocomplete 기반)
  | "search_continuation"   // 검색 이어하기 (related searches 기반)
  | "topic_exploration"     // 토픽 탐색 (People Also Ask 기반)
  | "brand_comparison"      // 브랜드 비교 (vs 키워드)
  | "problem_solution"      // 문제→해결 (troubleshooting 관련)
  | "purchase_journey"      // 구매 여정 (정보→비교→구매)
  | "serp_overlap";         // SERP 결과 공유 (클러스터 파인더용)

interface EdgeSource {
  type: "google_autocomplete" | "google_related" | "google_paa" |
        "naver_related" | "serp_overlap" | "inferred";
  confidence: number;                  // 0-1
  collectedAt: string;
}
```

### 3.3 검색 경로 시퀀스 모델

```typescript
// 패스파인더: 시드 → 전후 경로 탐색
interface SearchPathSequence {
  id: string;
  seedKeyword: string;

  // 경로 단계 (최대 10단계)
  steps: SearchPathStep[];

  // 메타데이터
  totalSteps: number;                  // 1~10
  pathType: "linear" | "branching" | "circular" | "convergent";
  totalWeight: number;                 // 경로 전체 강도 합
  dominantIntent: IntentCategory;
}

interface SearchPathStep {
  stepIndex: number;                   // 0 = 가장 앞, 시드 = 중간
  keyword: string;
  nodeId: string;
  direction: "before" | "seed" | "after";
  transitionWeight: number;            // 이전 단계에서 이 단계로의 전환 강도
  transitionType: EdgeRelationshipType;
}

// 로드뷰: 시작 → 끝 경로 탐색
interface DirectedPath {
  id: string;
  startKeyword: string;
  endKeyword: string;

  // 중간 단계
  intermediateSteps: DirectedPathStep[];

  // 분석
  totalSteps: number;
  totalWeight: number;
  branchPoints: BranchPoint[];         // 이탈 포인트
  dominantIntent: IntentCategory;
}

interface DirectedPathStep {
  stepIndex: number;
  keyword: string;
  nodeId: string;
  transitionWeight: number;
  alternativeCount: number;            // 이 단계에서 갈 수 있는 다른 경로 수
}

interface BranchPoint {
  stepIndex: number;
  keyword: string;
  alternatives: { keyword: string; weight: number }[];  // 이탈 가능 경로
  dropOffRate: number;                 // 이 지점에서 이탈하는 비율 (0-1)
}
```

---

## 4. 엔진 입력/출력 구조

### 4.1 패스파인더 엔진

```
[입력]
  seedKeyword: string
  maxSteps: number (1~10, 기본 5)
  maxNodes: number (최대 1,000)
  direction: "both" | "before" | "after"

[처리 파이프라인]
  1. 시드 키워드로 SERP 수집 (연관 검색어 + 추천 검색어)
  2. 수집된 키워드 각각에 대해 재귀적 SERP 수집 (maxSteps까지)
  3. 각 키워드의 검색량/트렌드 조회 (Google Ads + Trends)
  4. 의도 분류 (기존 classifier 재사용)
  5. 방향성 그래프 구축 (node + edge)
  6. 경로 추출 (BFS로 시드에서 가능한 모든 경로)
  7. 유사 키워드 그룹핑 (슈퍼노드 생성)
  8. 클러스터링 (기존 Louvain 변형 재사용)

[출력]
  SearchJourneyGraph {
    nodes: SearchJourneyNode[]         // 최대 1,000개
    edges: SearchJourneyEdge[]
    paths: SearchPathSequence[]        // 상위 경로
    clusters: KeywordCluster[]
    superNodes: SuperNode[]            // 유사 키워드 그룹
    summary: PathfinderSummary
  }
```

### 4.2 로드뷰 엔진

```
[입력]
  startKeyword: string
  endKeyword: string
  maxIntermediateSteps: number (1~8, 기본 5)

[처리 파이프라인]
  1. 두 키워드 모두에 대해 SERP 수집 (방향 양쪽 탐색)
  2. 두 키워드의 SERP 연관 키워드 교집합/인접 분석
  3. BFS/다익스트라로 시작→끝 최단 경로 탐색
  4. 대안 경로 탐색 (K-shortest paths, K=5)
  5. 이탈 포인트 분석 (각 단계의 alternative count 기반)
  6. 브랜드 추출 (NER/사전 기반)
  7. 도메인 경쟁 분석 (SERP 상위 URL 비교)

[출력]
  RoadViewResult {
    startNode: SearchJourneyNode
    endNode: SearchJourneyNode
    primaryPath: DirectedPath          // 최단/최빈 경로
    alternativePaths: DirectedPath[]   // 대안 경로 (최대 5개)
    branchAnalysis: BranchPoint[]      // 이탈 포인트
    brandMentions: BrandMention[]      // 경로상 브랜드 분석
    domainCompetition?: DomainCompetition[]  // SERP 도메인 점유율
    summary: RoadViewSummary
  }
```

---

## 5. 경로 탐색 알고리즘

### 5.1 패스파인더: 다단계 BFS

```typescript
// 시드에서 양방향으로 BFS 확장
function buildSearchJourneyGraph(
  seed: string,
  maxSteps: number,
  maxNodes: number,
  serpAdapter: SerpAdapter
): SearchJourneyGraph {

  const graph = new DirectedGraph<SearchJourneyNode, SearchJourneyEdge>();
  const queue: { keyword: string; step: number; direction: "before" | "after" }[] = [];

  // 1. 시드 노드 추가
  graph.addNode(createSeedNode(seed));

  // 2. 시드의 SERP에서 before/after 키워드 수집
  const serpResult = await serpAdapter.fetch(seed);

  // "이 키워드 전에 검색한 것" = before 방향
  // "이 키워드 후에 검색한 것" = after 방향
  // Google의 "관련 검색어"는 bidirectional
  // Google의 "다음에 검색한 항목"은 after 방향

  for (const related of serpResult.relatedSearches) {
    queue.push({ keyword: related.query, step: 1, direction: "after" });
  }

  // 3. BFS 확장 (maxSteps까지)
  while (queue.length > 0 && graph.nodeCount < maxNodes) {
    const { keyword, step, direction } = queue.shift()!;
    if (step > maxSteps) continue;
    if (graph.hasNode(keyword)) continue;

    // 노드 추가
    const node = await createNode(keyword, step, direction);
    graph.addNode(node);

    // 다음 단계 확장
    if (step < maxSteps) {
      const nextSerp = await serpAdapter.fetch(keyword);
      for (const next of nextSerp.relatedSearches) {
        queue.push({ keyword: next.query, step: step + 1, direction });
      }
    }
  }

  return graph;
}
```

### 5.2 로드뷰: A→B 경로 탐색

```typescript
// 시작→끝 경로 탐색 (양방향 BFS + K-shortest paths)
function findDirectedPaths(
  startKeyword: string,
  endKeyword: string,
  graph: DirectedGraph,
  k: number = 5
): DirectedPath[] {

  // 1. 양방향 BFS로 두 키워드 연결 가능 여부 확인
  //    시작에서 outbound, 끝에서 inbound 동시 탐색
  const meetingPoints = bidirectionalBFS(graph, startKeyword, endKeyword);

  if (meetingPoints.length === 0) {
    // 직접 연결 안 되면 SERP 추가 수집으로 그래프 확장
    await expandGraphBetween(startKeyword, endKeyword, graph);
  }

  // 2. K-shortest paths (Yen's algorithm)
  const paths = yenKShortestPaths(graph, startKeyword, endKeyword, k);

  // 3. 각 경로의 이탈 포인트 분석
  for (const path of paths) {
    path.branchPoints = analyzeBranchPoints(graph, path);
  }

  return paths;
}
```

---

## 6. Traceability (추적 가능성) 구조

### 6.1 데이터 출처 추적

모든 노드와 엣지에 출처 정보를 기록한다.

```typescript
// 노드: "이 키워드가 어떻게 발견되었는가?"
node.sources = [
  {
    type: "google_autocomplete",
    parentKeyword: "화장품",           // "화장품" 자동완성에서 발견
    collectedAt: "2026-03-13T10:00:00Z",
    rawData: { suggestion: "화장품 추천", position: 3 }
  },
  {
    type: "naver_related",
    parentKeyword: "화장품",           // 네이버 연관 검색어에서도 발견
    collectedAt: "2026-03-13T10:00:05Z"
  }
];

// 엣지: "이 연결이 어떻게 추론되었는가?"
edge.source = {
  type: "google_related",
  confidence: 0.85,                    // 연관 검색어 순위 기반 신뢰도
  collectedAt: "2026-03-13T10:00:00Z"
};
```

### 6.2 분석 이력 추적

```typescript
interface AnalysisTrace {
  analysisId: string;                  // 분석 세션 ID
  seedKeyword: string;
  startedAt: string;
  completedAt: string;

  // 파이프라인 단계별 기록
  stages: {
    name: string;                      // "keyword_expansion", "serp_collection", etc.
    startedAt: string;
    completedAt: string;
    inputCount: number;                // 입력 키워드 수
    outputCount: number;               // 출력 키워드 수
    apiCallCount: number;              // 외부 API 호출 횟수
    cacheHitCount: number;             // 캐시 히트 수
    errorCount: number;
  }[];

  // 데이터 소스 요약
  dataSources: {
    source: string;                    // "google_autocomplete", "google_ads", etc.
    callCount: number;
    cacheHitRate: number;              // 0-1
    avgLatencyMs: number;
  }[];

  // 결과 요약
  totalNodes: number;
  totalEdges: number;
  totalPaths: number;
  maxDepth: number;
}
```

### 6.3 버전 관리

```typescript
// 같은 키워드에 대해 시간 경과에 따른 그래프 변화 추적
interface GraphSnapshot {
  id: string;
  analysisId: string;
  seedKeyword: string;
  snapshotAt: string;
  nodeCount: number;
  edgeCount: number;

  // 이전 스냅샷 대비 변화
  diff?: {
    addedNodes: string[];              // 새로 나타난 키워드
    removedNodes: string[];            // 사라진 키워드
    addedEdges: string[];
    removedEdges: string[];
    volumeChanges: { keyword: string; before: number; after: number }[];
  };
}
```

---

## 7. 기존 코드 재사용 계획

### 즉시 재사용

| 기존 모듈 | 재사용 방식 |
|-----------|------------|
| `graph-builder.ts` 클러스터링 (Louvain) | 그대로 사용 — 클러스터 검출 |
| `graph-builder.ts` 중심성 계산 | 그대로 사용 — degree centrality |
| `intent-classifier.ts` | 그대로 사용 — 노드 의도 분류 |
| `gap-calculator.ts` | 그대로 사용 — 갭 점수 계산 |
| `cache-manager.ts` | 그대로 사용 — SERP 결과 캐시 |
| `queue/analysis-queue.ts` | 그대로 사용 — 비동기 작업 관리 |
| Canvas 렌더링 (pathfinder/page.tsx) | 확장 — 다단계 레이아웃 추가 |

### 수정 필요

| 기존 모듈 | 수정 내용 |
|-----------|----------|
| `graph-builder.ts` 노드/링크 생성 | 새 node/edge 모델로 확장 |
| `graph-builder.ts` 경로 추출 | 3단계 고정 → 최대 10단계 |
| `service.ts` 파이프라인 | SERP 수집 단계 추가 |
| Canvas 레이아웃 | 3열 고정 → N열 수평 스크롤 |

### 신규 구현

| 모듈 | 설명 |
|------|------|
| 다단계 BFS 확장기 | SERP 기반 재귀 키워드 수집 |
| K-shortest paths (Yen's) | 로드뷰 A→B 경로 탐색 |
| 이탈 포인트 분석기 | 분기점에서의 대안 경로 분석 |
| 유사 키워드 그룹핑 (슈퍼노드) | 비슷한 검색어 합치기 |
| 브랜드 NER | 키워드에서 브랜드명 자동 인식 |
| 2-키워드 입력 UI | 로드뷰 시작+끝 입력 |

---

## 8. 성능 고려사항

### 1,000 노드 렌더링

| 기법 | 설명 |
|------|------|
| 쿼드트리 공간 인덱싱 | 마우스 이벤트 시 O(log n) 노드 탐색 |
| LOD (Level of Detail) | 줌 레벨에 따라 노드 라벨 표시/숨김 |
| 가상 렌더링 | 뷰포트 밖 노드는 렌더링 스킵 |
| 웹 워커 | 레이아웃 계산을 별도 스레드에서 |
| 슈퍼노드 | 유사 키워드를 하나로 합쳐 노드 수 감소 |

### SERP API 호출 최적화

| 기법 | 설명 |
|------|------|
| 캐시 우선 | SerpResult 테이블에서 7일 이내 결과 재사용 |
| 배치 요청 | DataForSEO는 100개/요청 배치 지원 |
| 점진적 확장 | 1단계씩 확장하며 중간 결과 먼저 표시 |
| 우선순위 큐 | 검색량 높은 키워드부터 확장 |
