# X2 UX Policy Application Notes

> 실제 반영한 코드 변경, 공통화 현황, 남은 과제

## 반영 완료 파일 (13개)

| 파일 | 변경 항목 |
|------|----------|
| `intelligence/page.tsx` | 문구 해요체, 기술 용어 제거, empty state, 업종 카드, 탭 이름 |
| `intelligence/compare/page.tsx` | 비교 타입 카드 선택, 문구 해요체, helper text 간결화, 상태 메시지 |
| `top-bar.tsx` | Bell dropdown 문구 해요체 (로딩/에러/빈 상태) |
| `CurrentVsPreviousPanel.tsx` | "현재 vs 이전" → "이전과 비교", empty/insufficient 문구 |
| `AnalysisHistoryPanel.tsx` | empty 문구 해요체 |
| `KeywordHistoryPanel.tsx` | empty 문구 개선 |
| `IntelligenceStatePanel.tsx` | 7개 상태 메시지 전부 해요체, 기술 용어 제거 |
| `LiveMentionStatusPanel.tsx` | 영어 라벨 → 한국어, 기술 용어 제거, 문구 해요체 |
| `notifications/page.tsx` | 전체 문구 해요체, empty state 개선, 검색 placeholder |
| `BenchmarkTrendChart.tsx` | 트렌드 방향 라벨, 변동성 라벨, empty state 해요체 |
| `settings/notifications/page.tsx` | 전체 문구 해요체, 기술 용어 제거 (20개+), 섹션 제목 개선 |

## 카드 선택 전환 현황

| 영역 | 이전 | 이후 | 상태 |
|------|------|------|------|
| 비교 방식 선택 | 칩 버튼 3개 | 아이콘+제목+설명 카드 3개 | DONE |
| 업종 선택 | 칩 버튼 4개 | 아이콘+이름+설명 버튼 4개 | DONE |
| 알림 채널 선택 | 체크박스 | (TODO) 카드형 | TODO |
| 문서 형식 선택 | (해당 없음) | (해당 없음) | N/A |

## 공통 패턴 정리

### 상태 메시지 패턴 (모든 화면에서 일관 사용)
- Loading: "~하고 있어요"
- Empty: "아직 ~가 없어요. ~하면 여기에 ~가 나타나요."
- Error: "~하지 못했어요. 잠시 후 다시 ~하면 볼 수 있어요."
- Partial: "일부 데이터만 먼저 반영했어요."
- Stale: "최신 데이터는 아니에요. ~할 때 참고해 주세요."
- Low confidence: "신뢰도가 낮아요. 참고용으로 봐주세요."

### 버튼 패턴
- 주 CTA: "분석 시작", "비교 시작"
- 보조 CTA: "자세히 비교하기", "자세히 보기"
- 리셋: "닫기", "초기화"

## 아직 남은 과제

| 화면/컴포넌트 | 남은 작업 | 우선순위 |
|-------------|----------|---------|
| `/settings/notifications` | ~~알림 설정 해요체 전환~~ DONE, 채널 카드화 | MEDIUM |
| `dashboard-view.tsx` | Intelligence 요약 카드 문구 | MEDIUM |
| `IntelligenceSummaryCards.tsx` | 요약 카드 내부 문구 | MEDIUM |
| `BenchmarkTrendChart.tsx` | 트렌드 설명 문구 | MEDIUM |
| `SignalFusionOverlayPanel.tsx` | 신호 종합 패널 문구 | LOW |
| `TaxonomyHeatMatrix.tsx` | 히트맵 레이블 | LOW |
| `BenchmarkDifferentialRing.tsx` | 차트 레이블 | LOW |
| EmptyState 공통 컴포넌트 | 재사용 가능한 컴포넌트 추출 | MEDIUM |
| ErrorState 공통 컴포넌트 | 재사용 가능한 컴포넌트 추출 | MEDIUM |
