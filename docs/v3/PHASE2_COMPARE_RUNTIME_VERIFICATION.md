# Phase 2: Compare Runtime Verification

> Date: 2026-03-15
> Status: PASS

## 1. Current vs Previous 연결

| 항목 | 상태 | 근거 |
|------|------|------|
| tRPC endpoint 호출 | PASS | `currentVsPreviousQuery` → `trpc.intelligence.currentVsPrevious` |
| 반환 구조 | PASS | `{ hasPreviousRun: boolean, current: FullRun, previous: FullRun \| null }` |
| DB 기반 비교 | PASS | `getCurrentVsPrevious()` → `prisma.intelligenceAnalysisRun.findMany({ take: 2 })` |
| CurrentVsPreviousPanel 연결 | PASS | `hasPreviousRun`, `current`, `previous` props 전달 확인 |
| Delta 계산 | PASS | confidence, benchmarkScore, signalRichness 비교 |
| "상세 비교 보기" 네비게이션 | PASS | `/intelligence/compare?keyword=...&type=period_vs_period` |

## 2. Period Compare 연결

| 항목 | 상태 | 근거 |
|------|------|------|
| URL params 읽기 | PASS | `useSearchParams().get("type")`, `get("leftRunId")`, `get("rightRunId")` |
| 날짜 선택기 표시 | PASS | `comparisonType === "period_vs_period"` → date input 렌더링 |
| runId 전달 | PASS | `handleCompare`에서 `left.runId`, `right.runId` spread |
| periodStart/End 전달 | PASS | ISO date string으로 mutation input에 포함 |
| 백엔드 period 처리 | PASS | `analyzeOne()`: runId → DB 로드 / periodStart+End → `getRunsForPeriod()` / fallback → 라이브 분석 |
| periodDataAvailability 반환 | PASS | `leftHasHistoricalData`, `rightHasHistoricalData`, `insufficientDataWarning` |

## 3. Historical Persistence 기반 확인

| 확인 항목 | 상태 | 설명 |
|-----------|------|------|
| Compare가 현재값만 사용하지 않는가? | PASS | `runId` 또는 `periodStart/End` 지정 시 DB에서 과거 run 로드 (isStaleBased: true) |
| 과거 데이터가 실제 DB 저장 결과인가? | PASS | `getAnalysisRun(runId)` / `getRunsForPeriod()` → `prisma.intelligenceAnalysisRun` 직접 쿼리 |
| Fallback 시 사용자 인지 가능한가? | PASS | `insufficientDataWarning` + `isStaleBased` 뱃지 표시 |

## 4. 이력 페이지 → Compare 연결

| 흐름 | 상태 | URL 구조 |
|------|------|---------|
| 이력에서 "비교" 클릭 | PASS | `/intelligence/compare?keyword={kw}&leftRunId={currentId}&rightRunId={clickedId}&type=period_vs_period` |
| "상세 비교 보기" | PASS | `/intelligence/compare?keyword={kw}&type=period_vs_period` |
| Compare 페이지에서 URL 읽기 | PASS | `searchParams.get("type")`, `get("leftRunId")`, `get("rightRunId")` → state 초기화 |
