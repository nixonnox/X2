# Phase 2: Compare State & UX Verification

> Date: 2026-03-15
> Status: PASS (16/16 항목)

## 1. CurrentVsPreviousPanel 상태 처리

| UI State | 상태 | 시각 요소 |
|----------|------|----------|
| No history (hasPreviousRun=false) | PASS | 점선 테두리 (border-dashed border-gray-200), gray 아이콘, "이전 분석 기록이 없습니다" 메시지 |
| Insufficient data (previous=null) | PASS | amber 점선 테두리, AlertTriangle 아이콘, "데이터를 로드할 수 없습니다" 메시지 |
| Loading | PASS | Loader2 스피너 |
| Available (둘 다 있음) | PASS | Delta 지표 + 데이터 소스 비교 |
| Signal improved | PASS | emerald 배경 + TrendingUp + "시그널 품질: X → Y" |
| Signal degraded | PASS | amber 배경 + TrendingDown + "시그널 품질: X → Y" |
| Partial compare | PASS | "현재/이전 분석이 부분 데이터 기반입니다" 경고 |
| Mock compare | PASS | "샘플 데이터 기반" 경고 |

## 2. AnalysisHistoryPanel 상태 처리

| UI State | 상태 | 시각 요소 |
|----------|------|----------|
| Empty | PASS | Clock 아이콘 + "분석 이력이 없습니다" |
| Loading | PASS | Skeleton rows (3개) |
| Populated | PASS | 시간순 목록, 접기/펼치기 |
| Current run 구분 | PASS | violet-50 배경, violet-200 테두리, "▶" 마커 |
| 비교 버튼 (hover) | PASS | `opacity-0 group-hover:opacity-100`, 비현재 run에만 표시 |

## 3. Compare 페이지 상태 처리

| UI State | 상태 | 시각 요소 |
|----------|------|----------|
| Period data insufficient (양쪽 없음) | PASS | amber 배경 + "양쪽 모두 저장된 과거 데이터가 없습니다" + A/B 뱃지 (red) |
| Period data insufficient (한쪽 없음) | PASS | amber 배경 + "한쪽의 과거 데이터가 부족합니다" + 색상 분리된 A/B 뱃지 |
| Stale snapshot | PASS | blue 배경 + "과거 저장 데이터 (날짜)" — 실제 날짜 표시 |
| Difference score visualization | PASS | SVG 원형 게이지 (0-100), 5단 색상 바, "유사/일부 차이/주목/큰 차이/극심" |

## 4. 차이 하이라이트 품질

| 항목 | 상태 | 설명 |
|------|------|------|
| DifferenceCard — 영역 구분 | PASS | 아이콘으로 구분: SIGNAL_QUALITY=Shield, TAXONOMY=Search, BENCHMARK=TrendingUp, SOCIAL=MessageSquare |
| DifferenceCard — 수준 시각화 | PASS | CRITICAL=빨간 테두리+그림자, WARNING=주황, INFO=파랑, NEUTRAL=회색 |
| DifferenceCard — Delta bar | PASS | 그라데이션 바 (emerald/red/gray), 폭 = delta 크기 비례 |
| DifferenceCard — A/B 값 표시 | PASS | "A: {left}" → "B: {right}" 뱃지 (blue/violet) |
| HighlightCard — 유형 구분 | PASS | taxonomy=teal, benchmark=violet, social=blue, signal=emerald, warning=amber |
| 단순 숫자 나열이 아닌가? | PASS | 해석 텍스트 (interpretation), 레벨별 크기 차등, 화살표 방향, 좌우 값 비교 |

## 5. "현재" vs "과거" 혼동 가능성

| 항목 | 상태 | 설명 |
|------|------|------|
| CurrentVsPreviousPanel 시간 표시 | PASS | 상단에 "이전 시간 → 현재 시간" 화살표 |
| 데이터 소스 카드 | PASS | 좌="이전" (gray 배경), 우="현재" (violet 배경) |
| isStaleBased 뱃지 | PASS | Clock 아이콘 + "과거 데이터" 텍스트 |
| Compare 페이지 Side A/B | PASS | A=blue, B=violet 색상 일관 유지 |
