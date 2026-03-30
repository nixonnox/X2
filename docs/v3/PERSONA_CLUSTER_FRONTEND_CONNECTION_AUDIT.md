# Persona/Cluster Frontend Connection Audit

> 기존 호출 구조 → 신규 엔진 연결 구조 전환 감사 보고

## 1. 기존 호출 구조 (Before)

### persona/page.tsx
| 항목 | 기존 상태 |
|------|----------|
| API 호출 | `POST /api/intent/analyze` (intent-engine 직접) |
| 데이터 소스 | `IntentGraphData` (intent-engine 출력) |
| 페르소나 생성 | 클라이언트 `generatePersonas()` — 하드코딩 템플릿 5종 |
| 타입 | 페이지 내 자체 `PersonaProfile` 타입 (엔진 타입과 무관) |
| 상태 관리 | useState + inline fetch |
| 에러 처리 | 단순 error message |
| 신뢰도 표시 | 없음 |
| 여정 단계 | `TemporalPhase` (before/current/after) — 3단계만 |

### cluster-finder/page.tsx
| 항목 | 기존 상태 |
|------|----------|
| API 호출 | `POST /api/intent/analyze` (intent-engine 직접) |
| 데이터 소스 | `IntentGraphData.clusters` (KeywordCluster[]) |
| 클러스터 타입 | intent-engine의 `KeywordCluster` 직접 사용 |
| 멤버 조회 | `analysis.data.nodes.filter(n => n.clusterId)` 인라인 |
| GPT 분석 | `POST /api/intent/gpt-analyze` (별도 API) |
| 상태 관리 | useState + inline fetch |
| 카테고리 표시 | 없음 (intent label만) |
| 신뢰도 표시 | 없음 |

## 2. 교체된 호출 구조 (After)

### persona/page.tsx
| 항목 | 신규 상태 |
|------|----------|
| API 호출 | `POST /api/persona/analyze` → `analyzePersonaView()` |
| 데이터 소스 | `PersonaViewResult` (persona-cluster-engine 출력) |
| 페르소나 생성 | 엔진 내부 `buildPersonaProfiles()` — 8 archetype 기반 |
| 타입 | `PersonaViewModel` (view model) ← `PersonaProfile` (엔진) |
| 상태 관리 | `usePersonaQuery()` hook |
| 에러 처리 | `ScreenStatePanel` — loading/empty/error/partial/low confidence/stale |
| 신뢰도 표시 | 카드 + 상세에서 lowConfidenceFlag 표시 |
| 여정 단계 | `RoadStageType` (6단계: interest→advocacy) |

### cluster-finder/page.tsx
| 항목 | 신규 상태 |
|------|----------|
| API 호출 | `POST /api/cluster/analyze` → `analyzeClusterFinder()` |
| 데이터 소스 | `ClusterFinderResult` (persona-cluster-engine 출력) |
| 클러스터 타입 | `ClusterViewModel` ← `IntentCluster` (엔진) |
| 멤버 조회 | `ClusterMembership` 기반 (mapper에서 변환) |
| GPT 분석 | `POST /api/intent/gpt-analyze` (유지 — 기능 호환) |
| 상태 관리 | `useClusterQuery()` hook |
| 카테고리 표시 | 8개 카테고리 라벨 + 색상 표시 |
| 신뢰도 표시 | 클러스터 점수 기반 lowConfidenceFlag |

## 3. 제거된 코드

| 파일 | 제거 항목 |
|------|----------|
| persona/page.tsx | `generatePersonas()` 함수 (170줄) — 하드코딩 템플릿 |
| persona/page.tsx | 자체 `PersonaProfile` 타입 정의 |
| persona/page.tsx | `IntentGraphData` 직접 import |
| persona/page.tsx | `INTENT_CATEGORY_LABELS`, `TEMPORAL_PHASE_LABELS` import |
| persona/page.tsx | `/api/intent/analyze` fetch 호출 |
| cluster-finder/page.tsx | `IntentGraphData`, `KeywordCluster` 직접 import |
| cluster-finder/page.tsx | `analysis.data.nodes` 인라인 필터링 |
| cluster-finder/page.tsx | `/api/intent/analyze` fetch 호출 |

## 4. 신규 생성 파일

| 파일 | 역할 |
|------|------|
| `features/persona-cluster/types/viewModel.ts` | PersonaViewModel, ClusterViewModel, ScreenState 타입 |
| `features/persona-cluster/mappers/mapPersonaClusterToViewModel.ts` | 엔진 출력 → view model 변환 |
| `features/persona-cluster/hooks/usePersonaClusterQuery.ts` | usePersonaQuery, useClusterQuery hook |
| `features/persona-cluster/components/ScreenStatePanel.tsx` | 상태 표시 컴포넌트 |
| `features/persona-cluster/index.ts` | Public API export |
| `app/api/persona/analyze/route.ts` | persona-cluster-engine 호출 API |
| `app/api/cluster/analyze/route.ts` | persona-cluster-engine 호출 API |

## 5. 남은 문제

| 항목 | 상태 | 설명 |
|------|------|------|
| GPT 분석 API | 기존 유지 | `/api/intent/gpt-analyze` 경유 — 향후 persona-cluster 전용으로 분리 가능 |
| 필터 기능 | 미구현 | 기간/카테고리/채널 필터 UI 아직 없음 |
| SERP 기반 Jaccard | 미연결 | search-data connector 배치 수집 후 연결 필요 |
| 캐싱 | 미구현 | persona/cluster 결과 캐싱 미적용 |
| 정렬/탭 | 미구현 | 클러스터 정렬 옵션, 페르소나 탭 전환 미구현 |
