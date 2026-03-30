# Phase 2: Gap List

> Date: 2026-03-15
> Total: 0 S0, 1 S1 (수정 완료), 3 S2, 2 S3

## S0 — 핵심 흐름 불성립

**없음**

## S1 — 출시 전 반드시 수정

### S1-1. History/Compare 쿼리 종속성 (수정 완료)

- **문제:** `historyQuery`와 `currentVsPreviousQuery`가 `analyzeMutation.data?.seedKeyword`에 종속. 분석 실행 전이나 페이지 새로고침 시 이력/비교 데이터가 표시되지 않음
- **영향:** 사용자가 과거 이력에 접근하려면 반드시 새 분석을 먼저 실행해야 함
- **수정:** `activeKeywordForHistory` 도입 — analysis result 또는 input seedKeyword 사용. `historyQuery.enabled`를 `!!projectId`로 변경. Empty state에 `AnalysisHistoryPanel` 추가.
- **상태:** FIXED (2026-03-15)

## S2 — 제한 오픈 가능

### S2-1. Period date picker가 native HTML input

- **현상:** `<input type="date">`로 구현
- **영향:** UX 제한적 — 브라우저별 스타일 불일치, 범위 선택 직관성 부족
- **수정 방향:** 캘린더 date range picker 컴포넌트 적용
- **우선순위:** S2

### S2-2. 이력에서 로드한 run의 전체 결과 미표시

- **현상:** 과거 run 클릭 시 "변화" 탭에서 요약 정보만 표시 (키워드, 업종, 신뢰도, 분석일시)
- **영향:** 과거 분석의 전체 시각화(radial graph, benchmark ring 등)를 볼 수 없음
- **수정 방향:** 로드된 run으로 전체 intelligence 결과 뷰를 재현
- **우선순위:** S2

### S2-3. 전체 이력 보기 시 키워드 혼합

- **현상:** `seedKeyword` 없이 history 호출 시 모든 키워드의 이력이 혼합 표시
- **영향:** 키워드가 많아지면 목록이 혼잡해질 수 있음
- **수정 방향:** 키워드별 그루핑 또는 필터 UI 추가
- **우선순위:** S2

## S3 — 개선 권장

### S3-1. Compare 페이지에서 이력 run 직접 선택 UI 부재

- **현상:** runId는 URL param으로만 전달 가능. Compare 페이지 내에서 과거 run을 검색/선택하는 UI 없음
- **수정 방향:** Compare 페이지에 run selector dropdown 추가
- **우선순위:** S3

### S3-2. History pagination UI 미구현

- **현상:** `hasMore` 플래그는 존재하나 "더 보기" 클릭 시 offset 증가 로직 미연결
- **수정 방향:** onLoadMore 콜백에서 offset state 관리
- **우선순위:** S3
