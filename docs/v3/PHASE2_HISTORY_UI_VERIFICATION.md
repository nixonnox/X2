# Phase 2: History UI Verification

> Date: 2026-03-15
> Status: PASS (S1 1건 수정 완료)

## 1. History 조회 진입점

| 항목 | 상태 | 근거 |
|------|------|------|
| "이력" 탭 존재 | PASS | section nav에 "이력" 탭 추가됨 (result 존재 시) |
| Empty state에서 이력 접근 | PASS (수정 후) | 분석 실행 전에도 `AnalysisHistoryPanel`이 empty state에 표시됨 |
| `trpc.intelligence.history` 호출 | PASS | `historyQuery`가 projectId 기반으로 호출, seedKeyword 필터 적용 |
| 분석 실행 전 이력 표시 | PASS (수정 후) | `historyQuery.enabled`를 `!!projectId`로 변경 — 분석 없이도 이력 조회 가능 |

## 2. 이력 항목 표시

| 항목 | 상태 | 근거 |
|------|------|------|
| 분석 시점 | PASS | `formatDate()` + `formatRelativeTime()` 표시 |
| 업종 | PASS | `INDUSTRY_COLORS` 기반 뱃지 표시 (BEAUTY/FNB/FINANCE/ENTERTAINMENT) |
| 신뢰도 | PASS | `ConfidenceBadge` — Shield 아이콘 + 퍼센트 |
| 부분 데이터 | PASS | `isPartial` → "부분" amber 뱃지 |
| 샘플 데이터 | PASS | `isMockOnly` → "샘플" red 뱃지 |
| 현재 run 구분 | PASS | violet 하이라이트 + "▶" 마커 |

## 3. DB 연결 검증

| 항목 | 상태 | 근거 |
|------|------|------|
| history → DB 쿼리 | PASS | `IntelligencePersistenceService.getAnalysisHistory()` → `prisma.intelligenceAnalysisRun.findMany()` |
| loadRun → DB 쿼리 | PASS | `getAnalysisRun(id)` → `prisma.intelligenceAnalysisRun.findUnique()` |
| select 절에 필요 필드 포함 | PASS | `isMockOnly`, `benchmarkComparison`, `signalQuality` 모두 포함 |
| 반환 구조 정합 | PASS | `{ runs, totalCount, hasMore }` 구조 |

## 4. 수정 사항

### S1-FIX: History/CurrentVsPrevious 쿼리 종속성 수정

- **문제:** `historyQuery`가 `analyzeMutation.data?.seedKeyword`에 종속 → 분석 실행 전이나 페이지 새로고침 시 이력 조회 불가
- **수정:** `activeKeywordForHistory` 변수 도입 — analysis result 또는 input의 seedKeyword 사용
- **수정:** `historyQuery.enabled` 조건을 `!!projectId`로 완화 — seedKeyword 없이도 전체 이력 조회 가능
- **수정:** Empty state에 `AnalysisHistoryPanel` 추가 — 분석 전에도 과거 이력 표시
