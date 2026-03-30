# Pathfinder/RoadView Frontend Implementation Notes

> 이번 단계에서 실제 반영한 코드 · 남은 과제 · 다음 단계 준비 사항

## 1. 이번 단계에서 반영한 코드

### 1.1 API 라우트 (2개)

| 파일 | 엔드포인트 | 엔진 함수 |
|------|-----------|----------|
| `app/api/pathfinder/analyze/route.ts` | POST /api/pathfinder/analyze | `analyzePathfinder()` |
| `app/api/roadview/analyze/route.ts` | POST /api/roadview/analyze | `analyzeRoadView()` |

- 입력 검증: seedKeyword 필수, 100자 제한
- pathfinder: maxSteps (1~10), maxNodes (10~1000), direction
- roadview: seedKeyword + endKeyword (선택)
- 에러 처리: try/catch → 500 응답 + 에러 메시지

### 1.2 Feature Module (7개)

```
features/journey/
├── index.ts                          # Public API
├── types/viewModel.ts                # View model 타입 정의
├── mappers/
│   ├── mapPathfinderToViewModel.ts   # PathfinderResult → view model
│   └── mapRoadViewToViewModel.ts     # RoadViewResult → view model
├── hooks/
│   ├── usePathfinderQuery.ts         # React hook
│   └── useRoadViewQuery.ts           # React hook
└── components/
    └── JourneyScreenStatePanel.tsx   # 상태 표시 컴포넌트
```

### 1.3 페이지 교체 (2개)

| 페이지 | 변경 사항 |
|--------|----------|
| pathfinder/page.tsx | intent-engine 직접 호출 제거 → `usePathfinderQuery()` hook 사용. `PathNode`/`PathEdge` 자체 타입 제거 → `PathfinderNodeViewModel`/`EdgeViewModel` 사용. Canvas PathGraph 유지 + 어댑터 방식 전환. direction 기반 필터 (before/seed/after). 여정 6단계 + 의도 분포 차트. 경로 목록 (점수/유형/의도흐름). 블루오션 기회 표시. |
| road-view/page.tsx | intent-engine 직접 호출 제거 → `useRoadViewQuery()` hook 사용. `extractBrandMentions()` 200줄 제거. `IntentGraphData` 직접 접근 제거. 6단계 여정 흐름 시각화 (인지→관심→비교→결정→실행→옹호). 스테이지 상세 펼치기. A→B 경로 분석 (endKeyword). 분기점 분석. 콘텐츠 갭/질문 표시. |

### 1.4 데이터 흐름 (Before → After)

**Before (Pathfinder):**
```
User Input → fetch(/api/intent/analyze) → IntentGraphData
  → client-side nodes → PathNode[] 변환
  → client-side links → PathEdge[] 변환
  → Canvas PathGraph 렌더링
```

**After (Pathfinder):**
```
User Input → usePathfinderQuery().analyze(keyword)
  → fetch(/api/pathfinder/analyze)
  → analyzePathfinder() in journey-engine
  → PathfinderResult
  → mapPathfinderResult() → PathfinderNodeViewModel[] + EdgeViewModel[] + PathViewModel[]
  → Canvas PathGraph 렌더링 + JourneyScreenStatePanel
```

**Before (RoadView):**
```
User Input → fetch(/api/intent/analyze) → IntentGraphData
  → client-side extractBrandMentions() → BrandMention[] + CompetitorBrand[]
  → client-side gapMatrix 접근
  → 3탭 렌더링 (journey/competitors/gaps)
```

**After (RoadView):**
```
User Input → useRoadViewQuery().analyze(keyword, { endKeyword })
  → fetch(/api/roadview/analyze)
  → analyzeRoadView() in journey-engine
  → RoadViewResult
  → mapRoadViewResult() → RoadStageViewModel[] + PathViewModel + BranchPointViewModel[]
  → 3탭 렌더링 (stages/paths/gaps) + JourneyScreenStatePanel
```

## 2. 설계 결정

### 2.1 Feature Module 구조 채택
- `features/journey/`에 hook/mapper/type/component 집중
- 페이지 컴포넌트는 feature module의 public API만 사용
- 엔진 타입이 UI 컴포넌트에 직접 노출되지 않음

### 2.2 Canvas PathGraph 재사용
- 기존 ~375줄의 Canvas 렌더링 코드 품질이 높아 유지
- `PathNode` → `PathfinderNodeViewModel` 어댑터 방식 전환
- 노드 색상/크기를 view model에서 제공 (`intentColor`, `displaySize`)

### 2.3 Road View 근본적 구조 변경
- 기존: 브랜드 중심 분석 (클라이언트 사이드 휴리스틱)
- 변경: 6단계 소비자 결정 여정 중심 (엔진 기반)
- `extractBrandMentions()` 제거 → 엔진의 `RoadStage`, `BranchPoint` 사용
- 향후 브랜드 분석은 별도 엔진/페이지로 분리 가능

### 2.4 A→B 경로 분석 추가
- road-view에 endKeyword 입력 필드 추가
- 엔진의 `findDirectedPaths()` 호출 → primaryPath + alternativePaths
- Phase 3에서 SERP 기반 BFS + K-shortest paths로 고도화 예정

### 2.5 Low Confidence 기준
- 패스파인더 노드: `confidenceLevel === "low"` (엔진에서 계산)
- 로드뷰 스테이지: `avgGapScore < 15 && keywordCount < 3`
- 과도한 경고 방지: 뱃지 + 배너에서만 표시, 결과 자체는 숨기지 않음

## 3. 남은 과제

### 단기 (다음 스프린트)
- [ ] 패스파인더 Canvas 경로 하이라이트: 선택한 경로의 노드/엣지 색상 강조
- [ ] 로드뷰 스테이지 전환 애니메이션
- [ ] 필터 기능 확장: 스테이지, 갭스코어 범위 필터
- [ ] 캐싱: pathfinder/roadview 결과 Redis 캐싱
- [ ] 패스파인더-로드뷰 연결: pathfinderResult를 roadview에 전달하는 UX

### 중기
- [ ] SERP 기반 Jaccard similarity 연결 (search-data connector)
- [ ] 배치 분석: 여러 키워드 일괄 여정 분석
- [ ] 브랜드 분석 엔진: 기존 extractBrandMentions 로직을 엔진으로 이관
- [ ] 경로 비교: 두 키워드의 여정 비교 뷰

### 장기
- [ ] 리포트 생성: 여정 분석 리포트 PDF 내보내기
- [ ] 대시보드 통합: 메인 대시보드에 여정 요약 카드
- [ ] 실시간 SERP 데이터: BFS 기반 실시간 여정 탐색

## 4. Backward Compatibility

| 항목 | 호환성 |
|------|--------|
| `/api/intent/analyze` | 유지됨 — 다른 페이지에서 계속 사용 |
| `/api/intent/gpt-analyze` | 유지됨 — 별도 GPT 분석 플로우 |
| `@/lib/intent-engine` 타입 | 유지됨 — journey-engine이 내부적으로 사용 |
| `@/lib/journey-engine` 타입 | 유지됨 — view model mapper에서만 참조 |
| `@/components/shared` | 유지됨 — PageHeader, ChartCard, EmptyState 재사용 |
| recharts 차트 | 유지됨 — 동일 시각화 라이브러리 |

## 5. 테스트 확인 방법

1. **pathfinder/page.tsx**: 키워드 입력 → 분석 → Canvas 그래프 + 6단계 분포 차트 표시 확인
2. **road-view/page.tsx**: 키워드 입력 → 분석 → 6단계 여정 흐름 + 스테이지 상세 확인
3. **A→B 경로**: road-view에서 도착 키워드 입력 → 주요 경로/대안 경로 표시 확인
4. **상태 표시**: 빈 키워드/네트워크 에러 시 JourneyScreenStatePanel 정상 표시 확인
5. **신뢰도**: 낮은 신뢰도 항목에 경고 뱃지 표시 확인
6. **필터**: 패스파인더 방향/의도 필터 동작 확인
