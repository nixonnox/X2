# Current vs Previous Compare Spec

> Date: 2026-03-15
> Status: IMPLEMENTED

## 목적

사용자가 같은 키워드의 현재 분석과 직전 분석 결과를 빠르게 비교하여 변화를 확인할 수 있도록 한다.

## 진입점

- Intelligence 페이지 → "변화" 탭

## 컴포넌트

### CurrentVsPreviousPanel

- **위치:** `components/intelligence/CurrentVsPreviousPanel.tsx`
- **Props:**
  - `hasPreviousRun` — 이전 분석 존재 여부
  - `current` — 현재 run snapshot
  - `previous` — 이전 run snapshot
  - `isLoading` — 로딩 상태
  - `onOpenFullCompare` — 상세 비교 페이지 이동 콜백

## API 연결

| UI 동작 | tRPC Endpoint |
|---------|---------------|
| 비교 데이터 로드 | `intelligence.currentVsPrevious` |
| 상세 비교 | `intelligence.compare` (compare 페이지에서) |

## 비교 항목

| 항목 | 소스 | Delta 표시 |
|------|------|-----------|
| 신뢰도 (confidence) | run.confidence | ↑↓ 퍼센트 변화 |
| 벤치마크 점수 | run.benchmarkComparison.overallScore | ↑↓ 점수 변화 |
| 시그널 품질 | run.signalQuality.overallRichness | RICH/MODERATE/MINIMAL 변화 |
| 데이터 소스 | hasClusterData, hasSocialData, hasBenchmarkData | 이전 vs 현재 비교 |

## UI States

| State | 조건 | 표시 |
|-------|------|------|
| No history | hasPreviousRun === false | 점선 테두리 + "이전 분석 기록이 없습니다" |
| Loading | isLoading | 로딩 스피너 |
| Insufficient | hasPreviousRun && !previous | 경고 + "이전 데이터를 로드할 수 없습니다" |
| Available | current && previous | Delta 비교 테이블 |
| Signal improved | richness 상승 | 초록 하이라이트 |
| Signal degraded | richness 하락 | 주황 하이라이트 |
| Partial compare | current.isPartial or previous.isPartial | 경고 메시지 표시 |
| Stale compare | previous.isMockOnly | "샘플 데이터 기반" 경고 |

## "상세 비교 보기" 동작

- `/intelligence/compare?keyword={keyword}&type=period_vs_period` 로 이동
- compare 페이지에서 full A/B 비교 실행
