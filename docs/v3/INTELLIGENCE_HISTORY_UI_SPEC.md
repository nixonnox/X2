# Intelligence History UI Spec

> Date: 2026-03-15
> Status: IMPLEMENTED

## 목적

사용자가 Intelligence 화면에서 과거 분석 이력을 조회하고, 저장된 분석 결과를 다시 로드할 수 있도록 한다.

## 진입점

1. **Intelligence 페이지 → "이력" 탭** (`activeSection === "history"`)
   - 분석 실행 후 section nav에 "이력" 탭이 추가됨
   - 과거 분석 목록을 시간순(최신 먼저) 표시

2. **Intelligence 페이지 → "변화" 탭** (`activeSection === "changes"`)
   - 현재 vs 이전 비교 패널
   - 과거 run 로드 시 상세 정보 표시

3. **Empty state에서 키워드 히스토리** — 분석 기록이 있으면 빈 화면에서도 표시

## 컴포넌트

### AnalysisHistoryPanel

- **위치:** `components/intelligence/AnalysisHistoryPanel.tsx`
- **Props:**
  - `runs` — 분석 이력 배열 (id, seedKeyword, industryType, confidence, analyzedAt 등)
  - `isLoading` — 로딩 상태
  - `hasMore` — 추가 로드 가능 여부
  - `onLoadRun(runId)` — 과거 분석 로드 콜백
  - `onCompareWithCurrent(runId)` — 현재와 비교 콜백
  - `currentRunId` — 현재 활성 run ID
- **UI 상태:**
  - Loading: skeleton rows
  - Empty: "분석 이력이 없습니다" 메시지
  - Populated: 이력 목록 (접기/펼치기 가능)
  - Current run 표시 (보라색 하이라이트)

### KeywordHistoryPanel (기존)

- 키워드별 분석 횟수, 마지막 분석 시간, 북마크
- "이력" 탭 하단에 배치

## API 연결

| UI 동작 | tRPC Endpoint | 설명 |
|---------|---------------|------|
| 이력 조회 | `intelligence.history` | 프로젝트+키워드별 분석 이력 |
| Run 로드 | `intelligence.loadRun` | 특정 run 상세 로드 |
| 키워드 목록 | `intelligence.keywords` | 최근/저장 키워드 |

## UI States

| State | 조건 | 표시 |
|-------|------|------|
| No history | runs.length === 0 | 빈 아이콘 + "분석 이력이 없습니다" |
| Loading | isLoading | skeleton 3줄 |
| Populated | runs.length > 0 | 이력 목록 |
| Current run | run.id === currentRunId | 보라색 하이라이트, "▶" 마커 |
| Partial data | run.isPartial | "부분" 뱃지 |
| Mock data | run.isMockOnly | "샘플" 뱃지 |

## 과거 Run 로드 흐름

1. 사용자가 이력 목록에서 과거 run 클릭
2. `loadedRunId` state 설정 → `intelligence.loadRun` query 실행
3. "변화" 탭으로 자동 전환
4. 과거 분석 결과 카드 표시 (키워드, 업종, 신뢰도, 분석일시)
5. "닫기" 버튼으로 과거 run 패널 해제
