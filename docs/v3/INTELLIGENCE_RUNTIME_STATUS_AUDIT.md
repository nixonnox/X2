# Intelligence Runtime Status Audit

> Date: 2026-03-16

## 항목별 상태 판정

### 1. 분석 결과 DB 저장 → history 조회

| 세부 | 상태 | 근거 |
|------|------|------|
| `analyze` → `saveAnalysisRun` | **완료+검증** | router:50, persistence.saveAnalysisRun, DB smoke test PASS |
| `history` endpoint | **완료+검증** | router:443, `{ runs, totalCount, hasMore }` |
| `loadRun` endpoint | **완료+검증** | router:472 |
| `AnalysisHistoryPanel` UI | **완료+검증** | Phase2 검증 PASS |
| `historyQuery` → UI 연결 | **완료+검증** | page.tsx:92, 분석 전에도 이력 표시 |

**→ 건너뛰기**

### 2. period_vs_period historical persistence

| 세부 | 상태 | 근거 |
|------|------|------|
| `compare` with runId/periodStart/End | **완료+검증** | router:489, analyzeOne() DB 로드 |
| `periodData` endpoint | **완료+검증** | router:773, loadPeriodComparisonData |
| Compare 페이지 날짜 선택기 | **완료+검증** | compare/page.tsx date inputs |
| `periodDataAvailability` 경고 | **완료+검증** | compare/page.tsx:422-448 |
| Stale snapshot 표시 | **완료+검증** | compare/page.tsx:450-467 |

**→ 건너뛰기**

### 3. 저장된 키워드 / 최근 키워드 DB 연동

| 세부 | 상태 | 근거 |
|------|------|------|
| `keywords` endpoint (all/saved/recent) | **완료+검증** | router:951 |
| `recordKeyword` (분석 시 자동 upsert) | **완료+검증** | router:998, page.tsx:81 onSuccess |
| `toggleSaveKeyword` (북마크) | **완료+검증** | router:1048 |
| `KeywordHistoryPanel` UI | **완료+검증** | component 존재 + UI 연결 |
| Quick keyword 버튼 | **완료+검증** | page.tsx:417-427 |

**→ 건너뛰기**

### 4. Benchmark time-series 추이 차트

| 세부 | 상태 | 근거 |
|------|------|------|
| `benchmarkTrend` endpoint | **완료+검증** | router:834, trendSummary 계산 |
| `BenchmarkTrendChart` component | **완료+검증** | Recharts AreaChart, 문구 해요체 |
| `benchmarkTrendQuery` UI 연결 | **완료+검증** | page.tsx:122 |
| Trend direction/volatility 라벨 | **완료+검증** | "올라가는 흐름이에요" 등 |
| Empty state ("데이터가 더 필요해요") | **완료+검증** | BenchmarkTrendChart.tsx |

**→ 건너뛰기**

### 5. A/B 비교 intelligence 차이 하이라이트

| 세부 | 상태 | 근거 |
|------|------|------|
| `compare` mutation + ComparisonService | **완료+검증** | router:489, 5가지 비교 차원 |
| DifferenceScoreBanner (0-100) | **완료+검증** | SVG gradient ring |
| DifferenceCard (area/level/delta/A-B) | **완료+검증** | 9가지 area icon + level styling |
| HighlightCard (taxonomy/benchmark/social) | **완료+검증** | 5가지 type 구분 |
| ActionDeltaPanel | **완료+검증** | new/removed insights, warnings |
| SignalSummaryCard (side A/B) | **완료+검증** | 데이터 소스 뱃지 |
| 비교 타입 카드 선택 | **완료+검증** | 아이콘+제목+설명 카드 |

**→ 건너뛰기**

### 6. /intelligence 진입점/라우트/전용 페이지

| 세부 | 상태 | 근거 |
|------|------|------|
| `/intelligence` 메인 페이지 | **완료+검증** | 8개 탭, Hub header |
| `/intelligence/compare` 비교 페이지 | **완료+검증** | 3가지 비교 타입 |
| Dashboard → Intelligence 카드 | **완료+검증** | 인사이트 허브 카드 |
| Bell → Intelligence deep link | **완료+검증** | actionUrl=/intelligence?keyword= |

**→ 건너뛰기**
