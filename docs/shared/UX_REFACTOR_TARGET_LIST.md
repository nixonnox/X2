# UX Refactor Target List

> 즉시 반영 / 순차 반영 / 공통 컴포넌트화 대상 정리

## 즉시 반영 완료

| 화면 | 반영 내용 | 상태 |
|------|----------|------|
| Intelligence 메인 | 문구 해요체 전환, 기술 용어 제거, empty state 개선, 탭 이름 개선 | DONE |
| Intelligence Compare | 비교 타입 카드 선택 전환, 문구 해요체, 상태 메시지 개선 | DONE |
| Bell Dropdown | 문구 해요체 전환 (로딩/에러/빈 상태) | DONE |
| CurrentVsPreviousPanel | "현재 vs 이전" → "이전과 비교", empty/insufficient 문구 개선 | DONE |
| AnalysisHistoryPanel | empty 문구 개선 | DONE |
| KeywordHistoryPanel | empty 문구 개선 | DONE |

## 순차 반영 대상

| 화면 | 반영 내용 | 우선순위 |
|------|----------|---------|
| /notifications 페이지 | 필터 문구, empty state, 페이지네이션 문구 해요체 전환 | HIGH |
| /settings/notifications | 알림 채널 카드 선택 전환, 설정 문구 해요체 | HIGH |
| Dashboard intelligence card | 요약 문구 개선 | MEDIUM |
| IntelligenceStatePanel | 상태 뱃지 문구 (partial/mock/stale) 해요체 | MEDIUM |
| LiveMentionStatusPanel | provider 상태 문구 쉬운 말 | MEDIUM |
| BenchmarkTrendChart | 경고/트렌드 문구 해요체 | MEDIUM |
| IntelligenceSummaryCards | 요약 카드 문구 | LOW |
| BenchmarkDifferentialRing | 차트 레이블 | LOW |
| TaxonomyHeatMatrix | 분류 레이블 | LOW |

## 공통 컴포넌트 후보

| 컴포넌트 | 용도 | 재사용 범위 |
|----------|------|------------|
| EmptyState | 빈 화면 (아이콘+제목+설명+CTA) | 전체 |
| ErrorState | 에러 화면 (아이콘+제목+설명+재시도) | 전체 |
| StatusBadge | 상태 뱃지 (partial/stale/mock/low conf) | Intelligence 전체 |
| CardSelector | 카드형 선택 UI | 전체 |
| ConfidenceBadge | 신뢰도 뱃지 | Intelligence 전체 |
