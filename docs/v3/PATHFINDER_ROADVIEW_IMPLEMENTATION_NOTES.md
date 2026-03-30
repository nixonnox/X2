# Pathfinder & Road View - 구현 노트

> **작성일**: 2026-03-13
> **대상 코드**: `apps/web/src/lib/journey-engine/`
> **상태**: journey-engine 핵심 로직 구현 완료, 프론트엔드 연동 미완

---

## 1. 구현 완료 항목

journey-engine은 기존 intent-engine의 분석 결과(`IntentGraphData`)를 입력받아 방향성 있는 검색 여정 그래프(`PathfinderResult`, `RoadViewResult`)로 변환하는 엔진이다. 아래 6개 모듈이 구현되었다.

### 1-1. types.ts -- 전체 타입 시스템

**파일**: `apps/web/src/lib/journey-engine/types.ts`

- **JourneyNode**: 검색 여정 그래프의 노드. `id`, `label`, `nodeType`(seed/keyword/question/brand/topic/stage_anchor), `depth`, `direction`(before/seed/after), `stage`(RoadStageType), `intent`, `subIntent`, `searchVolume`, `gapScore`, `centrality`, `sources`(출처 추적) 등 포함.
- **JourneyEdge**: 노드 간 엣지. `relationType`(10종), `direction`(forward/backward/bidirectional), `transitionType`(7종), `weight`, `confidence`, `source`(출처 추적) 포함.
- **JourneyPath / JourneyPathStep**: 시드에서 출발하는 검색 경로 시퀀스. `pathScore`, `intentFlow`, `pathType`(linear/branching/circular/convergent).
- **RoadStage**: 로드뷰 6단계(awareness/interest/comparison/decision/action/advocacy) 각각의 대표 키워드, dominant intent, 질문, 평균 검색량/갭 점수.
- **StageTransition**: 스테이지 간 전환 정보 (강도, 이유, intent 변화, 전환 키워드).
- **BranchPoint**: 분기점 분석 (대안 경로, 이탈률 추정).
- **PathfinderRequest/Result**, **RoadViewRequest/Result**: 엔진 입출력 타입.
- **AnalysisTrace / AnalysisTraceStage**: 분석 추적 정보 (데이터 소스별 호출 횟수, 캐시 히트율, 레이턴시).
- **상수**: `ROAD_STAGE_LABELS`, `ROAD_STAGE_COLORS`, `ROAD_STAGE_ORDER`, `INTENT_TO_STAGE`, `SUBINTENT_TO_STAGE`.

### 1-2. transition-builder.ts -- 엣지 생성/전환 분석

**파일**: `apps/web/src/lib/journey-engine/builders/transition-builder.ts`

| 함수 | 역할 |
|---|---|
| `inferTransitionType(from, to)` | 두 노드 간 전환 유형 추론. 의도 변화(action/comparison/pivot) 우선, 같은 의도 내에서는 depth 변화로 deepening/broadening/refinement 판별 |
| `inferDirection(from, to, sourceType)` | 엣지 방향 추론. before->seed->after는 forward, 자동완성은 forward, 연관검색어는 bidirectional |
| `inferRelationType(from, to, sourceType)` | source type 기반 관계 유형 추론 (autocomplete->search_refinement, related->search_continuation, paa->topic_exploration 등). 소스 없으면 의도 기반 폴백 |
| `calculateEdgeWeight(from, to)` | 엣지 가중치 계산. 기본 0.3 + 의도 일치(+0.2) + 같은 phase(+0.15) + 검색량 비율(+0.15) + 같은 클러스터(+0.1) + 방향 순서(+0.1) = 최대 1.0 |
| `buildEdge(from, to, sourceType, confidence)` | 위 함수들을 조합하여 `JourneyEdge` 객체 생성 |
| `convertFromIntentLinks(links, nodeMap)` | 기존 `IntentGraphLink[]` -> `JourneyEdge[]` 변환. `relationshipType`을 `sourceType`으로 매핑 후 `buildEdge` 호출. 기존 `strength` 값을 `weight`로 보존 |
| `resetEdgeCounter()` | edgeCounter 리셋 (분석 시작 시 호출) |

### 1-3. stage-inference.ts -- 스테이지 추론/RoadStage 빌드

**파일**: `apps/web/src/lib/journey-engine/builders/stage-inference.ts`

| 함수 | 역할 |
|---|---|
| `inferStage(node)` | 단일 노드의 RoadStageType 추론. **4단계 우선순위**: (1) subIntent 기반 (`SUBINTENT_TO_STAGE`), (2) intent+temporalPhase 조합 (before=awareness/interest, after=action/advocacy), (3) 한국어 키워드 패턴 매칭 (정규식 14개), (4) intent 기본 매핑 (`INTENT_TO_STAGE`) |
| `buildRoadStages(nodes, edges)` | 전체 노드를 6단계 스테이지로 그룹핑하여 `RoadStage[]` 생성. 각 스테이지별 대표 키워드(검색량 상위 10), dominant intent, 질문형 키워드, 평균 지표 산출. 스테이지 간 전환 정보(`StageTransition`) 생성 -- 교차 엣지 수 / sqrt(가능한 엣지 수)로 전환 강도 계산 |

**키워드 패턴 매칭 규칙 (14개)**:
- awareness: `이란/뜻/의미/정의/개념`, `종류/유형/분류`
- interest: `추천/방법/하는 법/팁`, `장점/단점/특징/효과`
- comparison: `vs/비교/차이/대안`, `순위/랭킹/top/best`, `리뷰/후기/평가`
- decision: `가격/비용/요금/할인`, `선택/고르는/선택법`
- action: `구매/주문/신청/가입`, `다운로드/설치/시작`
- advocacy: `후기/경험/결과/성공`, `환불/반품/취소`, `에러/오류/문제/해결`

### 1-4. journey-graph-builder.ts -- 그래프 변환/경로 탐색

**파일**: `apps/web/src/lib/journey-engine/graph/journey-graph-builder.ts`

| 함수 | 역할 |
|---|---|
| `buildPathfinderFromIntentGraph(igData, request)` | **핵심 브릿지 함수**. `IntentGraphData` -> `PathfinderResult` 변환. (1) 노드 변환, (2) 엣지 변환, (3) BFS 경로 추출, (4) 분기점 분석, (5) 클러스터 변환, (6) 요약 생성 |
| `convertNode(igNode, seedKeyword)` | `IntentGraphNode` -> `JourneyNode` 변환. nodeType 추론(질문형 정규식), sourceType 추론(depth 기반), displaySize(로그 스케일), confidenceLevel(centrality 기반) |
| `extractPaths(seedNode, nodes, edges, maxPaths)` | BFS로 시드에서 도달 가능한 경로 탐색. 인접 리스트 구성 -> 큐 기반 탐색(maxDepth=5) -> 3단계 이상이면 경로 기록 -> pathScore 내림차순 정렬 -> 상위 maxPaths(=10)개 반환 |
| `analyzeBranchPoints(nodes, edges)` | 각 노드의 outgoing edge 수 기반 분기점 식별. 2개 이상 분기 시 이탈률 추정: `(전체 weight - 최대 weight) / 전체 weight`. 상위 10개 반환 |
| `convertClusters(igData, nodeMap)` | 기존 클러스터 -> `PathfinderCluster` 변환. 키워드 -> nodeId 매핑 |

### 1-5. pathfinder-service.ts -- 서비스 진입점

**파일**: `apps/web/src/lib/journey-engine/services/pathfinder-service.ts`

| 함수 | 역할 |
|---|---|
| `analyzePathfinder(request, intentData?)` | 패스파인더 분석 진입점. 기존 IntentGraphData가 없으면 `intentAnalysisService.analyze()`를 **동적 import**로 호출. 결과를 `buildPathfinderFromIntentGraph()`로 변환 |
| `analyzeRoadView(request)` | 로드뷰 분석 진입점. (1) 패스파인더 결과 확보, (2) `buildRoadStages()`로 6단계 스테이지 구축, (3) `endKeyword`가 있으면 A->B 경로 탐색, (4) 요약 생성 |
| `findDirectedPaths(start, end, pfResult)` | A->B 방향성 경로 탐색. endKeyword를 포함하는 경로 필터링 (부분 문자열 매칭). 매칭 없으면 pathScore 최고 경로를 primary로 사용 |

### 1-6. index.ts -- 퍼블릭 API

**파일**: `apps/web/src/lib/journey-engine/index.ts`

모든 public 타입, 상수, 서비스 함수, 빌더 함수, 그래프 빌더를 re-export한다.

---

## 2. 남은 작업 (Remaining Tasks)

### 프론트엔드 연동

- [ ] **pathfinder/page.tsx**: 현재 `/api/intent/analyze` API를 직접 호출하여 `IntentGraphData`를 받고, 자체 `PathNode`/`PathEdge` 타입으로 변환하여 Canvas 그래프를 그린다. journey-engine의 `analyzePathfinder()` 결과를 사용하도록 전환 필요.
  - 파일: `apps/web/src/app/(dashboard)/pathfinder/page.tsx`
- [ ] **road-view/page.tsx**: 현재 `/api/intent/analyze` API를 직접 호출하여 `IntentGraphData`를 받고, 자체 `extractBrandMentions()` 함수로 브랜드 분석을 수행한다. journey-engine의 `analyzeRoadView()` 결과를 사용하도록 전환 필요.
  - 파일: `apps/web/src/app/(dashboard)/road-view/page.tsx`
- [ ] 프론트엔드의 자체 타입(`PathNode`, `PathEdge`, `BrandMention` 등)을 journey-engine 타입(`JourneyNode`, `JourneyEdge` 등)으로 통합

### API 레이어

- [ ] **tRPC 라우터**: journey-engine용 tRPC 프로시저 미구현. `pathfinder.analyze`, `roadview.analyze` 프로시저 필요
- [ ] **REST API 엔드포인트**: `/api/journey/pathfinder`, `/api/journey/roadview` 라우트 미구현. 현재 두 페이지 모두 `/api/intent/analyze`에 의존

### 데이터

- [ ] **실데이터 연동**: 모든 데이터가 intent-engine의 `seededRandom` 시뮬레이션 기반. DataForSEO/Google/Naver 실데이터 어댑터 미연결
- [ ] **DB 저장**: `PathfinderResult`/`RoadViewResult`를 Prisma에 저장하는 로직 미구현. 분석 결과 캐싱/이력 관리 불가

### 고급 기능

- [ ] **SERP 기반 엔진 (Phase 3)**: K-shortest paths, SERP 클러스터링, SERP overlap 기반 엣지 생성 등 미구현
- [ ] **테스트 코드**: 유닛 테스트 전무. `inferStage`, `inferTransitionType`, `buildPathfinderFromIntentGraph`, `buildRoadStages` 등 핵심 함수 테스트 필요
- [ ] **경로 탐색 고도화**: 현재 BFS 기반 단순 탐색. Dijkstra/A* 또는 K-shortest paths로 교체 필요
- [ ] **A->B 경로 탐색 고도화**: 현재 `findDirectedPaths`는 단순 문자열 매칭 필터링. 실제 그래프 탐색 기반으로 전환 필요

---

## 3. 다음 단계 준비 사항

즉시 착수 가능한 작업을 우선순위로 정리한다.

### Priority 1: 프론트엔드 페이지에서 journey-engine 호출로 전환

1. `/api/journey/pathfinder` REST API 라우트 생성 -> `analyzePathfinder()` 호출
2. `/api/journey/roadview` REST API 라우트 생성 -> `analyzeRoadView()` 호출
3. `pathfinder/page.tsx`에서 새 API 호출, `PathfinderResult`의 `nodes`/`edges`/`paths` 사용
4. `road-view/page.tsx`에서 새 API 호출, `RoadViewResult`의 `stages`/`primaryPath`/`branchPoints` 사용

### Priority 2: tRPC/REST API 연동

1. `apps/web/src/server/api/routers/journey.ts` tRPC 라우터 생성
2. `pathfinder.analyze` / `roadview.analyze` 프로시저 정의
3. 입력 검증 (zod 스키마)
4. 에러 처리 및 타임아웃 설정

### Priority 3: 실데이터 어댑터 연결

1. `NodeSourceType`별 데이터 수집 어댑터 인터페이스 정의
2. DataForSEO API 연동 (자동완성, 연관검색어, SERP)
3. Google/Naver 자동완성 어댑터
4. `sources` 필드에 실제 출처 기록

### Priority 4: 테스트 작성

1. `inferStage()` -- 4단계 우선순위별 분기 테스트
2. `inferTransitionType()` -- 의도 전환 패턴 테스트
3. `buildEdge()` -- 가중치 계산 정확성 테스트
4. `buildPathfinderFromIntentGraph()` -- 노드/엣지 변환 통합 테스트
5. `buildRoadStages()` -- 스테이지 그룹핑, 전환 정보 생성 테스트
6. `findDirectedPaths()` -- A->B 경로 탐색 테스트

### Priority 5: SERP 기반 고급 기능

1. SERP overlap 기반 엣지 생성 (`serp_overlap` 관계 유형 활용)
2. K-shortest paths 알고리즘 도입
3. SERP 클러스터링 기반 `PathfinderCluster` 정밀화
4. 실시간 SERP 데이터 반영 파이프라인

---

## 4. 기술적 메모

### nodeCounter / edgeCounter / stageCounter를 모듈 레벨 변수로 사용한 이유

`journey-graph-builder.ts`의 `nodeCounter`, `transition-builder.ts`의 `edgeCounter`, `stage-inference.ts`의 `stageCounter`는 모두 모듈 레벨 `let` 변수이다.

- 목적: 분석 실행마다 고유 ID(`jn-1`, `edge-1`, `stage-awareness-1`)를 순차 생성하기 위함
- `buildPathfinderFromIntentGraph()` 진입 시 `nodeCounter = 0`, `resetEdgeCounter()` 호출로 리셋
- `buildRoadStages()` 진입 시 `stageCounter = 0`으로 리셋
- **한계**: 동시에 여러 분석이 실행되면 카운터가 꼬일 수 있다. 프로덕션에서는 `crypto.randomUUID()` 또는 요청별 카운터 인스턴스로 교체해야 한다.

### 동적 import로 intent-engine 호출하는 이유

`pathfinder-service.ts`에서 `intentAnalysisService`를 동적 import(`await import(...)`)로 호출한다.

```typescript
const { intentAnalysisService } = await import("../../intent-engine/service");
```

- **이유**: journey-engine과 intent-engine 사이의 **순환 참조 방지**. journey-engine의 `types.ts`가 intent-engine의 타입을 import하고 있으므로, 서비스 레벨에서도 정적 import하면 순환 의존이 발생할 수 있다.
- 동적 import는 런타임에 필요할 때만 로드하므로 모듈 초기화 순서 문제를 회피한다.

### BFS 경로 탐색: maxDepth=5, maxPaths=10 설정 근거

`extractPaths()` 함수의 설정값:

- **maxDepth = 5**: 검색 여정에서 시드 키워드로부터 5단계 이상 떨어진 키워드는 실질적 관련성이 낮다고 판단. 또한 BFS 큐 크기를 제한하여 연산량을 제어한다.
- **maxPaths = 10**: UI에서 표시하기에 적절한 경로 수. 내부적으로는 `maxPaths * 3 = 30`개까지 수집 후 pathScore 정렬하여 상위 10개 선별.
- **경로 기록 조건**: `path.length >= 2` (최소 2단계) && (`path.length >= 3` || 리프 노드). 1단계 경로(시드->직접 연결)는 의미가 없으므로 제외.
- **양방향 엣지 처리**: `edge.direction === "bidirectional"`이면 인접 리스트에 양방향 추가하여 양쪽에서 탐색 가능.

### 한국어 키워드 패턴 기반 스테이지 추론의 한계와 개선 방향

`stage-inference.ts`의 `KEYWORD_STAGE_PATTERNS`는 14개 정규식으로 한국어 키워드의 접미사/포함어를 매칭한다.

**현재 한계**:
- **오분류 위험**: "리뷰"가 comparison과 advocacy 양쪽 패턴에 매칭될 수 있다 (첫 번째 매칭 반환으로 인해 comparison으로 분류됨)
- **영어 키워드 미비**: 한국어 패턴 위주이므로 영어 키워드에 대한 커버리지가 낮다
- **문맥 무시**: "가격 비교"는 comparison이어야 하나 "가격"이 먼저 매칭되면 decision으로 분류
- **신규 패턴 대응 불가**: 새로운 검색 패턴(예: "GPT로 ~하기")은 기존 정규식에 매칭되지 않음

**개선 방향**:
- 패턴 우선순위를 패턴 길이(구체성) 기준으로 재정렬
- 복합 패턴 도입 (예: "가격 비교" -> comparison, "가격" 단독 -> decision)
- 실데이터 연동 후 ML 기반 분류기로 교체 가능
- 영어/일본어 등 다국어 패턴 추가

### 프론트엔드 페이지의 현재 구조

두 페이지 모두 동일한 패턴으로 동작한다:

1. 사용자 입력 -> `/api/intent/analyze` POST 호출
2. `IntentGraphData` 응답 수신
3. **클라이언트 측**에서 자체 타입으로 변환 (journey-engine 미사용)
   - `pathfinder/page.tsx`: `IntentGraphNode` -> `PathNode`, `IntentGraphLink` -> `PathEdge`
   - `road-view/page.tsx`: `IntentGraphNode` -> `BrandMention`, 자체 `extractBrandMentions()` 함수
4. Canvas 기반 그래프 또는 Recharts 차트로 시각화

journey-engine 전환 시 서버 측에서 변환을 완료하고, 프론트엔드는 결과만 렌더링하는 구조로 변경해야 한다.
