# Journey Graph 데이터 모델

> 작성일: 2026-03-13
> 목적: 패스파인더(Pathfinder)와 로드뷰(Road View)가 공유하는 Journey Graph 데이터 모델의 전체 구조, 필드 정의, 계산 공식, 출처 추적, 저장/조회 패턴을 기술하는 기술 레퍼런스

---

## 목차

1. [노드(Node) 구조](#1-노드node-구조)
2. [엣지(Edge) 구조](#2-엣지edge-구조)
3. [경로(Path) 구조](#3-경로path-구조)
4. [스테이지(Stage) 구조](#4-스테이지stage-구조)
5. [그래프 전체 구조](#5-그래프-전체-구조)
6. [추적성(Traceability)](#6-추적성traceability)
7. [저장/조회 구조](#7-저장조회-구조)
8. [확장 계획](#8-확장-계획)

---

## 1. 노드(Node) 구조

### 1.1 JourneyNode 전체 필드

검색 여정 그래프의 최소 단위. 하나의 노드는 하나의 검색어(키워드)를 나타낸다.

```typescript
interface JourneyNode {
  // ─── 식별 ───
  id: string;                          // 유니크 ID (예: "jn-1", "jn-42")
  label: string;                       // 원본 검색어 텍스트 (예: "화장품 추천")
  normalizedLabel: string;             // 소문자/공백 정규화된 키워드
  nodeType: JourneyNodeType;           // 노드 유형 (아래 1.2 참조)

  // ─── 위치 & 단계 ───
  depth: number;                       // 시드로부터의 거리 (0 = 시드, 최대 9)
  direction: "before" | "seed" | "after"; // 시드 기준 시간적 방향
  stepIndex: number;                   // 경로 내 순서 인덱스 (0~9)
  stage?: RoadStageType;               // 로드뷰 스테이지 (선택, 아래 4장 참조)
  clusterId?: string;                  // 소속 클러스터 ID

  // ─── 분류 ───
  intent: IntentCategory;              // 검색 의도: discovery | comparison | action | troubleshooting | unknown
  subIntent?: SubIntent;               // 세부 의도: definition | how_to | list | review | versus | price | purchase 등 15종
  temporalPhase: TemporalPhase;        // 시간적 위상: before | current | after
  journeyStage?: SearchJourneyStage;   // 기존 intent-engine의 여정 단계 (호환용)

  // ─── 정량 지표 ───
  searchVolume: number;                // 월간 검색량
  gapScore: number;                    // 콘텐츠 갭 점수 (0-100, 높을수록 기회)
  isRising: boolean;                   // 상승 키워드 여부
  centrality: number;                  // 그래프 중심성 (0-1)
  evidenceCount: number;               // 이 노드를 뒷받침하는 근거 데이터 수

  // ─── 출처 추적 ───
  sources: NodeSourceRecord[];         // 이 노드가 발견된 출처 목록 (아래 1.4 참조)

  // ─── 시각화 힌트 ───
  displaySize: number;                 // 노드 크기 (로그 스케일, 4~20)
  confidenceLevel: "low" | "medium" | "high"; // 신뢰도 수준

  // ─── 확장 ───
  metadata?: Record<string, unknown>;  // 임의 메타데이터
}
```

### 1.2 nodeType별 의미

| nodeType | 의미 | 생성 조건 |
|----------|------|----------|
| `seed` | 시드(중심) 키워드 — 분석의 출발점 | `isSeed === true` 또는 `name === seedKeyword` |
| `keyword` | 일반 연관 키워드 | 시드에서 파생된 자동완성/연관 검색어 |
| `question` | 질문형 검색어 | `?`, `어떻`, `왜`, `어디`, `언제`, `how`, `what`, `why` 패턴 매칭 |
| `brand` | 브랜드명 | 브랜드 사전 매칭 (Phase 3 이후) |
| `topic` | 토픽/클러스터 대표 | 클러스터 센트로이드 (Phase 3 이후) |
| `stage_anchor` | 스테이지 앵커 | 로드뷰에서 스테이지 대표 키워드로 지정 |

### 1.3 direction / stage / intent 분류 체계

```
direction (시간적 위치)
├── before  : 시드 키워드 검색 전에 탐색하는 키워드
├── seed    : 중심 키워드 자체
└── after   : 시드 키워드 검색 후 이어서 탐색하는 키워드

intent (검색 의도)
├── discovery        : 정보 탐색 ("~이란", "~방법")
├── comparison       : 비교/리뷰 ("~vs", "~추천")
├── action           : 구매/행동 ("~구매", "~신청")
├── troubleshooting  : 문제 해결 ("~오류", "~해결")
└── unknown          : 분류 불가

stage (로드뷰 6단계, 아래 4장에서 상세)
awareness → interest → comparison → decision → action → advocacy
```

direction 결정 로직:

```
isSeed = true          → "seed"
temporalPhase = before → "before"
그 외                  → "after"
```

### 1.4 NodeSourceRecord (출처 추적)

```typescript
interface NodeSourceRecord {
  type: NodeSourceType;       // 데이터 수집 출처
  parentKeyword: string | null; // 어떤 키워드에서 파생되었는지 (시드이면 null)
  collectedAt: string;        // ISO 8601 수집 시각
  confidence: number;         // 신뢰도 (0-1, 시드는 1.0)
  rawSnippet?: string;        // 원본 텍스트 (디버깅용, 선택)
}
```

| NodeSourceType | 의미 | 현재 상태 |
|----------------|------|----------|
| `google_autocomplete` | Google 자동완성 | Phase 1부터 실데이터 |
| `google_related` | Google 연관 검색어 | Phase 1부터 실데이터 |
| `google_paa` | Google People Also Ask | Phase 3부터 |
| `naver_autocomplete` | 네이버 자동완성 | Phase 1부터 실데이터 |
| `naver_related` | 네이버 연관 검색어 | Phase 1부터 실데이터 |
| `serp_suggestion` | SERP 제안 키워드 | Phase 3부터 |
| `intent_classifier` | 의도 분류기 추론 | 현재 사용 중 |
| `cluster_engine` | 클러스터 엔진 추론 | 현재 사용 중 |
| `manual` | 수동 입력 (시드) | 현재 사용 중 |
| `mock` | 시뮬레이션 데이터 | Phase 0 전용 |

### 1.5 displaySize 계산 공식

```typescript
displaySize = clamp(4, 20, log2(max(1, searchVolume)) * 2)
```

### 1.6 confidenceLevel 결정

```typescript
centrality > 0.3  → "high"
centrality > 0.1  → "medium"
그 외             → "low"
```

---

## 2. 엣지(Edge) 구조

### 2.1 JourneyEdge 전체 필드

두 노드 사이의 방향성 있는 연결. "이 검색어에서 저 검색어로 이어진다"는 관계를 나타낸다.

```typescript
interface JourneyEdge {
  // ─── 식별 ───
  id: string;                          // 유니크 ID (예: "edge-1")
  fromNodeId: string;                  // 출발 노드 ID
  toNodeId: string;                    // 도착 노드 ID

  // ─── 관계 ───
  relationType: EdgeRelationType;      // 관계 유형 (아래 2.2 참조)
  direction: EdgeDirection;            // 방향 (아래 2.3 참조)
  transitionType: TransitionType;      // 전환 유형 (아래 2.4 참조)

  // ─── 강도 ───
  weight: number;                      // 연결 강도 (0-1)
  frequency?: number;                  // 추정 전환 빈도
  confidence: number;                  // 신뢰도 (0-1)
  evidenceCount: number;               // 근거 데이터 수

  // ─── 출처 추적 ───
  source: EdgeSourceRecord;            // 출처 기록 (아래 2.6 참조)

  // ─── 확장 ───
  metadata?: Record<string, unknown>;
}
```

### 2.2 relationType (관계 유형)

| relationType | 의미 | 추론 조건 |
|-------------|------|----------|
| `search_refinement` | 검색어 수정 (자동완성 기반) | source = google/naver_autocomplete |
| `search_continuation` | 검색 이어하기 (연관 검색어 기반) | source = google/naver_related |
| `topic_exploration` | 토픽 탐색 (PAA 기반) | source = google_paa |
| `brand_comparison` | 브랜드 비교 | to.intent = comparison 또는 to.subIntent = versus |
| `problem_solution` | 문제 → 해결 | from/to.intent = troubleshooting |
| `purchase_journey` | 구매 여정 전환 | to.intent = action |
| `serp_overlap` | SERP 결과 공유 | source = serp_suggestion |
| `temporal_transition` | 시간적 전환 (before→after) | from.temporalPhase !== to.temporalPhase |
| `co_search` | 함께 검색된 키워드 | (Phase 3 이후) |
| `semantic` | 의미적 유사성 (기본값) | 위 어느 조건에도 해당하지 않을 때 |

추론 우선순위: **source type 기반 > 의도 기반 > 시간적 전환 > 기본값(semantic)**

### 2.3 direction (방향)

| direction | 의미 | 추론 조건 |
|-----------|------|----------|
| `forward` | 순방향 (from → to) | before→seed, seed→after, 또는 autocomplete 기반 |
| `backward` | 역방향 (to → from) | (현재 명시적 생성 없음, 분석 시 사용) |
| `bidirectional` | 양방향 | 연관 검색어(related) 기반, 또는 기본값 |

추론 로직 요약:

```
from=before, to=seed/after → forward
from=seed, to=after        → forward
source=autocomplete        → forward (검색어 정제는 단방향)
source=related             → bidirectional (연관 검색어는 양방향)
기본값                     → bidirectional
```

### 2.4 transitionType (전환 유형, 사용자 행동 관점)

| transitionType | 의미 | 추론 조건 |
|---------------|------|----------|
| `refinement` | 검색어 정제 (더 구체적으로) | 같은 intent, 같은 depth |
| `broadening` | 범위 확대 (더 넓게) | 같은 intent, depth 감소 |
| `deepening` | 심화 (같은 주제 더 깊이) | 같은 intent, depth 증가 |
| `comparison` | 비교 (대안 탐색) | 다른 intent, to.intent = comparison |
| `action` | 행동 전환 (정보→구매) | 다른 intent, to.intent = action |
| `pivot` | 방향 전환 (다른 주제로) | 다른 intent, 위 두 조건에 해당하지 않을 때 |
| `unknown` | 판단 불가 | (폴백) |

추론 우선순위:

```
의도 전환 (intent 다름):
  to.intent = action      → "action"
  to.intent = comparison  → "comparison"
  그 외                   → "pivot"

의도 동일 (intent 같음):
  depth 증가 (depthDelta > 0) → "deepening"
  depth 감소 (depthDelta < 0) → "broadening"
  depth 동일                  → "refinement"
```

### 2.5 weight 계산 공식

엣지 강도는 다음 요소의 가중합으로 계산된다:

```
weight = 기본값(0.3)
       + 의도 일치 보너스(0.2)       if from.intent === to.intent
       + 위상 일치 보너스(0.15)      if from.temporalPhase === to.temporalPhase
       + 검색량 비율 보너스(0~0.15)  min(volA, volB) / max(volA, volB) * 0.15
       + 클러스터 일치 보너스(0.1)   if from.clusterId === to.clusterId
       + 방향 순서 보너스(0.1)       if dirOrder[from] < dirOrder[to]

최종: clamp(0, 1.0, round(weight * 1000) / 1000)
```

방향 순서: `before=0, seed=1, after=2`

| 구성 요소 | 최대 기여 | 조건 |
|----------|----------|------|
| 기본값 | 0.30 | 항상 |
| 의도 일치 | +0.20 | intent 동일 |
| 위상 일치 | +0.15 | temporalPhase 동일 |
| 검색량 비율 | +0.15 | 두 노드의 검색량이 비슷할수록 높음 |
| 클러스터 일치 | +0.10 | 같은 클러스터 소속 |
| 방향 순서 | +0.10 | before→seed→after 순서가 맞을 때 |
| **이론적 최대** | **1.00** | |

> **참고:** `convertFromIntentLinks()`로 기존 intent-engine 엣지를 변환할 때는 기존 `strength` 값을 `weight`에 덮어쓴다 (기존 강도 보존).

### 2.6 EdgeSourceRecord (출처 추적)

```typescript
interface EdgeSourceRecord {
  type: NodeSourceType;          // 엣지 발견 출처 (NodeSourceType과 동일 enum 사용)
  confidence: number;            // 신뢰도 (0-1)
  collectedAt: string;           // ISO 8601 수집 시각
  evidenceKeywords?: string[];   // 근거가 되는 키워드들 (선택)
}
```

---

## 3. 경로(Path) 구조

### 3.1 JourneyPath

시드 키워드에서 출발하는 하나의 검색 경로 시퀀스. BFS 탐색으로 추출된다.

```typescript
interface JourneyPath {
  id: string;                          // 경로 ID (예: "path-1")
  seedKeyword: string;                 // 시드 키워드

  steps: JourneyPathStep[];            // 경로를 구성하는 단계들
  pathScore: number;                   // 경로 총 점수 (step weight 합)
  intentFlow: IntentCategory[];        // 의도 흐름 (예: [discovery, comparison, action])
  pathType: "linear" | "branching" | "circular" | "convergent";
  pathLabel: string;                   // 경로 요약 (예: "화장품 → 화장품 추천 → 올리브영")
  dominantIntent: IntentCategory;      // 경로 내 최빈 의도
  totalSteps: number;                  // 총 단계 수
}
```

### 3.2 JourneyPathStep

```typescript
interface JourneyPathStep {
  stepIndex: number;                   // 단계 인덱스 (0 = 시작)
  keyword: string;                     // 키워드
  nodeId: string;                      // 노드 ID
  direction: "before" | "seed" | "after";
  transitionWeight: number;            // 이전 단계에서 이 단계로의 전환 강도
  transitionType: TransitionType;      // 전환 유형
  intent: IntentCategory;              // 이 단계의 의도
}
```

### 3.3 pathType 분류

| pathType | 의미 | 분류 기준 |
|----------|------|----------|
| `linear` | 직선형 경로 | before → seed → after 방향이 포함되거나, 4단계 이하 |
| `branching` | 분기형 경로 | 4단계 초과이며, before/after 모두 포함하지 않는 경우 |
| `circular` | 순환형 경로 | (예약됨 — 같은 노드를 재방문하는 경로) |
| `convergent` | 수렴형 경로 | (예약됨 — 여러 경로가 하나로 합쳐지는 패턴) |

현재 구현에서는 `linear`과 `branching`만 실제 분류된다.

### 3.4 pathScore 계산

```
pathScore = sum(step.transitionWeight for step in steps)
```

- 시드 노드(첫 step)의 transitionWeight는 1.0 (고정)
- 이후 step은 해당 edge의 weight 값을 사용
- 점수가 높을수록 강한(빈번한) 경로

### 3.5 intentFlow

경로 내 각 step의 intent를 순서대로 나열한 배열.

```
예시: ["discovery", "discovery", "comparison", "action"]
 → 정보 탐색에서 비교를 거쳐 구매로 이어지는 전형적인 구매 여정
```

### 3.6 경로 추출 알고리즘

```
입력: seedNode, nodes[], edges[]
방법: BFS (너비 우선 탐색)
제약:
  - 최대 탐색 깊이: 5
  - 최소 경로 길이: 2 (시드 + 1개 이상)
  - 경로 기록 조건: 리프 노드이거나 3단계 이상 도달 시
  - 양방향 엣지(bidirectional)는 역방향도 탐색
  - 같은 노드 재방문 불가 (visited set)
정렬: pathScore 내림차순
출력: 상위 maxPaths개 (기본 10개)
```

---

## 4. 스테이지(Stage) 구조

### 4.1 RoadStage 6단계 모델

소비자 결정 여정을 6단계로 모델링한다.

```
  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
  │ 인지    │──▶│ 관심    │──▶│ 비교    │──▶│ 결정    │──▶│ 실행    │──▶│ 옹호    │
  │awareness│   │interest │   │comparison│  │decision │   │ action  │   │advocacy │
  │ #8b5cf6 │   │ #3b82f6 │   │ #f59e0b │   │ #10b981 │   │ #ef4444 │   │ #06b6d4 │
  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

| order | stageType | label | 대표 키워드 패턴 | 색상 |
|-------|-----------|-------|----------------|------|
| 0 | `awareness` | 인지 | "~이란", "~뜻", "~의미", "~종류" | #8b5cf6 (보라) |
| 1 | `interest` | 관심 | "~추천", "~방법", "~하는 법", "~팁" | #3b82f6 (파랑) |
| 2 | `comparison` | 비교 | "~vs", "~비교", "~순위", "~리뷰" | #f59e0b (앰버) |
| 3 | `decision` | 결정 | "~가격", "~비용", "~할인", "~선택" | #10b981 (초록) |
| 4 | `action` | 실행 | "~구매", "~신청", "~가입", "~설치" | #ef4444 (빨강) |
| 5 | `advocacy` | 옹호 | "~후기", "~경험", "~환불", "~에러" | #06b6d4 (시안) |

### 4.2 RoadStage 전체 필드

```typescript
interface RoadStage {
  id: string;                          // 예: "stage-awareness-1"
  stageType: RoadStageType;
  label: string;                       // 한국어 라벨 ("인지", "비교" 등)
  description: string;                 // 자동 생성 설명문
  order: number;                       // 순서 (1부터 시작)

  // ─── 콘텐츠 ───
  representativeKeywords: string[];    // 검색량 상위 10개 키워드
  dominantIntent: IntentCategory;      // 이 스테이지의 최빈 의도
  majorQuestions: string[];            // 질문형 키워드 상위 5개
  relatedClusterIds: string[];         // 관련 클러스터 ID들

  // ─── 정량 지표 ───
  keywordCount: number;                // 스테이지에 속한 키워드 수
  avgSearchVolume: number;             // 평균 검색량
  avgGapScore: number;                 // 평균 갭 점수

  // ─── 전환 ───
  nextTransition?: StageTransition;    // 다음 스테이지로의 전환 정보

  // ─── 추적성 ───
  evidenceNodeIds: string[];           // 이 스테이지를 구성하는 JourneyNode ID들
}
```

### 4.3 StageTransition (전환 정보)

```typescript
interface StageTransition {
  toStageId: string;                   // 다음 스테이지 ID
  strength: number;                    // 전환 강도 (0-1)
  reason: string;                      // 전환 설명 (예: "인지에서 관심으로 전환 (5개 연결)")
  intentShift: {
    from: IntentCategory;              // 출발 스테이지의 dominant intent
    to: IntentCategory;                // 도착 스테이지의 dominant intent
  };
  transitionKeywords: string[];        // 전환에 관련된 키워드들 (최대 5개)
}
```

전환 강도(strength) 계산 공식:

```
crossEdgeCount = (fromStage 노드 → toStage 노드) 사이의 엣지 수
maxPossibleEdges = fromStage.keywordCount * toStage.keywordCount

strength = clamp(0, 1.0, crossEdgeCount / sqrt(maxPossibleEdges))

엣지가 없으면 기본값 0.5
```

### 4.4 스테이지 추론 우선순위

개별 키워드(JourneyNode)에 스테이지를 할당하는 4단계 추론:

```
우선순위 1: subIntent 기반 (가장 정밀)
  ├── definition     → awareness
  ├── how_to         → interest
  ├── list           → interest
  ├── tutorial       → interest
  ├── review         → comparison
  ├── versus         → comparison
  ├── alternative    → comparison
  ├── price          → decision
  ├── purchase       → action
  ├── signup         → action
  ├── trend          → awareness
  ├── experience     → advocacy
  ├── error_fix      → advocacy
  └── refund         → advocacy

우선순위 2: intent + temporalPhase 조합
  ├── phase=before + intent=discovery       → awareness
  ├── phase=before + intent=comparison      → interest
  ├── phase=before + 그 외                  → awareness
  ├── phase=after  + intent=action          → action
  ├── phase=after  + intent=troubleshooting → advocacy
  └── phase=after  + 그 외                  → advocacy

우선순위 3: 키워드 패턴 매칭 (한국어 정규식)
  ├── /이란|뜻|의미|정의|개념|what is/  → awareness
  ├── /종류|유형|분류|카테고리/         → awareness
  ├── /추천|방법|하는 법|how to|팁/     → interest
  ├── /장점|단점|특징|효과|효능/        → interest
  ├── /vs|비교|차이|versus|대안/        → comparison
  ├── /순위|랭킹|top|베스트/            → comparison
  ├── /리뷰|후기|평가|사용기/           → comparison
  ├── /가격|비용|요금|할인|쿠폰/        → decision
  ├── /선택|고르는|고르기/              → decision
  ├── /구매|주문|신청|가입|등록/        → action
  ├── /다운로드|설치|시작/              → action
  ├── /후기|경험|결과|성공|실패/        → advocacy
  ├── /환불|반품|취소|해지|탈퇴/        → advocacy
  └── /에러|오류|문제|해결|fix/         → advocacy

우선순위 4: intent 기본 매핑 (폴백)
  ├── discovery        → awareness
  ├── comparison       → comparison
  ├── action           → action
  ├── troubleshooting  → decision
  └── unknown          → interest (기본값)
```

### 4.5 RoadStage 빌드 프로세스

```
입력: JourneyNode[], JourneyEdge[]

1. 각 노드에 스테이지 추론 (inferStage)
2. 스테이지별 노드 그룹핑 (Map<RoadStageType, JourneyNode[]>)
3. ROAD_STAGE_ORDER 순서대로 RoadStage 객체 생성
   - 키워드가 0개인 스테이지는 생략
   - representativeKeywords: 검색량 상위 10개
   - dominantIntent: 최빈 의도
   - majorQuestions: 질문형 노드 상위 5개
   - avgSearchVolume/avgGapScore: 노드 평균
4. 인접 스테이지 간 StageTransition 생성
   - 크로스 엣지 수로 strength 계산

출력: RoadStage[] (최대 6개, 빈 스테이지 제외)
```

---

## 5. 그래프 전체 구조

### 5.1 PathfinderResult

패스파인더 분석의 최종 결과물.

```typescript
interface PathfinderResult {
  seedKeyword: string;
  nodes: JourneyNode[];              // 최대 1,000개
  edges: JourneyEdge[];              // 방향성 있는 연결
  paths: JourneyPath[];              // 상위 10개 경로
  clusters: PathfinderCluster[];     // 키워드 클러스터
  summary: PathfinderSummary;        // 분포, 블루오션, 분기점
  trace: AnalysisTrace;              // 분석 추적 정보
}
```

### 5.2 RoadViewResult

로드뷰 분석의 최종 결과물.

```typescript
interface RoadViewResult {
  seedKeyword: string;
  endKeyword?: string;               // A→B 모드일 때

  stages: RoadStage[];               // 6단계 여정 (빈 스테이지 제외)
  primaryPath?: JourneyPath;         // A→B 최단 경로
  alternativePaths?: JourneyPath[];  // 대안 경로 (최대 5개)
  branchPoints: BranchPoint[];       // 분기점 분석
  summary: RoadViewSummary;
  trace: AnalysisTrace;
}
```

### 5.3 노드-엣지-경로-스테이지 관계도

```
PathfinderResult
├── nodes: JourneyNode[]
│   ├── node.id ──────────────────────┐
│   ├── node.stage ──────────────────┐│
│   └── node.clusterId ─────────────┐││
│                                   │││
├── edges: JourneyEdge[]            │││
│   ├── edge.fromNodeId ────────────┼┼┘  (노드 참조)
│   ├── edge.toNodeId ──────────────┼┘
│   └── edge.weight ────────────────┼─── pathScore에 합산
│                                   │
├── paths: JourneyPath[]            │
│   └── steps[].nodeId ─────────────┘    (노드 참조)
│                                   │
├── clusters: PathfinderCluster[]   │
│   └── cluster.nodeIds ────────────┘    (노드 참조)
│
└── summary: PathfinderSummary
    ├── intentDistribution   ← nodes 집계
    └── stageDistribution    ← nodes.stage 집계


RoadViewResult
├── stages: RoadStage[]
│   ├── stage.evidenceNodeIds ──── nodes 참조
│   ├── stage.nextTransition ───── 다음 stage 참조
│   └── stage.relatedClusterIds ── clusters 참조
│
├── primaryPath / alternativePaths
│   └── path.steps[].nodeId ────── nodes 참조
│
└── branchPoints: BranchPoint[]
    └── branchPoint.stepIndex ──── nodes.depth와 대응
```

### 5.4 BranchPoint (분기점)

```typescript
interface BranchPoint {
  stepIndex: number;       // 분기가 발생하는 단계 인덱스
  keyword: string;         // 분기 키워드
  alternatives: {          // 대안 경로들
    keyword: string;
    weight: number;
    intent: IntentCategory;
  }[];
  dropOffRate: number;     // 이탈률 추정 (0-1)
}
```

이탈률(dropOffRate) 계산:

```
totalWeight = sum(alternatives[].weight)
maxWeight   = max(alternatives[].weight)

dropOffRate = (totalWeight - maxWeight) / totalWeight
```

분기점 탐지 조건:
- outgoing edge가 2개 이상인 노드
- backward 방향 엣지는 제외
- alternatives 수 내림차순 정렬, 상위 10개 반환

### 5.5 Summary 구조

```typescript
// 패스파인더 요약
interface PathfinderSummary {
  totalNodes: number;
  totalEdges: number;
  totalPaths: number;
  totalClusters: number;
  maxDepth: number;
  avgGapScore: number;
  topBlueOceans: { keyword: string; gapScore: number }[];    // gapScore > 60, 상위 5개
  topBranchPoints: BranchPoint[];                             // 상위 5개
  intentDistribution: Record<IntentCategory, number>;         // 의도별 키워드 수
  stageDistribution: Record<RoadStageType, number>;           // 스테이지별 키워드 수
  analyzedAt: string;
  durationMs: number;
}

// 로드뷰 요약
interface RoadViewSummary {
  totalStages: number;
  totalKeywords: number;
  dominantJourney: RoadStageType[];                           // 주요 여정 흐름
  avgGapScore: number;
  topContentGaps: { stage: RoadStageType; keyword: string; gapScore: number }[];
  topQuestions: string[];
  analyzedAt: string;
  durationMs: number;
}
```

### 5.6 데이터 흐름 종합

```
[사용자 입력: 시드 키워드]
        │
        ▼
[intent-engine 분석 파이프라인]
  expandKeywords() → classifyKeywords() → buildIntentGraph()
        │
        ▼
[IntentGraphData]  ← 기존 결과 형식
        │
        ▼
[journey-graph-builder.ts]  ← 브릿지 레이어
  │
  ├── convertNode()           : IntentGraphNode → JourneyNode
  ├── convertFromIntentLinks(): IntentGraphLink → JourneyEdge
  ├── extractPaths()          : BFS 경로 추출
  ├── analyzeBranchPoints()   : 분기점 분석
  └── convertClusters()       : 클러스터 변환
        │
        ├──────────────────────┐
        ▼                      ▼
[PathfinderResult]     [stage-inference.ts]
  nodes + edges          │
  paths + clusters       ├── inferStage()      : 노드별 스테이지 추론
  summary + trace        └── buildRoadStages() : RoadStage[] 생성
                               │
                               ▼
                         [RoadViewResult]
                           stages + paths
                           branchPoints
                           summary + trace
```

---

## 6. 추적성(Traceability)

### 6.1 설계 원칙

Journey Graph의 모든 데이터 포인트는 **"이 데이터가 어디서 왔는가?"**를 역추적할 수 있어야 한다.

```
추적 계층:

[그래프 수준]  AnalysisTrace           ← 분석 전체의 실행 이력
  └── [노드 수준]  NodeSourceRecord[]  ← 각 노드의 수집 출처
  └── [엣지 수준]  EdgeSourceRecord    ← 각 엣지의 근거
  └── [스테이지 수준] evidenceNodeIds  ← 스테이지를 구성하는 노드 ID들
```

### 6.2 AnalysisTrace

분석 실행 전체를 추적하는 최상위 구조.

```typescript
interface AnalysisTrace {
  analysisId: string;          // 고유 ID (예: "pf-1710288000000")
  startedAt: string;           // 분석 시작 시각 (ISO 8601)
  completedAt: string;         // 분석 완료 시각
  stages: AnalysisTraceStage[];// 분석 단계별 실행 이력
  dataSources: {               // 데이터 소스별 통계
    source: string;            //   소스명 (예: "intent_engine", "google_autocomplete")
    callCount: number;         //   API 호출 횟수
    cacheHitRate: number;      //   캐시 적중률 (0-1)
    avgLatencyMs: number;      //   평균 지연시간
  }[];
}

interface AnalysisTraceStage {
  name: string;                // 단계명 (예: "convert_nodes", "extract_paths")
  startedAt: string;
  completedAt: string;
  inputCount: number;          // 입력 데이터 수
  outputCount: number;         // 출력 데이터 수
  apiCallCount: number;        // API 호출 횟수
  cacheHitCount: number;       // 캐시 적중 횟수
  errorCount: number;          // 에러 발생 횟수
}
```

### 6.3 각 데이터의 출처 추적 방법

| 추적 대상 | 추적 필드 | 역추적 경로 |
|----------|----------|------------|
| **노드** | `sources: NodeSourceRecord[]` | 노드 → 수집 출처(type) → 부모 키워드(parentKeyword) → 수집 시각 |
| **엣지** | `source: EdgeSourceRecord` | 엣지 → 수집 출처(type) → 근거 키워드(evidenceKeywords) → 신뢰도 |
| **스테이지** | `evidenceNodeIds: string[]` | 스테이지 → 구성 노드 ID → 각 노드의 sources 확인 |
| **경로** | `steps[].nodeId` | 경로 → 각 step의 nodeId → 해당 노드의 sources 확인 |
| **분석 전체** | `trace.dataSources` | 전체 결과 → 어떤 데이터 소스를 몇 번 호출했는지, 캐시 적중률 |

### 6.4 신뢰도 정책

| 조건 | confidence 값 |
|------|-------------|
| 시드 키워드 | 1.0 |
| depth=1 (자동완성) | 0.7 (기본) |
| depth>=2 (연관 검색어) | 0.7 (기본) |
| 기존 intent-engine 변환 | 기존 strength 값 보존 |
| 복수 출처에서 발견된 노드 | evidenceCount 증가로 반영 |

---

## 7. 저장/조회 구조

### 7.1 Prisma 스키마와의 매핑

현재 Journey Graph는 기존 Prisma 모델을 확장 사용한다.

```
Journey Graph 타입              Prisma 모델               매핑 방식
──────────────────────────────────────────────────────────────────────
JourneyNode                  → IntentKeywordResult       1:1 (키워드 단위)
JourneyEdge                  → SearchPath                1:1 (from→to 경로)
PathfinderCluster            → KeywordClusterResult      1:1 (클러스터)
PathfinderResult 전체         → IntentQuery.resultGraph   JSON 필드에 전체 저장
RoadStage                    → (IntentQuery.resultGraph)  JSON 필드 내 포함
Persona                      → Persona                   로드뷰 스테이지와 연계
BrandJourney                 → BrandJourney              로드뷰 경쟁 분석
```

### 7.2 현재 DB 저장 전략

**전략: 하이브리드 (구조화 + JSON)**

```
┌──────────────────────────────────────────────────┐
│ IntentQuery (분석 세션)                           │
│  ├── resultGraph: Json       ← 전체 그래프 JSON  │
│  │   (PathfinderResult 또는 RoadViewResult)       │
│  ├── resultSummary: Json     ← 요약 JSON         │
│  ├── status, progress, durationMs                │
│  │                                               │
│  ├── keywords: IntentKeywordResult[]             │
│  │   (개별 키워드 행 — 검색/필터링용)              │
│  │                                               │
│  ├── searchPaths: SearchPath[]                   │
│  │   (from→to 경로 행 — 경로 조회용)              │
│  │                                               │
│  ├── clusters: KeywordClusterResult[]            │
│  │   (클러스터 행)                                │
│  │                                               │
│  ├── personas: Persona[]                         │
│  │   (페르소나)                                   │
│  │                                               │
│  └── brandJourneys: BrandJourney[]               │
│      (브랜드 여정)                                │
└──────────────────────────────────────────────────┘
```

### 7.3 주요 Prisma 모델 상세

```prisma
model IntentQuery {
  id            String  @id @default(cuid())
  projectId     String
  seedKeyword   String
  locale        String            @default("ko")
  maxDepth      Int               @default(2)
  maxKeywords   Int               @default(150)
  status        AnalysisJobStatus @default(QUEUED)
  progress      Int               @default(0)
  resultSummary Json?             // PathfinderSummary | RoadViewSummary
  resultGraph   Json?             // PathfinderResult | RoadViewResult 전체
  durationMs    Int?
  createdAt     DateTime @default(now())

  keywords      IntentKeywordResult[]
  searchPaths   SearchPath[]
  clusters      KeywordClusterResult[]
  personas      Persona[]
  brandJourneys BrandJourney[]
}

model SearchPath {
  id          String @id @default(cuid())
  queryId     String
  fromKeyword String         // JourneyEdge.fromNodeId에 대응하는 키워드
  toKeyword   String         // JourneyEdge.toNodeId에 대응하는 키워드
  strength    Float @default(0)  // JourneyEdge.weight
  phase       TemporalPhase      // before | current | after
  intent      IntentCategory     // 지배적 의도
  pathType    SearchPathType @default(DIRECT)
  @@unique([queryId, fromKeyword, toKeyword])
}

model IntentKeywordResult {
  id              String @id @default(cuid())
  queryId         String
  keyword         String         // JourneyNode.label
  searchVolume    Int?           // JourneyNode.searchVolume
  intentCategory  IntentCategory // JourneyNode.intent
  subIntent       String?        // JourneyNode.subIntent
  confidence      Float @default(0)
  gapScore        Float?         // JourneyNode.gapScore
  @@unique([queryId, keyword])
}
```

### 7.4 조회 패턴

| 사용 사례 | 조회 방법 |
|----------|----------|
| 전체 그래프 로드 | `IntentQuery.resultGraph` JSON 파싱 → PathfinderResult |
| 특정 키워드 검색 | `IntentKeywordResult` WHERE keyword LIKE |
| 경로 탐색 | `SearchPath` WHERE fromKeyword = ? |
| 클러스터별 키워드 | `KeywordClusterResult` WHERE queryId = ? |
| 스테이지별 키워드 | `resultGraph` JSON 내 stage 필드 필터 (클라이언트 사이드) |
| 의도별 분포 | `IntentKeywordResult` GROUP BY intentCategory |

### 7.5 Phase 3 이후 추가 예정 모델

```prisma
model JourneySnapshot {
  id            String   @id @default(cuid())
  queryId       String
  query         IntentQuery @relation(...)
  snapshotType  String   // "pathfinder" | "roadview"
  resultJson    Json     // PathfinderResult | RoadViewResult 전체
  nodeCount     Int
  edgeCount     Int
  pathCount     Int
  createdAt     DateTime @default(now())
  @@index([queryId])
}
```

`JourneySnapshot`은 시간 경과에 따른 그래프 변화를 추적하기 위한 스냅샷 테이블. 같은 시드 키워드를 반복 분석할 때 이전 결과와 비교할 수 있다.

---

## 8. 확장 계획

### 8.1 Phase별 데이터 소스 확장

| Phase | 데이터 입력 | 모델 영향 |
|-------|-----------|----------|
| **Phase 0** (현재) | 시뮬레이션 데이터 (keyword-expander mock) | `NodeSourceType = "mock"`, confidence 고정 |
| **Phase 1** | 실제 검색량 + 자동완성 (DataForSEO/Naver) | `NodeSourceType`에 실제 출처 기록, confidence 가변 |
| **Phase 3** | SERP 데이터 (연관 검색어, PAA, 상위 URL) | `serp_overlap`, `co_search` 엣지 실제 생성, evidenceCount 증가 |
| **Phase 4** | SERP + 검색량 + 트렌드 | 전체 규모 확대 (1000노드, 10단계) |

### 8.2 Phase별 모델 변경 계획

#### Phase 1: 실데이터 연동

```
변경 없음 (모델 구조 동일, 데이터 품질만 향상)
- NodeSourceRecord.type: "mock" → "google_autocomplete" | "naver_autocomplete" 등
- confidence: 실제 수집 품질에 따라 가변
- searchVolume: 실제 검색량 반영
```

#### Phase 3: SERP 엔진 도입

```
추가 예정:
- JourneyNode에 serpData?: SerpNodeData 필드
  - 상위 URL 정보, SERP 피처 (PAA, 지식패널 등)
- JourneyEdge에 serpOverlap?: number 필드
  - 두 키워드의 SERP 결과 겹침 비율 (0-1)
- EdgeRelationType에 "serp_feature_shared" 추가 가능
- JourneySnapshot 모델 DB 추가

weight 계산 공식 확장:
  + SERP 겹침 보너스(0~0.2): serpOverlap * 0.2
```

#### Phase 4: 전체 규모 확대

```
스케일링 변경:
- maxNodes: 100 → 1,000
- maxSteps: 5 → 10
- 경로 추출 알고리즘 최적화 (BFS → Dijkstra 변형)
- 대규모 그래프 저장을 위한 JourneySnapshot 활용

모델 구조 변경:
- JourneyNode.metadata에 트렌드 데이터 포함
- RoadStage에 temporalTrend?: { month: string; volume: number }[] 추가 가능
- BranchPoint에 실제 전환 빈도 데이터 반영 (frequency 필드 활성화)
```

### 8.3 하위 호환성 전략

```
원칙:
1. 기존 필드는 삭제하지 않고, optional 필드로 확장
2. 새 필드는 항상 optional (?)로 추가
3. JSON 저장(resultGraph)은 스키마 버전 태그 포함 예정
4. 기존 intent-engine → journey-engine 브릿지는 유지
   (IntentGraphData → PathfinderResult 변환 경로 보존)
```

---

## 부록: 타입 정의 파일 위치

| 파일 | 역할 |
|------|------|
| `apps/web/src/lib/journey-engine/types.ts` | 핵심 타입 정의 (Node, Edge, Path, Stage, Result) |
| `apps/web/src/lib/journey-engine/graph/journey-graph-builder.ts` | IntentGraphData → PathfinderResult 변환 (브릿지) |
| `apps/web/src/lib/journey-engine/builders/stage-inference.ts` | 스테이지 추론 서비스 |
| `apps/web/src/lib/journey-engine/builders/transition-builder.ts` | 엣지 생성 및 전환 유형 추론 |
| `apps/web/src/lib/intent-engine/types.ts` | 기존 intent-engine 타입 (IntentCategory, SubIntent 등) |
| `packages/db/prisma/schema.prisma` | DB 스키마 (IntentQuery, SearchPath, IntentKeywordResult 등) |
