# Persona/Cluster Frontend Implementation Notes

> 이번 단계에서 실제 반영한 코드 · 남은 과제 · 다음 단계 준비 사항

## 1. 이번 단계에서 반영한 코드

### 1.1 API 라우트 (2개)

| 파일 | 엔드포인트 | 엔진 함수 |
|------|-----------|----------|
| `app/api/persona/analyze/route.ts` | POST /api/persona/analyze | `analyzePersonaView()` |
| `app/api/cluster/analyze/route.ts` | POST /api/cluster/analyze | `analyzeClusterFinder()` |

- 입력 검증: seedKeyword 필수, 100자 제한
- 옵션: maxPersonas, maxClusters, useLLM, includeQuestions
- 에러 처리: try/catch → 500 응답 + 에러 메시지

### 1.2 Feature Module (5개)

```
features/persona-cluster/
├── index.ts                          # Public API
├── types/viewModel.ts                # View model 타입 정의
├── mappers/mapPersonaClusterToViewModel.ts  # 엔진→뷰모델 변환
├── hooks/usePersonaClusterQuery.ts   # React hooks
└── components/ScreenStatePanel.tsx   # 상태 표시 컴포넌트
```

### 1.3 페이지 교체 (2개)

| 페이지 | 변경 사항 |
|--------|----------|
| persona/page.tsx | intent-engine 직접 호출 제거 → `usePersonaQuery()` hook 사용. `generatePersonas()` 하드코딩 제거 → 엔진 `PersonaProfile` 사용. 8 archetype 기반 라벨/색상. 신뢰도 표시 추가. 여정 6단계 표시. |
| cluster-finder/page.tsx | intent-engine 직접 호출 제거 → `useClusterQuery()` hook 사용. `IntentCluster` 기반 view model. 8 카테고리 라벨/색상. 테마/대표질문 표시 추가. 점수/신뢰도 표시. |

### 1.4 데이터 흐름 (Before → After)

**Before:**
```
User Input → fetch(/api/intent/analyze) → IntentGraphData
  → [Persona] client-side generatePersonas() (하드코딩 5종)
  → [Cluster] IntentGraphData.clusters 직접 사용
```

**After:**
```
User Input → usePersonaQuery().analyze(keyword)
  → fetch(/api/persona/analyze)
  → analyzePersonaView() in persona-cluster-engine
  → PersonaViewResult
  → mapPersonaViewResult() → PersonaViewModel[]
  → UI rendering with ScreenStatePanel

User Input → useClusterQuery().analyze(keyword)
  → fetch(/api/cluster/analyze)
  → analyzeClusterFinder() in persona-cluster-engine
  → ClusterFinderResult
  → mapClusterFinderResult() → ClusterViewModel[]
  → UI rendering with ScreenStatePanel
```

## 2. 설계 결정

### 2.1 Feature Module 구조 채택
- `features/persona-cluster/` 에 hook/mapper/type/component 집중
- 페이지 컴포넌트는 feature module의 public API만 사용
- 엔진 타입이 UI 컴포넌트에 직접 노출되지 않음

### 2.2 GPT 분석 API 유지
- `/api/intent/gpt-analyze`는 기존 그대로 유지
- 클러스터 선택 후 GPT 심층 분석은 별도 플로우
- 향후 persona-cluster 전용 GPT 분석으로 분리 가능

### 2.3 ScreenStatePanel 공통 컴포넌트화
- 6가지 상태를 하나의 컴포넌트에서 처리
- 페이지별 custom 메시지 전달 가능 (loadingMessage prop)
- 다른 페이지(pathfinder, roadview)에서도 재사용 가능

### 2.4 Low Confidence 기준
- 페르소나: `confidence < 0.4` (엔진에서 계산된 추론 신뢰도)
- 클러스터: `score < 20` (종합 점수 기반)
- 과도한 경고 방지: 뱃지 + 상세 패널에서만 표시, 결과 자체는 숨기지 않음

## 3. 남은 과제

### 단기 (다음 스프린트)
- [ ] 필터 기능: 기간, 카테고리, 의도, 여정 단계 필터 UI
- [ ] 정렬 옵션: 클러스터 정렬 (크기/점수/갭/트렌드)
- [ ] 캐싱: persona/cluster 분석 결과 Redis 캐싱
- [ ] 페르소나-클러스터 연결 뷰: PersonaClusterLink 시각화

### 중기
- [ ] 탭 구조: 페르소나 목록 / 상세 / 비교 탭
- [ ] search-data connector 연결: 실데이터 기반 클러스터링
- [ ] SERP 기반 Jaccard similarity 연결
- [ ] 배치 분석: 대량 키워드 일괄 분석
- [ ] GPT 분석 전용 API 분리 (persona-cluster 컨텍스트)

### 장기
- [ ] 리포트 생성: 페르소나/클러스터 분석 리포트 PDF 내보내기
- [ ] pathfinder/roadview 연결: 페르소나별 여정 시각화
- [ ] 대시보드 통합: 메인 대시보드에 요약 카드

## 4. Backward Compatibility

| 항목 | 호환성 |
|------|--------|
| `/api/intent/analyze` | 유지됨 — 다른 페이지에서 계속 사용 |
| `/api/intent/gpt-analyze` | 유지됨 — cluster-finder에서 계속 사용 |
| `@/lib/intent-engine` 타입 | 유지됨 — persona-cluster-engine이 내부적으로 사용 |
| `@/components/shared` | 유지됨 — PageHeader, ChartCard, EmptyState 재사용 |
| recharts 차트 | 유지됨 — 동일 시각화 라이브러리 |

## 5. 테스트 확인 방법

1. **persona/page.tsx**: 키워드 입력 → 분석 → 8 archetype 기반 PersonaProfile 카드 표시 확인
2. **cluster-finder/page.tsx**: 키워드 입력 → 분석 → IntentCluster 기반 ClusterViewModel 리스트 확인
3. **상태 표시**: 빈 키워드/네트워크 에러 시 ScreenStatePanel 정상 표시 확인
4. **GPT 분석**: 클러스터 선택 → GPT 분석 버튼 → 결과 표시 확인
5. **신뢰도**: 낮은 신뢰도 항목에 경고 뱃지 표시 확인
