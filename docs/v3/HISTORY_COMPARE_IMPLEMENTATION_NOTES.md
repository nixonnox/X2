# History & Compare Implementation Notes

> Date: 2026-03-15
> Status: IMPLEMENTED

## 변경 파일 목록

### 신규 파일

| File | Purpose |
|------|---------|
| `apps/web/src/components/intelligence/AnalysisHistoryPanel.tsx` | 분석 이력 목록 컴포넌트 |
| `apps/web/src/components/intelligence/CurrentVsPreviousPanel.tsx` | 현재 vs 이전 비교 컴포넌트 |

### 수정 파일

| File | Changes |
|------|---------|
| `apps/web/src/app/(dashboard)/intelligence/page.tsx` | "변화", "이력" 탭 추가, history/currentVsPrevious query 연결, loadRun 연결 |
| `apps/web/src/app/(dashboard)/intelligence/compare/page.tsx` | period_vs_period 날짜 선택기, URL params (type, leftRunId, rightRunId), periodDataAvailability 경고, stale snapshot 표시 |
| `packages/api/src/services/intelligence/intelligence-persistence.service.ts` | AnalysisHistoryItem에 isMockOnly, benchmarkComparison 추가, select clause 업데이트 |
| `packages/api/src/routers/intelligence.ts` | history endpoint 반환값을 `{ runs, totalCount, hasMore }` 구조로 변경 |

## 아키텍처 결정

### 1. History 조회 — 기존 API 활용

`intelligence.history` tRPC endpoint가 이미 존재했으므로 프론트엔드 연결만 수행.
반환값을 `{ runs, totalCount, hasMore }` 구조로 wrap하여 pagination 지원.

### 2. Current vs Previous — 별도 패널

`intelligence.currentVsPrevious` endpoint를 활용하여 최근 2개 run을 비교.
별도 탭("변화")에 배치하여 분석 후 자연스럽게 접근 가능.

### 3. Period Compare — URL Parameter 기반

Compare 페이지에 `type=period_vs_period&leftRunId=...&rightRunId=...` URL params 지원.
Intelligence 이력 페이지에서 "비교" 클릭 시 이 URL로 이동.

### 4. Run 로드 — 변화 탭에서 표시

이력에서 과거 run 클릭 → `loadedRunId` state → `intelligence.loadRun` query → "변화" 탭에서 상세 표시.

## UI State 처리 요약

| State | Component | Handling |
|-------|-----------|----------|
| No history | AnalysisHistoryPanel | 빈 아이콘 + 안내 메시지 |
| No previous | CurrentVsPreviousPanel | 점선 테두리 + "이전 분석 기록이 없습니다" |
| Insufficient history | CurrentVsPreviousPanel | 경고 아이콘 + "데이터를 로드할 수 없습니다" |
| Compare unavailable | CurrentVsPreviousPanel | hasPreviousRun=false 상태 표시 |
| Partial compare | CurrentVsPreviousPanel | "부분 데이터 기반" 경고 |
| Stale snapshot | Compare page | "과거 저장 데이터 (날짜)" 뱃지 |
| Period data insufficient | Compare page | 주황 경고 + Side별 상태 표시 |
| Mock-only compare | CurrentVsPreviousPanel, AnalysisHistoryPanel | "샘플" 뱃지 |

## Blockers

| # | Description | Impact | Priority |
|---|-------------|--------|----------|
| 1 | 아직 분석 데이터가 DB에 없으므로 이력/비교가 빈 상태 | 분석을 2회 이상 실행해야 비교 가능 | Expected |
| 2 | Period date picker가 native HTML input | UX 제한적 (향후 캘린더 UI 권장) | LOW |
| 3 | 이력에서 run 로드 시 전체 fusionResult를 표시하지 않음 | "변화" 탭에서 요약만 표시 | LOW |

## 다음 단계

1. 분석 2회 이상 실행하여 이력/비교 E2E 검증
2. 캘린더 date picker 컴포넌트 적용 (UX 개선)
3. 이력에서 로드한 run의 전체 결과를 intelligence 탭에서 재현
4. Notification과 history 연결 (알림에서 과거 분석으로 deep link)
