# Search-to-Engine Implementation Notes

> 이번 단계에서 실제 반영한 코드 · 남은 과제 · 다음 단계 준비 사항

## 1. 이번 단계에서 반영한 코드

### 1.1 서비스 레이어 (신규 생성: 13개 파일)

```
services/search-intelligence/
├── index.ts                          # Public API barrel export
├── types.ts                          # SearchTraceMetadata, EngineExecutionResult 등
├── traceBuilder.ts                   # buildTraceFromPayload(), finalizeTrace()
├── searchIntelligenceOrchestrator.ts # runSearchIntelligence()
├── searchToPathfinderService.ts      # searchToPathfinder()
├── searchToRoadViewService.ts        # searchToRoadView()
├── searchToClusterService.ts         # searchToCluster()
├── searchToPersonaService.ts         # searchToPersona()
├── input-builders/
│   ├── index.ts
│   ├── buildPathfinderInput.ts       # payload → PathfinderRequest + quality
│   ├── buildRoadViewInput.ts         # payload → RoadViewRequest + quality
│   ├── buildClusterInput.ts          # payload → ClusterFinderRequest + quality
│   └── buildPersonaInput.ts          # payload → PersonaViewRequest + quality
└── repositories/
    └── analysisResultRepository.ts   # In-Memory 저장 (→ Prisma 전환 예정)
```

### 1.2 API Route (신규: 1개)

| 파일 | 엔드포인트 | 설명 |
|------|-----------|------|
| `app/api/search-intelligence/analyze/route.ts` | POST /api/search-intelligence/analyze | 4개 엔진 통합 분석 |

### 1.3 데이터 흐름

```
POST /api/search-intelligence/analyze
  ├─ { seedKeyword: "화장품 추천" }
  │
  ├─ SearchConnectorRegistry.initialize()
  ├─ resolveSearchData() → NormalizedSearchAnalyticsPayload
  │
  ├─ searchToCluster(payload)
  │   ├─ buildClusterInput()  → ClusterFinderRequest + quality
  │   ├─ analyzeClusterFinder() → ClusterFinderResult
  │   └─ saveAnalysisResult()
  │
  ├─ [parallel]
  │   ├─ searchToPersona(payload, { existingClusters })
  │   │   ├─ buildPersonaInput() → PersonaViewRequest + quality
  │   │   ├─ analyzePersonaView() → PersonaViewResult
  │   │   └─ saveAnalysisResult()
  │   │
  │   ├─ searchToPathfinder(payload)
  │   │   ├─ buildPathfinderInput() → PathfinderRequest + quality
  │   │   ├─ analyzePathfinder() → PathfinderResult
  │   │   └─ saveAnalysisResult()
  │   │
  │   └─ searchToRoadView(payload)
  │       ├─ buildRoadViewInput() → RoadViewRequest + quality
  │       ├─ analyzeRoadView() → RoadViewResult
  │       └─ saveAnalysisResult()
  │
  └─ SearchIntelligenceResult
```

## 2. 설계 결정

### 2.1 Input Builder 분리

- 빌더는 payload → engine request 변환만 담당
- quality 메타데이터를 함께 반환하여 서비스 레이어에서 trace에 반영
- source-specific 로직은 빌더에도 없음 (payload만 참조)

### 2.2 Cluster → Persona 순서

- Persona 엔진은 cluster 결과를 `existingClusters`로 재사용하여 정확도 향상
- Orchestrator에서 cluster를 먼저 실행, 나머지를 병렬 실행
- Cluster 실패 시 Persona는 자체적으로 클러스터링 수행 (graceful degradation)

### 2.3 엔진 내부 IntentGraphData 유지

- 현재 엔진들은 `existingAnalysis?: IntentGraphData`를 통해 intent-engine 결과를 재사용하거나
  없으면 자체적으로 intent-engine을 호출
- 이번 단계에서는 이 구조를 유지하고, payload에서 직접 IntentGraphData를 구성하는 것은 Phase 2로 연기
- 이유: IntentGraphData 구성 로직이 복잡하고, 기존 엔진 파이프라인이 안정적으로 동작하므로 우선 연결에 집중

### 2.4 In-Memory Repository

- 개발/테스트 단계이므로 Map 기반 저장
- Prisma 전환을 위한 interface는 동일하게 유지
- TODO 주석으로 Prisma 전환 코드 힌트 포함

### 2.5 Traceability 3레이어

1. **traceBuilder**: payload의 소스 메타에서 SearchTraceMetadata 생성
2. **서비스**: 빌더 quality + 엔진 결과 + evidence refs 첨부
3. **오케스트레이터**: 전체 결과 통합 trace

## 3. 남은 과제

### 3.1 단기 (다음 스프린트)

- [ ] **IntentGraphData 직접 구성**: payload → IntentGraphData 변환 함수 구현
  - 목적: intent-engine 호출 스킵 → search payload 데이터를 직접 활용
  - 대상: `buildPathfinderInput`, `buildClusterInput`의 TODO 부분
- [ ] **Prisma Repository 전환**: analysis_results 테이블 + Prisma 쿼리
- [ ] **결과 캐싱**: 동일 키워드의 최근 결과가 있으면 재사용
- [ ] **프론트엔드 연결**: 통합 API를 호출하는 hook/page 구현

### 3.2 중기

- [ ] **배치 분석**: 여러 키워드를 batchId로 묶어 일괄 실행
- [ ] **결과 비교**: 동일 키워드의 시간별 결과 비교 뷰
- [ ] **SERP Jaccard 정확 계산**: 배치 SERP 수집 후 키워드 쌍별 유사도
- [ ] **GEO/AEO 엔진 연결**: 5번째 엔진 연결 서비스 추가

### 3.3 장기

- [ ] **실시간 파이프라인**: BullMQ 기반 비동기 분석 큐
- [ ] **메트릭 대시보드**: 엔진별 성공률/지연시간/비용 모니터링
- [ ] **리포트 생성**: SearchIntelligenceResult → PDF/리포트

## 4. 프론트엔드 재사용 가능한 Output Shape

### 4.1 Pathfinder (기존 feature module과 호환)

```
EngineExecutionResult<PathfinderResult>
  .data.nodes → PathfinderNodeViewModel[] (via mapPathfinderResult)
  .data.edges → PathfinderEdgeViewModel[]
  .data.paths → PathfinderPathViewModel[]
  .trace → SearchTraceMetadata (UI에서 confidence/freshness 표시)
```

### 4.2 RoadView (기존 feature module과 호환)

```
EngineExecutionResult<RoadViewResult>
  .data.stages → RoadStageViewModel[] (via mapRoadViewResult)
  .data.primaryPath → PathfinderPathViewModel
  .data.branchPoints → BranchPointViewModel[]
  .trace → SearchTraceMetadata
```

### 4.3 Cluster (기존 feature module과 호환)

```
EngineExecutionResult<ClusterFinderResult>
  .data.clusters → ClusterViewModel[] (via existing mapper)
  .data.memberships → ClusterMembership[]
  .trace → SearchTraceMetadata
```

### 4.4 Persona (기존 feature module과 호환)

```
EngineExecutionResult<PersonaViewResult>
  .data.personas → PersonaViewModel[] (via existing mapper)
  .data.personaClusterLinks → PersonaClusterLink[]
  .trace → SearchTraceMetadata
```

## 5. Backward Compatibility

| 항목 | 호환성 |
|------|--------|
| `/api/pathfinder/analyze` | 유지됨 — 기존 개별 호출 그대로 동작 |
| `/api/roadview/analyze` | 유지됨 |
| `/api/cluster/analyze` | 유지됨 |
| `/api/persona/analyze` | 유지됨 |
| `features/journey/` hooks | 유지됨 — 기존 hook이 개별 API 호출 |
| `features/persona-cluster/` hooks | 유지됨 |
| 통합 API는 추가 진입점 | `/api/search-intelligence/analyze` 신규 |
