# 패스파인더 / 로드뷰 아키텍처

> 작성일: 2026-03-13
> 목적: 패스파인더와 로드뷰의 기능 정의, 데이터 구조, 엔진 구조, 시각화 구조 통합 설계

---

## 1. 기능 정의

### 1.1 패스파인더 (Pathfinder)

**핵심 목적:** 중심 키워드 기준으로 사용자의 검색 여정을 네트워크 그래프로 시각화

**보여줄 수 있어야 하는 것:**

| 항목 | 설명 | 데이터 소스 |
|------|------|------------|
| 중심 키워드 | 분석의 출발점 | 사용자 입력 |
| 앞 단계 키워드군 (before) | 중심 키워드 검색 전에 탐색하는 키워드들 | Google Autocomplete, Naver 연관검색어, SERP |
| 뒤 단계 키워드군 (after) | 중심 키워드 검색 후 이어서 탐색하는 키워드들 | Google Related, SERP |
| 연결 강도 | 키워드 간 전환 빈도/관련성 | SERP 유사도, 공동검색 빈도 |
| 의도 변화 | 경로 따라 변하는 검색 의도 (discovery→comparison→action) | intent-classifier |
| 대표 경로 | 가장 빈번하거나 중요한 검색 시퀀스 | 경로 추출 알고리즘 |
| 중요 분기점 | 경로가 갈라지는 지점 (이탈/전환 포인트) | 분기 분석기 |

**출력 구조:**
```
PathfinderResult {
  seedKeyword: "화장품"
  nodes: JourneyNode[]       // 최대 1,000개
  edges: JourneyEdge[]       // 방향성 있는 연결
  paths: JourneyPath[]       // 상위 10개 경로
  clusters: PathfinderCluster[]
  summary: PathfinderSummary // 분포, 블루오션, 분기점
  trace: AnalysisTrace       // 추적 정보
}
```

### 1.2 로드뷰 (Road View)

**핵심 목적:** 사용자의 구매/탐색 여정을 방향성 있는 단계형 흐름도로 시각화

**보여줄 수 있어야 하는 것:**

| 항목 | 설명 | 데이터 소스 |
|------|------|------------|
| 여정 스테이지 | 인지→관심→비교→결정→실행→옹호 | stage-inference |
| 스테이지별 대표 키워드 | 각 단계에서 가장 많이 검색되는 키워드 | 검색량 정렬 |
| 스테이지별 dominant intent | 각 단계의 지배적 검색 의도 | intent-classifier |
| 스테이지 전환 | 단계 간 전환 강도와 이유 | transition-builder |
| 주요 질문 | 각 단계에서 사용자가 묻는 질문 | 5W1H 패턴 + PAA |
| 이탈 포인트 | 사용자가 여정에서 이탈하는 지점 | branch-point 분석 |
| A→B 경로 (선택) | 시작 키워드에서 끝 키워드까지의 경로 | 방향성 경로 탐색 |

**출력 구조:**
```
RoadViewResult {
  seedKeyword: "화장품"
  endKeyword?: "올리브영"     // A→B 모드일 때
  stages: RoadStage[]         // 6단계 여정
  primaryPath?: JourneyPath   // A→B 최단 경로
  alternativePaths?: JourneyPath[]  // 대안 경로
  branchPoints: BranchPoint[] // 이탈 포인트
  summary: RoadViewSummary
  trace: AnalysisTrace
}
```

---

## 2. 데이터 구조

### 2.1 JourneyNode

검색 여정 그래프의 노드. 각 노드는 하나의 검색어를 나타낸다.

```typescript
JourneyNode {
  // 식별
  id: string
  label: string                    // "화장품 추천"
  normalizedLabel: string          // "화장품 추천"
  nodeType: seed | keyword | question | brand | topic | stage_anchor

  // 위치
  depth: number                    // 시드에서의 거리 (0~9)
  direction: before | seed | after
  stepIndex: number                // 경로 내 순서
  stage?: RoadStageType            // awareness | interest | comparison | decision | action | advocacy
  clusterId?: string

  // 분류
  intent: IntentCategory           // discovery | comparison | action | troubleshooting
  subIntent?: SubIntent
  temporalPhase: TemporalPhase     // before | current | after
  journeyStage?: SearchJourneyStage

  // 지표
  searchVolume: number
  gapScore: number                 // 0-100
  isRising: boolean
  centrality: number               // 0-1
  evidenceCount: number

  // Traceability
  sources: NodeSourceRecord[]      // [{type, parentKeyword, collectedAt, confidence}]

  // 시각화
  displaySize: number
  confidenceLevel: low | medium | high
}
```

### 2.2 JourneyEdge

노드 간 방향성 있는 연결. "이 검색 후 저 검색을 한다"는 관계.

```typescript
JourneyEdge {
  id: string
  fromNodeId: string
  toNodeId: string

  // 관계
  relationType: EdgeRelationType   // search_refinement, brand_comparison, purchase_journey 등 10종
  direction: forward | backward | bidirectional
  transitionType: TransitionType   // refinement, broadening, pivot, deepening, comparison, action

  // 강도
  weight: number                   // 0-1
  frequency?: number
  confidence: number               // 0-1
  evidenceCount: number

  // Traceability
  source: EdgeSourceRecord         // {type, confidence, collectedAt, evidenceKeywords}
}
```

### 2.3 JourneyPath

시드에서 출발하는 하나의 검색 경로 시퀀스.

```typescript
JourneyPath {
  id: string
  seedKeyword: string
  steps: JourneyPathStep[]         // [{stepIndex, keyword, nodeId, direction, transitionWeight, transitionType, intent}]
  pathScore: number                // 경로 총 점수
  intentFlow: IntentCategory[]     // [discovery, comparison, action]
  pathType: linear | branching | circular | convergent
  pathLabel: string                // "화장품 → 화장품 추천 → 올리브영"
  dominantIntent: IntentCategory
  totalSteps: number
}
```

### 2.4 RoadStage

로드뷰의 하나의 여정 단계.

```typescript
RoadStage {
  id: string
  stageType: awareness | interest | comparison | decision | action | advocacy
  label: string                    // "인지", "비교" 등 (한국어)
  description: string              // "사용자가 화장품 추천 등을 검색하며..."
  order: number                    // 순서 (0~5)

  // 콘텐츠
  representativeKeywords: string[] // 상위 10개
  dominantIntent: IntentCategory
  majorQuestions: string[]         // 질문형 키워드
  relatedClusterIds: string[]

  // 지표
  keywordCount: number
  avgSearchVolume: number
  avgGapScore: number

  // 전환
  nextTransition?: StageTransition // {toStageId, strength, reason, intentShift, transitionKeywords}

  // Traceability
  evidenceNodeIds: string[]        // 이 스테이지를 구성하는 노드 ID들
}
```

---

## 3. 엔진 구조

### 9개 엔진/로직 상세

#### 엔진 1: Query Sequence Inference (검색 시퀀스 추론)

| 항목 | 내용 |
|------|------|
| 입력 | 시드 키워드, SERP 연관 검색어, 자동완성 |
| 처리 | BFS 확장: 시드 → 자동완성/연관검색어 → 재귀 확장 (최대 10단계) |
| 출력 | 확장된 키워드 목록 + 부모-자식 관계 |
| 저장 | JourneyNode + NodeSourceRecord |
| 실패 처리 | SERP API 실패 시 → 기존 keyword-expander 폴백 |
| X2 재사용 | `pipeline/keyword-expander.ts` (mock → real 전환 시 교체) |

#### 엔진 2: Before-After Relationship Builder (전후 관계 빌더)

| 항목 | 내용 |
|------|------|
| 입력 | 확장된 키워드 + 의도 분류 결과 |
| 처리 | temporalPhase(before/current/after) 기준 방향 결정 + 엣지 생성 |
| 출력 | JourneyEdge[] (방향 + 관계 유형 + 전환 유형) |
| 저장 | DB: SearchPath 테이블 |
| 실패 처리 | 방향 불확실 시 bidirectional로 기본 설정 |
| X2 재사용 | `graph-builder.ts` 링크 생성 로직 (확장하여 사용) |
| **신규 구현** | `transition-builder.ts` ✅ 이번 단계에서 구현 |

#### 엔진 3: Directionality Scoring (방향성 점수)

| 항목 | 내용 |
|------|------|
| 입력 | JourneyEdge + 양쪽 노드의 phase/intent |
| 처리 | phase 순서(before→current→after) + intent 전환 패턴 + source type으로 방향 결정 |
| 출력 | direction(forward/backward/bidirectional) + confidence |
| X2 재사용 | 없음 (신규) |
| **신규 구현** | `transition-builder.ts#inferDirection()` ✅ 구현 완료 |

#### 엔진 4: Transition Grouping (전환 그룹핑)

| 항목 | 내용 |
|------|------|
| 입력 | JourneyEdge[] + JourneyNode[] |
| 처리 | 같은 phase 전환 패턴의 엣지를 그룹 → "이 패턴으로 검색을 이어가는 사람이 많다" |
| 출력 | 전환 패턴 그룹 (예: discovery→comparison 전환 25%, comparison→action 전환 15%) |
| X2 재사용 | `graph-builder.ts` 클러스터링 (Louvain) |
| **신규 구현** | `transition-builder.ts#inferTransitionType()` ✅ 구현 완료 |

#### 엔진 5: Stage Inference (스테이지 추론)

| 항목 | 내용 |
|------|------|
| 입력 | JourneyNode[] (intent, subIntent, temporalPhase, keyword) |
| 처리 | 4단계 우선순위: subIntent → intent+phase 조합 → 키워드 패턴 → 기본 매핑 |
| 출력 | RoadStage[] (6단계 여정) |
| 저장 | 노드의 stage 필드 |
| 실패 처리 | 매핑 실패 시 "interest"(관심)로 기본값 |
| X2 재사용 | `graph-builder.ts#extractSearchJourney()` (3단계 → 6단계로 확장) |
| **신규 구현** | `stage-inference.ts` ✅ 구현 완료 |

#### 엔진 6: Journey Summarization (여정 요약)

| 항목 | 내용 |
|------|------|
| 입력 | PathfinderResult 또는 RoadViewResult |
| 처리 | 분포 통계, 블루오션 추출, 대표 경로, 핵심 질문 집계 |
| 출력 | PathfinderSummary / RoadViewSummary |
| X2 재사용 | `graph-builder.ts`의 AnalysisSummary 생성 로직 |
| **신규 구현** | `journey-graph-builder.ts` 내 summary 생성 ✅ 구현 완료 |

#### 엔진 7: Graph Layout Preparation (그래프 레이아웃 준비)

| 항목 | 내용 |
|------|------|
| 입력 | JourneyNode[] + JourneyEdge[] |
| 처리 | 시각화용 좌표 계산 (다단계 열 레이아웃, 노드 크기/색상) |
| 출력 | 시각화 데이터 (displaySize, confidenceLevel 등) |
| X2 재사용 | `pathfinder/page.tsx` Canvas 레이아웃 (3열 → N열 확장) |
| 신규 구현 | Phase 4에서 Canvas 확장 |

#### 엔진 8: Path Prioritization (경로 우선순위)

| 항목 | 내용 |
|------|------|
| 입력 | 후보 경로 목록 |
| 처리 | pathScore(weight 합) 기반 정렬 + 다양성 확보 (같은 패턴 중복 제거) |
| 출력 | 상위 10개 대표 경로 |
| X2 재사용 | `graph-builder.ts#extractSearchJourney()` paths 정렬 |
| **신규 구현** | `journey-graph-builder.ts#extractPaths()` ✅ 구현 완료 |

#### 엔진 9: Evidence Mapping (근거 매핑)

| 항목 | 내용 |
|------|------|
| 입력 | JourneyNode/Edge/Stage |
| 처리 | 각 데이터 포인트의 출처(source)를 역추적 가능하게 기록 |
| 출력 | NodeSourceRecord[], EdgeSourceRecord[], evidenceNodeIds[] |
| X2 재사용 | 없음 (기존에 traceability 없음) |
| **신규 구현** | types.ts에 source 구조 정의 + 빌더에서 기록 ✅ 구현 완료 |

---

## 4. 시각화 구조

### 4.1 패스파인더 네트워크 그래프

```
렌더링: Custom Canvas 2D (기존 pathfinder/page.tsx 확장)

레이아웃:
  현재: 3열 고정 (before/current/after)
  목표: N열 수평 스크롤 (stepIndex 기반, 최대 10열)

노드:
  - 크기: displaySize (log 스케일)
  - 색상: intent 카테고리 (기존 INTENT_COLORS)
  - 테두리: confidenceLevel (high=실선, medium=점선, low=투명)
  - 뱃지: isRising → 초록 점, nodeType=question → ? 아이콘
  - 라벨: seed/selected/volume>500 일 때 표시

엣지:
  - 방향: 화살표 (direction=forward/backward), 양방향은 양쪽 화살표
  - 굵기: weight 비례
  - 색상: transitionType별 (action=빨강, comparison=노랑, default=회색)
  - 점선: confidence < 0.5

인터랙션:
  - 드래그, 줌 (0.3x~3x), 클릭 선택 (기존 유지)
  - 멀티셀렉트 (Shift+클릭) → 로드뷰 연결 (신규)
  - 노드 검색 (신규)
  - 대표 경로 하이라이트 (신규)
```

### 4.2 로드뷰 방향성 흐름도

```
렌더링: SVG (DOM 인터랙션 중심)

레이아웃:
  수평 스텝 흐름: [인지] → [관심] → [비교] → [결정] → [실행] → [옹호]
  각 스테이지: 카드 형태 (위: 스테이지 라벨, 중간: 대표 키워드, 아래: intent 뱃지)

스테이지 카드:
  - 상단: 스테이지 라벨 + 색상 (ROAD_STAGE_COLORS)
  - 중간: 대표 키워드 3~5개 (태그)
  - 하단: dominant intent 뱃지 + 키워드 수 + 평균 갭점수
  - 클릭 시: 확장 패널 (전체 키워드 + 질문 + 클러스터)

전환 화살표:
  - 굵기: transition.strength 비례
  - 라벨: 전환 이유 (intentShift)
  - 색상: 전환 강도 (강=파랑, 중=회색, 약=점선)

분기점 표시:
  - 이탈률 높은 노드: 빨간 테두리
  - 대안 경로: 점선 화살표 (아래쪽으로)

A→B 모드:
  - 주 경로: 굵은 실선
  - 대안 경로: 가는 실선 (토글로 전환)
```

### 4.3 공통 UX

```
입력:
  - 시드 키워드 입력 (필수)
  - 종료 키워드 입력 (로드뷰 A→B 모드, 선택)
  - 최대 단계 수 슬라이더 (1~10, 기본 5)

필터:
  - 의도 카테고리 (discovery/comparison/action/troubleshooting)
  - 시간구간 (before/current/after)
  - 여정 스테이지 (6단계 체크박스)
  - 최소 검색량 (슬라이더)
  - confidence 임계값 (low 포함/제외)

뷰 전환:
  - 네트워크 그래프 ↔ 스테이지 흐름도 탭 전환
  - 경로 목록 패널 (사이드바)
  - evidence 확장 (노드/스테이지 클릭 시)

출력:
  - CSV 다운로드 (노드 목록, 경로 목록)
  - PNG 내보내기 (그래프 이미지)
  - 한국어 기본 (i18n 지원)
```

---

## 5. 데이터 흐름

```
[사용자 입력: 시드 키워드]
      │
      ▼
[intent-engine 분석] ← 기존 파이프라인 재사용
  │ expandKeywords() → classifyKeywords() → buildIntentGraph()
  │
  ▼
[IntentGraphData] ← 기존 결과 형식
      │
      ▼
[journey-graph-builder] ← 브릿지 (이번 단계에서 구현)
  │ convertNode() → convertFromIntentLinks() → extractPaths()
  │
  ▼
[PathfinderResult] ← 새 결과 형식
  │ nodes: JourneyNode[]
  │ edges: JourneyEdge[]
  │ paths: JourneyPath[]
  │
  ├─── [패스파인더 시각화] → Canvas 네트워크 그래프
  │
  └─── [stage-inference] → RoadStage[] → [로드뷰 시각화] → SVG 흐름도
```

### Phase별 데이터 흐름 진화

| Phase | 데이터 입력 | 변환 | 출력 |
|-------|-----------|------|------|
| 현재 (Phase 0) | 시뮬레이션 데이터 (keyword-expander mock) | intent-engine → journey-engine 브릿지 | PathfinderResult + RoadViewResult |
| Phase 1 | 실제 검색량 + 자동완성 (DataForSEO/Naver) | 위와 동일 (입력만 실데이터) | 동일 (정확도 향상) |
| Phase 3 | SERP 데이터 (연관 검색어, PAA, 상위 URL) | journey-engine 직접 파이프라인 (SERP BFS) | 동일 (경로 다양성 향상) |
| Phase 4 | SERP + 검색량 + 트렌드 | 완전한 journey-engine (10단계, 1000노드) | 동일 (규모 확대) |

---

## 6. 저장 구조

### 기존 Prisma 모델 활용

| 모델 | 용도 | 상태 |
|------|------|------|
| IntentQuery | 분석 세션 (시드 키워드, 설정, 결과 JSON) | 기존 활용 |
| IntentKeywordResult | 개별 키워드 결과 (의도, 갭점수) | 기존 활용 |
| SearchPath | 키워드 간 경로 (from→to, strength, phase, intent) | **기존 모델 확장 사용** |
| Persona | 페르소나 (로드뷰 스테이지와 연계) | 기존 활용 |
| KeywordClusterResult | 클러스터 (패스파인더 클러스터와 매핑) | 기존 활용 |
| BrandJourney | 브랜드 여정 (로드뷰 경쟁 분석) | 기존 활용 |

### 추가 필요 (Phase 3 이후)

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
