# Pathfinder/RoadView Frontend Connection Audit

> 기존 호출 구조 → 신규 엔진 연결 구조 전환 감사 보고

## 1. 기존 호출 구조 (Before)

### pathfinder/page.tsx
| 항목 | 기존 상태 |
|------|----------|
| API 호출 | `POST /api/intent/analyze` (intent-engine 직접) |
| 데이터 소스 | `IntentGraphData` (intent-engine 출력) |
| 노드 타입 | 페이지 내 자체 `PathNode` 타입 (intent 노드에서 수동 변환) |
| 엣지 타입 | 페이지 내 자체 `PathEdge` 타입 (intent links에서 수동 변환) |
| 그래프 레이아웃 | `TemporalPhase` (before/current/after) 3열 배치 |
| 필터 | `PhaseFilter` (TemporalPhase) + `IntentFilter` |
| 상태 관리 | useState + inline fetch |
| 에러 처리 | 단순 error message 인라인 표시 |
| 여정 단계 | `SearchJourneyStage` + `JOURNEY_STAGE_LABELS` |
| 경로 표시 | `analysis.data.journey.paths` (TemporalPhase 간 전환 빈도) |

### road-view/page.tsx
| 항목 | 기존 상태 |
|------|----------|
| API 호출 | `POST /api/intent/analyze` (intent-engine 직접) |
| 데이터 소스 | `IntentGraphData` (intent-engine 출력) |
| 브랜드 분석 | 클라이언트 `extractBrandMentions()` 함수 (200줄, 휴리스틱) |
| 뷰 모드 | journey / competitors / gaps (3탭) |
| 갭 분석 | `analysis.data.gapMatrix` 직접 접근 |
| 상태 관리 | useState + inline fetch |
| 에러 처리 | 단순 error message 인라인 표시 |
| 여정 단계 | `TemporalPhase` (before/current/after) 3단계만 |
| 경쟁 분석 | 클라이언트 사이드 브랜드 추출 (단어 분리 기반) |

## 2. 교체된 호출 구조 (After)

### pathfinder/page.tsx
| 항목 | 신규 상태 |
|------|----------|
| API 호출 | `POST /api/pathfinder/analyze` → `analyzePathfinder()` |
| 데이터 소스 | `PathfinderResult` (journey-engine 출력) |
| 노드 타입 | `PathfinderNodeViewModel` ← `JourneyNode` (엔진) |
| 엣지 타입 | `PathfinderEdgeViewModel` ← `JourneyEdge` (엔진) |
| 그래프 레이아웃 | `direction` (before/seed/after) 3열 배치 — Canvas 유지 |
| 필터 | `DirectionFilter` + `IntentFilter` (동적 생성) |
| 상태 관리 | `usePathfinderQuery()` hook |
| 에러 처리 | `JourneyScreenStatePanel` — 6상태 모두 처리 |
| 여정 단계 | `RoadStageType` 6단계 (awareness→advocacy) + 색상 |
| 경로 표시 | `PathfinderPathViewModel[]` — 점수/유형/의도 흐름 포함 |
| 신뢰도 표시 | `lowConfidenceFlag` 뱃지 (노드/상세패널) |

### road-view/page.tsx
| 항목 | 신규 상태 |
|------|----------|
| API 호출 | `POST /api/roadview/analyze` → `analyzeRoadView()` |
| 데이터 소스 | `RoadViewResult` (journey-engine 출력) |
| 스테이지 타입 | `RoadStageViewModel` ← `RoadStage` (엔진) |
| 뷰 모드 | stages / paths / gaps (3탭 — 구조 변경) |
| 갭 분석 | 엔진 `topContentGaps` + `topQuestions` 사용 |
| 상태 관리 | `useRoadViewQuery()` hook |
| 에러 처리 | `JourneyScreenStatePanel` — 6상태 모두 처리 |
| 여정 단계 | `RoadStageType` 6단계 흐름 시각화 + 색상 |
| 경로 분석 | `primaryPath` + `alternativePaths` + `branchPoints` |
| A→B 분석 | `endKeyword` 입력 → 방향성 경로 분석 지원 |
| 신뢰도 표시 | `lowConfidenceFlag` 뱃지 (스테이지별) |

## 3. 제거된 코드

| 파일 | 제거 항목 |
|------|----------|
| pathfinder/page.tsx | `PathNode`, `PathEdge` 자체 타입 정의 |
| pathfinder/page.tsx | `IntentGraphData`, `IntentGraphNode` import |
| pathfinder/page.tsx | `INTENT_CATEGORY_LABELS`, `TEMPORAL_PHASE_LABELS`, `JOURNEY_STAGE_LABELS` import |
| pathfinder/page.tsx | `/api/intent/analyze` fetch 호출 |
| pathfinder/page.tsx | `TemporalPhase` 기반 `PHASE_COLORS` 상수 |
| pathfinder/page.tsx | `analysis.data` 직접 참조 (nodes, links, journey, summary) |
| road-view/page.tsx | `extractBrandMentions()` 함수 (200줄) |
| road-view/page.tsx | `extractBrandName()` 헬퍼 함수 |
| road-view/page.tsx | `BrandMention`, `BrandJourney`, `CompetitorBrand` 타입 |
| road-view/page.tsx | `IntentGraphData`, `IntentCategory`, `TemporalPhase` import |
| road-view/page.tsx | `INTENT_CATEGORY_LABELS`, `TEMPORAL_PHASE_LABELS` import |
| road-view/page.tsx | `/api/intent/analyze` fetch 호출 |
| road-view/page.tsx | `gapMatrix` 직접 접근 |

## 4. 신규 생성 파일

| 파일 | 역할 |
|------|------|
| `features/journey/types/viewModel.ts` | PathfinderNodeVM, EdgeVM, PathVM, RoadStageVM, JourneyScreenState |
| `features/journey/mappers/mapPathfinderToViewModel.ts` | PathfinderResult → view model 변환 + buildJourneyScreenState |
| `features/journey/mappers/mapRoadViewToViewModel.ts` | RoadViewResult → view model 변환 |
| `features/journey/hooks/usePathfinderQuery.ts` | usePathfinderQuery hook |
| `features/journey/hooks/useRoadViewQuery.ts` | useRoadViewQuery hook |
| `features/journey/components/JourneyScreenStatePanel.tsx` | 6상태 배너 컴포넌트 |
| `features/journey/index.ts` | Public API export |
| `app/api/pathfinder/analyze/route.ts` | journey-engine 호출 API |
| `app/api/roadview/analyze/route.ts` | journey-engine 호출 API |

## 5. Canvas PathGraph 재사용

PathGraph 캔버스 컴포넌트는 기존 구조를 유지하면서 어댑터 방식으로 전환:

| 변경 사항 | Before | After |
|-----------|--------|-------|
| 노드 타입 | `PathNode` | `PathfinderNodeViewModel` |
| 열 기준 | `TemporalPhase` | `direction` (before/seed/after) |
| 색상 | `INTENT_COLORS` | `node.intentColor` (view model에 포함) |
| 크기 | `Math.log2(volume)` | `node.displaySize` (엔진에서 계산) |
| 엣지 참조 | `edge.source/target` | `edge.fromNodeId/toNodeId` |
| 레이블 | `TEMPORAL_PHASE_LABELS` | `DIRECTION_LABELS` (간소화) |

## 6. 남은 문제

| 항목 | 상태 | 설명 |
|------|------|------|
| SERP 기반 Jaccard | 미연결 | search-data connector 배치 수집 후 연결 필요 |
| 캐싱 | 미구현 | pathfinder/roadview 결과 캐싱 미적용 |
| A→B 경로 BFS | Phase 3 | 현재는 기존 경로 필터링, Phase 3에서 SERP 기반 BFS 도입 |
| 경로 시각화 | 미구현 | 경로별 색상 하이라이트/애니메이션 미구현 |
| 브랜드 분석 이관 | 제거 | 기존 extractBrandMentions() 제거 — 향후 별도 브랜드 분석 엔진 필요 시 새로 구현 |
