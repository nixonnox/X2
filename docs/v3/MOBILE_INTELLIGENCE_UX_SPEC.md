# Mobile Intelligence UX Spec

## 개요

intelligence 화면의 모바일 반응형 설계

## 디바이스별 레이아웃

- **Desktop (>=640px)**: 멀티 패널, side panel drill-down, 풀 사이즈 그래프
- **Mobile (<640px)**: 스택 레이아웃, bottom sheet drill-down, 축소 그래프

## 컴포넌트별 반응형 처리

1. **IntelligenceSummaryCards**: grid-cols-2 (mobile) → grid-cols-4 (desktop)
2. **IntelligenceRadialGraph**: max-w-[320px] (mobile) → max-w-[500px] (desktop)
3. **BenchmarkDifferentialRing**: flex-col (mobile, 링 위 + 범례 아래) → flex-row (desktop, 나란히)
4. **EvidenceSidePanel**: bottom sheet 80vh (mobile) → right slide-in 400px (desktop)
5. **탭 네비게이션**: 가로 스크롤 가능 (모바일에서 5개 탭이 넘칠 수 있음)

## 모바일 EvidenceSidePanel (bottom sheet)

- inset-x-0 bottom-0, max-h-[80vh]
- rounded-t-2xl 상단 둥근 모서리
- translateY 애니메이션 (아래에서 올라옴)
- 배경 반투명 오버레이

## 모바일 탐색 흐름

1. 요약 카드 → 핵심 수치 한눈에
2. 탭 전환 → 세부 시각화
3. 노드 터치 → bottom sheet 상세
4. 스크롤 → 추가 정보

## 터치 UX

- 최소 터치 영역 44px
- 노드 간 충분한 간격
- 스와이프 close (bottom sheet)
