# Pathfinder / RoadView 코드 재사용 맵

> intent-engine과 journey-engine 간의 코드 재사용 전략을 정리한 기술 참조 문서.
> 각 항목에 원본 파일:라인을 표기하여 추적 가능하게 한다.

---

## 1. 재사용 지점 (Reuse Points)

intent-engine에서 **그대로 또는 최소 수정**으로 재사용하는 코드.

| # | 원본 (intent-engine) | 사용처 (journey-engine) | 재사용 방식 | 설명 |
|---|---|---|---|---|
| R1 | `types.ts:10-15` `IntentCategory` | `types.ts:11-18` re-export | **그대로 import** | 5가지 의도 분류 체계 (discovery, comparison, action, troubleshooting, unknown)를 그대로 사용 |
| R2 | `types.ts:18-33` `SubIntent` | `types.ts:11-18` re-export | **그대로 import** | 15가지 세부 의도 (definition, how_to, list 등)를 그대로 사용 |
| R3 | `types.ts:8` `TemporalPhase` | `types.ts:11-18` re-export | **그대로 import** | 시간적 위상 (before, current, after) 그대로 사용 |
| R4 | `types.ts:153-158` `SearchJourneyStage` | `types.ts:11-18` re-export | **그대로 import** | 5단계 여정 (awareness~advocacy)을 그대로 사용 |
| R5 | `types.ts:267-275` `IntentGraphData` | `journey-graph-builder.ts:12` import | **입력 데이터로 사용** | 전체 분석 결과 구조체를 PathfinderResult 변환의 입력으로 사용 |
| R6 | `types.ts:236-260` `IntentGraphNode`, `IntentGraphLink` | `journey-graph-builder.ts:12` import | **입력 데이터로 사용** | 노드/링크를 JourneyNode/JourneyEdge로 1:1 변환 |
| R7 | `types.ts:182-192` `KeywordCluster` | `journey-graph-builder.ts:305-329` `convertClusters()` | **구조 변환** | 클러스터 데이터를 PathfinderCluster 형식으로 변환. keywords, dominantIntent, avgGapScore 필드를 그대로 복사 |
| R8 | `service.ts:54-73` `analyze()` | `pathfinder-service.ts:47-56` 동적 import | **직접 호출** | intent-engine의 전체 파이프라인을 그대로 실행하여 IntentGraphData를 얻음 |
| R9 | `graph-builder.ts:112-253` `detectClusters()` | `journey-graph-builder.ts:305-329` 결과 전달 | **결과 재사용** | Louvain-inspired 클러스터링 결과를 그대로 가져와서 형식만 변환 |

### 핵심 재사용 패턴

journey-engine의 `types.ts:11-26`에서 intent-engine 타입을 **import 후 re-export**하는 패턴을 사용한다:

```typescript
// journey-engine/types.ts:11-26
import type {
  IntentCategory,
  SubIntent,
  TemporalPhase,
  SearchJourneyStage,
  IntentGraphData,
  ClassifiedKeyword,
} from "../intent-engine/types";

export type { IntentCategory, SubIntent, TemporalPhase, SearchJourneyStage };
```

이 패턴 덕분에 journey-engine을 사용하는 코드에서는 intent-engine을 직접 참조할 필요가 없다.

---

## 2. 수정 지점 (Modification Points)

intent-engine 코드를 **확장/수정**하여 사용하는 부분.

### M1. link strength → edge weight 확장

| 항목 | intent-engine | journey-engine |
|---|---|---|
| **파일** | `graph-builder.ts:51-63` `calculateLinkStrength()` | `transition-builder.ts:154-180` `calculateEdgeWeight()` |
| **기본값** | 0.3 | 0.3 (동일) |
| **의도 일치** | +0.2 | +0.2 (동일) |
| **phase 일치** | +0.15 | +0.15 (동일) |
| **볼륨 비율** | +0.15 | +0.15 (동일) |
| **클러스터 일치** | 없음 | **+0.1 (신규)** |
| **방향 순서** | 없음 | **+0.1 (신규)** — before→seed→after 순서 맞으면 가산 |

**수정 이유**: intent-engine은 무방향 그래프였기 때문에 방향성 가중치가 불필요했다. journey-engine은 검색 여정의 **흐름 방향**을 표현해야 하므로, 같은 클러스터 소속과 여정 방향 순서에 대한 가중치를 추가했다.

### M2. 3단계 여정 → 6단계 RoadStage 확장

| 항목 | intent-engine | journey-engine |
|---|---|---|
| **파일** | `graph-builder.ts:93-110` `deriveJourneyStage()` | `stage-inference.ts:39-55` `inferStage()` |
| **단계 수** | 5단계 (awareness, consideration, decision, retention, advocacy) | **6단계** (awareness, interest, comparison, decision, action, advocacy) |
| **입력** | `ClassifiedKeyword` (intentCategory + temporalPhase) | `JourneyNode` (intent + subIntent + temporalPhase + label) |
| **추론 방식** | intent + phase 2차원 매핑 | **4단계 우선순위**: subIntent → intent+phase 조합 → 키워드 패턴 → 기본 매핑 |

**수정 이유**: intent-engine의 5단계 여정은 TemporalPhase(3) x IntentCategory(5) 조합으로만 추론했다. 실제 소비자 결정 여정은 "관심(interest)"과 "실행(action)"이 구분되어야 하고, 한국어 키워드 패턴("~추천", "~구매" 등)으로 더 정밀한 추론이 가능하므로 6단계로 확장했다.

### M3. 관계 유형 체계 확장

| 항목 | intent-engine | journey-engine |
|---|---|---|
| **파일** | `types.ts:65-73` `RelationshipType` | `types.ts:53-63` `EdgeRelationType` |
| **유형 수** | 8개 | **10개** |
| **매핑** | autocomplete, related, temporal, semantic, co_search, derived, question, cluster | search_refinement, search_continuation, topic_exploration, brand_comparison, problem_solution, purchase_journey, serp_overlap, temporal_transition, co_search, semantic |

**수정 이유**: intent-engine의 관계 유형은 **데이터 수집 출처** 기반이었다 (autocomplete에서 왔는지, related에서 왔는지). journey-engine은 **사용자 행동 의미** 기반으로 재정의했다 (검색어 정제인지, 비교 행동인지, 구매 전환인지). `transition-builder.ts:218-249`의 `convertFromIntentLinks()`가 기존 유형을 새 유형으로 매핑한다.

### M4. Centrality 계산 보강

| 항목 | intent-engine | journey-engine |
|---|---|---|
| **파일** | `graph-builder.ts:257-270` `calculateCentrality()` | `journey-graph-builder.ts:92-101` `convertNode()` 내부 |
| **방식** | Degree Centrality (연결 수 / 전체 노드 수) | intent-engine 값 **그대로 보존** + `confidenceLevel` 추가 |
| **확장** | 없음 | centrality > 0.3 → "high", > 0.1 → "medium", else → "low" |

**수정 이유**: 현재 Phase에서는 intent-engine의 centrality 값을 그대로 사용하되, 시각화를 위한 신뢰도 레벨을 추가했다. Phase 3 이후 Betweenness Centrality 등으로 교체 예정.

### M5. 노드 크기 계산 변경

| 항목 | intent-engine | journey-engine |
|---|---|---|
| **파일** | `graph-builder.ts:38-47` `calculateSymbolSize()` | `journey-graph-builder.ts:92-95` `convertNode()` 내부 |
| **범위** | 15~60 (seed=60) | **4~20** |
| **수식** | `log2(volume) * 4 + gapBonus` | `log2(volume) * 2` |

**수정 이유**: intent-engine은 ECharts force-directed 그래프용으로 큰 symbolSize가 필요했다. journey-engine의 `displaySize`는 여정 맵 시각화에 사용되며, 더 작은 범위가 적합하다.

---

## 3. 신규 구현 지점 (New Implementation Points)

journey-engine에서 **완전히 새로 만든** 코드.

### N1. BFS 경로 탐색 (`journey-graph-builder.ts:119-227`)

| 항목 | 내용 |
|---|---|
| **함수** | `extractPaths()` |
| **역할** | 시드 노드에서 BFS로 도달 가능한 경로를 탐색하고, weight 합이 높은 상위 경로를 반환 |
| **기존에 없었던 이유** | intent-engine의 `extractSearchJourney()`(graph-builder.ts:274-348)는 TemporalPhase 간 **집계된 전환 통계**만 생성했다. 개별 키워드를 거치는 **구체적 경로 시퀀스**는 추출하지 않았음 |
| **핵심 로직** | BFS 큐 + 방문 추적, 최대 깊이 5, 양방향 엣지 처리, pathScore 기준 정렬 |

### N2. 분기점 분석 (`journey-graph-builder.ts:253-301`)

| 항목 | 내용 |
|---|---|
| **함수** | `analyzeBranchPoints()` |
| **역할** | 각 노드의 outgoing edge 수를 분석하여 사용자 이탈/분기가 발생하는 지점을 식별 |
| **기존에 없었던 이유** | intent-engine은 **무방향 그래프**이므로 분기/이탈 개념 자체가 없었음 |
| **핵심 출력** | `BranchPoint` 타입 — stepIndex, 대안 경로들, dropOffRate(이탈률 추정) |

### N3. 스테이지 추론 서비스 (`stage-inference.ts` 전체)

| 항목 | 내용 |
|---|---|
| **함수** | `inferStage()`, `buildRoadStages()` |
| **역할** | 개별 키워드를 6단계 RoadStage에 배정하고, 노드 그룹을 스테이지 단위로 집계 |
| **기존에 없었던 이유** | intent-engine은 awareness~advocacy 5단계를 `deriveJourneyStage()`로 단순 매핑했을 뿐, **스테이지 간 전환 분석**이나 **스테이지별 대표 키워드/질문 추출**은 없었음 |
| **핵심 로직** | 4단계 우선순위 추론 (subIntent → intent+phase → 키워드 패턴 → 기본), 한국어 접미사 패턴 20개 (`stage-inference.ts:79-100`) |

### N4. 전환 유형 추론 (`transition-builder.ts:31-51`)

| 항목 | 내용 |
|---|---|
| **함수** | `inferTransitionType()` |
| **역할** | 두 키워드 사이의 **사용자 행동 관점** 전환 유형을 추론 (refinement, broadening, pivot, deepening, comparison, action) |
| **기존에 없었던 이유** | intent-engine의 `determineRelationType()`(graph-builder.ts:67-89)은 데이터 수집 출처 기반이었지, 사용자 행동을 모델링하지 않았음 |

### N5. 방향성 추론 (`transition-builder.ts:61-92`)

| 항목 | 내용 |
|---|---|
| **함수** | `inferDirection()` |
| **역할** | 엣지의 방향 (forward, backward, bidirectional)을 추론 |
| **기존에 없었던 이유** | intent-engine의 `IntentGraphLink`는 **무방향**이었음 (source/target은 있으나 방향 의미 없음) |

### N6. A→B 방향성 경로 탐색 (`pathfinder-service.ts:159-192`)

| 항목 | 내용 |
|---|---|
| **함수** | `findDirectedPaths()` |
| **역할** | 시작 키워드에서 끝 키워드까지의 방향성 경로를 탐색 |
| **기존에 없었던 이유** | intent-engine은 단일 시드 키워드 기반 분석만 지원. "A에서 B로의 여정"이라는 개념이 없었음 |
| **향후 계획** | Phase 3 이후 SERP 데이터 기반 BFS + K-shortest paths로 교체 예정 |

### N7. 스테이지 간 전환 분석 (`stage-inference.ts:225-261`)

| 항목 | 내용 |
|---|---|
| **함수** | `buildTransition()` |
| **역할** | 인접 스테이지 간 cross-edge 수를 분석하여 전환 강도와 의도 변화를 계산 |
| **기존에 없었던 이유** | intent-engine의 `SearchJourney`는 TemporalPhase 간 집계만 제공. 6단계 스테이지 간 전환 모델은 journey-engine의 독자적 설계 |

### N8. Traceability 시스템 (`types.ts:89-104`, `types.ts:411-435`)

| 항목 | 내용 |
|---|---|
| **타입** | `NodeSourceRecord`, `EdgeSourceRecord`, `AnalysisTrace`, `AnalysisTraceStage` |
| **역할** | 모든 노드/엣지/분석 단계에 "이 데이터가 어디서 왔는가?"를 기록 |
| **기존에 없었던 이유** | intent-engine은 시뮬레이션 데이터 기반이라 출처 추적이 불필요했음. 실데이터 연동 후에는 API 호출 이력, 캐시 적중률 등을 추적해야 함 |

---

## 4. 타입 매핑 테이블

### 4.1 노드/엣지 핵심 타입

| intent-engine 타입 | journey-engine 타입 | 매핑 방식 | 비고 |
|---|---|---|---|
| `IntentGraphNode` | `JourneyNode` | 1:1 변환 (`journey-graph-builder.ts:39-109`) | 22개 필드 → 26개 필드 (direction, stepIndex, stage, sources 등 추가) |
| `IntentGraphLink` | `JourneyEdge` | 1:1 변환 (`transition-builder.ts:218-249`) | 4개 필드 → 12개 필드 (direction, transitionType, confidence, source 등 추가) |
| `IntentGraphCategory` | 해당 없음 | 사용 안 함 | ECharts 전용 시각화 타입으로 journey-engine에서 불필요 |
| `IntentGraphData` | `PathfinderResult` | 전체 변환 (`journey-graph-builder.ts:340-457`) | nodes, links, clusters, summary 모두 변환. journey/gapMatrix는 사용 안 함 |

### 4.2 노드 필드 상세 매핑

| IntentGraphNode 필드 | JourneyNode 필드 | 변환 로직 |
|---|---|---|
| `id` (= keyword) | `id` (= `jn-{counter}`) | 새 ID 생성, label에 원본 보존 |
| `name` | `label`, `normalizedLabel` | label = name, normalizedLabel = lowercase trim |
| `intentCategory` | `intent` | 그대로 |
| `subIntent` | `subIntent` | 그대로 |
| `temporalPhase` | `temporalPhase` | 그대로 |
| `searchVolume` | `searchVolume` | 그대로 |
| `gapScore` | `gapScore` | 그대로 |
| `isRising` | `isRising` | 그대로 |
| `isSeed` | `nodeType` = "seed" | boolean → enum 변환 |
| `depth` | `depth`, `stepIndex` | 둘 다 동일 값 |
| `symbolSize` | `displaySize` | 재계산 (범위 축소: 4~20) |
| `category` | 해당 없음 | ECharts 전용, 사용 안 함 |
| `clusterId` | `clusterId` | 그대로 |
| `centrality` | `centrality` + `confidenceLevel` | 값 그대로 + 레벨 추가 |
| `journeyStage` | `journeyStage` | 그대로 (호환) |
| 해당 없음 | `direction` | 신규: before/seed/after 추론 |
| 해당 없음 | `stage` (RoadStageType) | 신규: 6단계 스테이지 추론 |
| 해당 없음 | `sources` | 신규: 출처 추적 배열 |
| 해당 없음 | `evidenceCount` | 신규: 근거 데이터 수 |

### 4.3 엣지 필드 상세 매핑

| IntentGraphLink 필드 | JourneyEdge 필드 | 변환 로직 |
|---|---|---|
| `source` (keyword) | `fromNodeId` (jn-ID) | nodeMap으로 ID 변환 |
| `target` (keyword) | `toNodeId` (jn-ID) | nodeMap으로 ID 변환 |
| `relationshipType` | `relationType` | 유형 체계 변환 (아래 표 참조) |
| `strength` | `weight` | 기존 값 보존 (convertFromIntentLinks에서) |
| 해당 없음 | `direction` | 신규: forward/backward/bidirectional |
| 해당 없음 | `transitionType` | 신규: 사용자 행동 전환 유형 |
| 해당 없음 | `confidence` | 신규: 신뢰도 |
| 해당 없음 | `source` (EdgeSourceRecord) | 신규: 출처 기록 |

### 4.4 RelationshipType → EdgeRelationType 매핑

`transition-builder.ts:230-241`에 정의된 매핑:

| RelationshipType (intent-engine) | sourceType (중간) | EdgeRelationType (journey-engine) |
|---|---|---|
| `autocomplete` | `google_autocomplete` | `search_refinement` |
| `related` | `google_related` | `search_continuation` |
| `question` | `google_paa` | `topic_exploration` |
| `temporal` | `intent_classifier` | 의도 기반 재추론 |
| `semantic` | `intent_classifier` | 의도 기반 재추론 |
| `co_search` | `google_related` | `search_continuation` |
| `cluster` | `cluster_engine` | 의도 기반 재추론 |
| `derived` | `intent_classifier` | 의도 기반 재추론 |

### 4.5 집계 타입 매핑

| intent-engine 타입 | journey-engine 타입 | 관계 |
|---|---|---|
| `KeywordCluster` | `PathfinderCluster` | 구조 변환 (keywords, dominantIntent 보존) |
| `AnalysisSummary` | `PathfinderSummary` | 재생성 (intentDistribution, avgGapScore 등 동일 계산) |
| `SearchJourney` | `JourneyPath[]` | **대체**: 집계 통계 → 개별 경로 시퀀스 |
| `SearchJourneyPath` | `JourneyPathStep[]` | **대체**: phase 간 전환 → 키워드 단위 전환 |
| `ContentGapMatrix` | 해당 없음 | journey-engine에서 미사용 (로드뷰 스테이지가 대체) |
| 해당 없음 | `RoadStage` | 신규: 6단계 소비자 결정 여정 스테이지 |
| 해당 없음 | `BranchPoint` | 신규: 분기점 분석 |
| 해당 없음 | `AnalysisTrace` | 신규: 파이프라인 추적 |

---

## 5. 데이터 흐름도

```
┌─────────────────────────────────────────────────────────────────┐
│  pathfinder-service.ts: analyzePathfinder()                     │
│                                                                 │
│  ┌──────────────────────────────────────────────┐               │
│  │ Step 1: intent-engine 호출                    │               │
│  │                                               │               │
│  │  service.ts:analyze()                         │               │
│  │    ├─ expandKeywords()        (키워드 확장)   │               │
│  │    ├─ aggregateTrends()       (트렌드 집계)   │               │
│  │    ├─ collectSocialVolumes()  (소셜 수집)     │               │
│  │    ├─ classifyKeywords()      (의도 분류)     │               │
│  │    └─ buildIntentGraph()      (그래프 빌드)   │               │
│  │         ├─ detectClusters()   (클러스터링)    │               │
│  │         ├─ calculateCentrality() (중심성)     │               │
│  │         └─ extractSearchJourney() (여정)      │               │
│  │                                               │               │
│  │  출력: IntentGraphData                        │               │
│  │    { nodes, links, clusters, summary,         │               │
│  │      journey, gapMatrix, categories }         │               │
│  └────────────────────┬─────────────────────────┘               │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────┐               │
│  │ Step 2: journey-graph-builder 변환            │               │
│  │                                               │               │
│  │  buildPathfinderFromIntentGraph()             │               │
│  │    ├─ convertNode()           (노드 변환)     │               │
│  │    │    └─ inferStage()       (스테이지 추론) │               │
│  │    ├─ convertFromIntentLinks()(엣지 변환)     │               │
│  │    │    ├─ buildEdge()        (엣지 생성)     │               │
│  │    │    ├─ inferTransitionType() (전환 추론)  │               │
│  │    │    ├─ inferDirection()    (방향 추론)     │               │
│  │    │    └─ calculateEdgeWeight() (가중치)     │               │
│  │    ├─ extractPaths()          (BFS 경로 탐색) │               │
│  │    ├─ analyzeBranchPoints()   (분기점 분석)   │               │
│  │    └─ convertClusters()       (클러스터 변환) │               │
│  │                                               │               │
│  │  출력: PathfinderResult                       │               │
│  │    { nodes, edges, paths, clusters,           │               │
│  │      summary, trace }                         │               │
│  └────────────────────┬─────────────────────────┘               │
│                       │                                          │
└───────────────────────┼──────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│  pathfinder-service.ts: analyzeRoadView()                       │
│                                                                 │
│  ┌──────────────────────────────────────────────┐               │
│  │ Step 3: stage-inference 로드뷰 구축           │               │
│  │                                               │               │
│  │  buildRoadStages(nodes, edges)                │               │
│  │    ├─ inferStage() per node   (스테이지 배정) │               │
│  │    ├─ 스테이지별 그룹핑                       │               │
│  │    ├─ buildSingleStage()      (스테이지 생성) │               │
│  │    │    ├─ 대표 키워드 추출 (상위 10)         │               │
│  │    │    ├─ dominant intent 계산               │               │
│  │    │    └─ 질문형 키워드 추출                 │               │
│  │    └─ buildTransition()       (전환 분석)     │               │
│  │                                               │               │
│  │  출력: RoadStage[]                            │               │
│  └────────────────────┬─────────────────────────┘               │
│                       │                                          │
│  ┌────────────────────▼─────────────────────────┐               │
│  │ Step 4: 로드뷰 결과 조합                      │               │
│  │                                               │               │
│  │  ├─ findDirectedPaths()  (A→B 경로, 선택적)   │               │
│  │  ├─ 요약 생성 (topContentGaps, topQuestions)  │               │
│  │  └─ trace 정보 병합                           │               │
│  │                                               │               │
│  │  출력: RoadViewResult                         │               │
│  │    { stages, primaryPath, alternativePaths,   │               │
│  │      branchPoints, summary, trace }           │               │
│  └──────────────────────────────────────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 데이터 볼륨 변화

| 단계 | 입력 | 출력 | 비고 |
|---|---|---|---|
| intent-engine analyze() | seedKeyword 1개 | ~150 ClassifiedKeyword | maxKeywords 기본값 150 |
| buildIntentGraph() | ~150 keywords | ~150 nodes, ~200 links, ~10 clusters | 고립 노드도 seed에 연결 |
| buildPathfinderFromIntentGraph() | IntentGraphData | ~150 JourneyNode, ~200 JourneyEdge, ~10 paths | BFS로 상위 10개 경로 |
| buildRoadStages() | PathfinderResult | 최대 6개 RoadStage | 키워드 없는 스테이지는 생략 |
| analyzeRoadView() | PathfinderResult + RoadStage[] | RoadViewResult | 최종 결과 |

---

## 6. 향후 분리 계획

### 현재 상태: intent-engine 의존

```
journey-engine ──import──→ intent-engine/types.ts    (타입 의존)
journey-engine ──import──→ intent-engine/service.ts   (런타임 의존)
```

`pathfinder-service.ts:47-56`에서 intent-engine의 `analyze()`를 **동적 import**로 호출하고 있으며, 이는 현재 journey-engine이 intent-engine 없이는 동작할 수 없음을 의미한다.

### Phase 3 (SERP 엔진) 이후 분리 계획

#### 단계 1: 타입 독립화

| 작업 | 현재 | 목표 |
|---|---|---|
| 공통 타입 추출 | journey-engine이 intent-engine에서 import | `shared/types.ts`로 공통 타입 분리, 양쪽에서 import |
| 대상 타입 | IntentCategory, SubIntent, TemporalPhase, SearchJourneyStage | 동일 |
| IntentGraphData 의존 제거 | PathfinderRequest.existingAnalysis 필드 | 자체 입력 타입 정의 (SERPData, KeywordData 등) |

#### 단계 2: 데이터 수집 독립화

| 작업 | 현재 | 목표 |
|---|---|---|
| 키워드 수집 | intent-engine의 keyword-expander 사용 | SERP 기반 키워드 수집 파이프라인 독자 구현 |
| 의도 분류 | intent-engine의 intent-classifier 사용 | SERP 스니펫 기반 의도 추론 (LLM 활용) |
| 볼륨 데이터 | intent-engine의 social-volume-collector 사용 | SERP 순위 + CTR 기반 볼륨 추정 |

#### 단계 3: 그래프 빌드 독립화

| 작업 | 현재 | 목표 |
|---|---|---|
| 클러스터링 | intent-engine 결과 재사용 | SERP overlap 기반 클러스터링 (serp_overlap 관계 활용) |
| 중심성 | intent-engine Degree Centrality 보존 | Betweenness Centrality 독자 계산 |
| 경로 탐색 | BFS (journey-graph-builder.ts) | K-shortest paths + SERP 데이터 기반 가중치 |

#### 단계 4: 파이프라인 전환

```
[현재]
pathfinder-service ──→ intent-engine.analyze() ──→ journey-graph-builder

[목표]
pathfinder-service ──→ serp-collector ──→ journey-graph-builder (v2)
                                     ──→ serp-cluster-engine
                                     ──→ serp-intent-classifier
```

#### 분리 시 유지할 것

- **타입 호환성**: 기존 IntentGraphData를 입력으로 받는 경로는 유지 (existingAnalysis 필드)
- **클러스터링 알고리즘**: Louvain-inspired 알고리즘의 코어 로직은 공유 라이브러리로 추출
- **스테이지 추론 규칙**: `SUBINTENT_TO_STAGE`, `KEYWORD_STAGE_PATTERNS`는 설정 파일로 외부화

#### 분리 시 제거할 것

- `pathfinder-service.ts:47-56`의 intent-engine 동적 import
- `journey-graph-builder.ts:12`의 IntentGraphNode/IntentGraphLink import
- `transition-builder.ts:218-249`의 `convertFromIntentLinks()` 함수 (기존 유형 변환 불필요)

---

## 관련 파일 목록

| 파일 | 역할 |
|---|---|
| `apps/web/src/lib/intent-engine/types.ts` | intent-engine 핵심 타입 |
| `apps/web/src/lib/intent-engine/service.ts` | intent-engine 파이프라인 오케스트레이터 |
| `apps/web/src/lib/intent-engine/graph/graph-builder.ts` | intent-engine 그래프 빌더 |
| `apps/web/src/lib/journey-engine/types.ts` | journey-engine 핵심 타입 |
| `apps/web/src/lib/journey-engine/graph/journey-graph-builder.ts` | IntentGraphData → PathfinderResult 브릿지 |
| `apps/web/src/lib/journey-engine/builders/transition-builder.ts` | 엣지 생성 및 전환 분석 |
| `apps/web/src/lib/journey-engine/builders/stage-inference.ts` | 6단계 로드뷰 스테이지 추론 |
| `apps/web/src/lib/journey-engine/services/pathfinder-service.ts` | 패스파인더/로드뷰 진입점 |
