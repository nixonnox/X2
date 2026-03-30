# Search-to-Engine Integration Architecture

> 검색 데이터 어댑터 결과가 각 엔진으로 들어가는 전체 구조

## 1. 전체 파이프라인

```
┌─────────────────────────────────────────────────────────────┐
│ Search Adapter Layer                                        │
│ Google Ads / Autocomplete / Trends / Naver / SerpAPI / DFS  │
└──────────────────────┬──────────────────────────────────────┘
                       │ resolveSearchData()
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ NormalizedSearchAnalyticsPayload                            │
│ seedData + relatedKeywords + trendSeries + serpDocuments     │
└──────────────────────┬──────────────────────────────────────┘
                       │ buildXxxInput() (4개)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Engine Input Builders                                       │
│ ┌──────────────┐ ┌──────────────┐ ┌─────────┐ ┌──────────┐│
│ │ Pathfinder   │ │ RoadView     │ │ Cluster │ │ Persona  ││
│ │ InputBuilder │ │ InputBuilder │ │ Builder │ │ Builder  ││
│ └──────┬───────┘ └──────┬───────┘ └────┬────┘ └────┬─────┘│
└────────│────────────────│──────────────│────────────│───────┘
         │                │              │            │
         ▼                ▼              ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│ Engine Services (searchToXxx)                               │
│ ┌──────────────┐ ┌──────────────┐ ┌─────────┐ ┌──────────┐│
│ │ searchTo     │ │ searchTo     │ │ searchTo│ │ searchTo ││
│ │ Pathfinder   │ │ RoadView     │ │ Cluster │ │ Persona  ││
│ └──────┬───────┘ └──────┬───────┘ └────┬────┘ └────┬─────┘│
└────────│────────────────│──────────────│────────────│───────┘
         │                │              │     ┌──────┘
         ▼                ▼              ▼     ▼ (cluster 결과 재사용)
┌─────────────────────────────────────────────────────────────┐
│ Analysis Engines                                            │
│ analyzePathfinder  analyzeRoadView  analyzeCluster  analyze │
│ Finder()           ()               Finder()        Persona │
│                                                     View()  │
└──────────────────────┬──────────────────────────────────────┘
                       │ EngineExecutionResult<T>
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Result Persistence                                          │
│ analysisResultRepository.saveAnalysisResult()               │
│ ┌────────────────────────────────────────┐                  │
│ │ PersistableAnalysisResult              │                  │
│ │ { id, seedKeyword, engine, resultJson, │                  │
│ │   traceJson: SearchTraceMetadata }     │                  │
│ └────────────────────────────────────────┘                  │
│ 현재: In-Memory Map  |  향후: Prisma → DB                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Consumers                                                   │
│ ├─ Frontend (features/journey, features/persona-cluster)    │
│ ├─ Insight Pages                                            │
│ ├─ Report Generation                                        │
│ └─ Dashboard Summaries                                      │
└─────────────────────────────────────────────────────────────┘
```

## 2. Orchestrator 흐름

```typescript
runSearchIntelligence({ seedKeyword: "화장품 추천" })
  │
  ├─ [1] SearchConnectorRegistry.initialize()  // 어댑터 자동 감지
  ├─ [2] resolveSearchData("화장품 추천")       // 데이터 수집
  │       → NormalizedSearchAnalyticsPayload
  │
  ├─ [3] searchToCluster(payload)              // 먼저 실행
  │       → ClusterFinderResult
  │
  └─ [4] 병렬 실행
        ├─ searchToPersona(payload, { existingClusters })
        ├─ searchToPathfinder(payload)
        └─ searchToRoadView(payload)
```

**실행 순서 이유**: Cluster는 Persona가 재사용하므로 먼저 실행. 나머지는 독립 실행 가능.

## 3. 엔진별 서비스 흐름

### 3.1 searchToPathfinder

```
payload → buildPathfinderInput() → PathfinderRequest
  → analyzePathfinder(request) → PathfinderResult
  → saveAnalysisResult() → PersistableAnalysisResult
  → EngineExecutionResult<PathfinderResult>
```

### 3.2 searchToRoadView

```
payload → buildRoadViewInput() → RoadViewRequest
  → analyzeRoadView(request) → RoadViewResult
  → saveAnalysisResult()
  → EngineExecutionResult<RoadViewResult>
```

### 3.3 searchToCluster

```
payload → buildClusterInput() → ClusterFinderRequest
  → analyzeClusterFinder(request) → ClusterFinderResult
  → saveAnalysisResult()
  → EngineExecutionResult<ClusterFinderResult>
```

### 3.4 searchToPersona

```
payload + existingClusters? → buildPersonaInput() → PersonaViewRequest
  → analyzePersonaView(request) → PersonaViewResult
  → saveAnalysisResult()
  → EngineExecutionResult<PersonaViewResult>
```

## 4. API Route

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/api/search-intelligence/analyze` | POST | 통합 분석 (4개 엔진) |
| `/api/pathfinder/analyze` | POST | Pathfinder 단독 |
| `/api/roadview/analyze` | POST | RoadView 단독 |
| `/api/cluster/analyze` | POST | Cluster 단독 |
| `/api/persona/analyze` | POST | Persona 단독 |

## 5. 파일 구조

```
services/search-intelligence/
├── index.ts                          # Public API
├── types.ts                          # 공통 타입 (trace, result, request)
├── traceBuilder.ts                   # SearchTraceMetadata 빌더
├── searchIntelligenceOrchestrator.ts # 전체 파이프라인 오케스트레이터
├── searchToPathfinderService.ts      # Pathfinder 연결 서비스
├── searchToRoadViewService.ts        # RoadView 연결 서비스
├── searchToClusterService.ts         # Cluster 연결 서비스
├── searchToPersonaService.ts         # Persona 연결 서비스
├── input-builders/
│   ├── index.ts
│   ├── buildPathfinderInput.ts       # Payload → PathfinderRequest
│   ├── buildRoadViewInput.ts         # Payload → RoadViewRequest
│   ├── buildClusterInput.ts          # Payload → ClusterFinderRequest
│   └── buildPersonaInput.ts          # Payload → PersonaViewRequest
└── repositories/
    └── analysisResultRepository.ts   # 결과 저장 (In-Memory → Prisma)

app/api/search-intelligence/
└── analyze/route.ts                  # 통합 분석 API
```
