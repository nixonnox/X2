# Journey Frontend State and Error Policy

> pathfinder / roadview 페이지의 loading / empty / error / partial / low confidence / stale 상태 처리 정책

## 1. 상태 유형

### 1.1 Loading State
- **조건**: API 호출 진행 중 (`status === "loading"`)
- **패스파인더**: "검색 여정을 분석하고 있습니다..."
- **로드뷰**: "소비자 결정 여정을 분석하고 있습니다..."
- **동작**: 입력 필드 비활성화, 분석 버튼 비활성화

### 1.2 Empty State (결과 없음)
- **조건**: `status === "success" && isEmpty === true`
- **표시**: 회색 배경 + Info 아이콘
- **메시지**: `"{keyword}"에 대한 충분한 데이터를 찾지 못했습니다.`
- **동작**: 입력 필드 유지, 다른 키워드 입력 유도

### 1.3 Error State (분석 실패)
- **조건**: `status === "error"`
- **표시**: 빨간색 배경 + AlertCircle 아이콘
- **메시지 구조**: 제목 "분석 실패" + 상세 에러 메시지
- **동작**: 입력 필드 유지, 재시도 가능

### 1.4 Partial State (부분 데이터)
- **조건**: `isPartial === true`
- **표시**: 주황색 배경 + AlertTriangle 아이콘
- **메시지**: "일부 데이터 소스에서 수집에 실패하여 부분적인 결과만 표시됩니다."
- **동작**: 결과는 정상 표시, 배너로 안내

### 1.5 Low Confidence State (낮은 신뢰도)
- **패스파인더 기준**: `JourneyNode.confidenceLevel === "low"`
- **로드뷰 기준**: `avgGapScore < 15 && keywordCount < 3`
- **표시 위치**:
  - 전체 배너: 주황색, 영향 받는 항목 수 표시
  - 패스파인더 노드 상세: AlertTriangle + "낮은 신뢰도" 뱃지
  - 로드뷰 스테이지: AlertTriangle 아이콘
- **원칙**: 과한 강조 금지 — 결과는 보여주되 주의만 환기

### 1.6 Stale Data State (오래된 데이터)
- **조건**: `lastUpdatedAt`이 24시간 이상 경과
- **표시**: 회색 배경 + Clock 아이콘
- **메시지**: "마지막 분석: {N}시간 전. 최신 데이터가 아닐 수 있습니다."

## 2. 상태 우선순위

1. Error (최우선)
2. Loading
3. Empty
4. Partial
5. Low Confidence
6. Stale Data

## 3. 상태별 UI 컬러 코드

| 상태 | 배경색 | 아이콘 색 | 텍스트 색 |
|------|--------|----------|----------|
| Loading | `bg-blue-50` | `text-blue-600` | `text-blue-700` |
| Error | `bg-red-50` | `text-red-500` | `text-red-700` |
| Empty | `bg-gray-50` | `text-gray-500` | `text-gray-700` |
| Partial | `bg-amber-50` | `text-amber-500` | `text-amber-700` |
| Low Confidence | `bg-orange-50` | `text-orange-400` | `text-orange-700` |
| Stale Data | `bg-gray-50` | `text-gray-400` | `text-gray-600` |

## 4. 구현 위치

- **JourneyScreenStatePanel** (`features/journey/components/JourneyScreenStatePanel.tsx`)
  - 공통 상태 배너 렌더링
  - loading/error/empty/partial/lowConfidence/stale 모두 처리

- **개별 요소 내 lowConfidenceFlag**
  - Pathfinder 노드 상세: 뱃지 + 상세 패널에 경고
  - RoadView 스테이지: AlertTriangle 아이콘

- **buildJourneyScreenState()**
  - mapper에서 계산된 부분 상태를 최종 JourneyScreenState로 조합
  - stale 판단: 24시간 기준 자동 계산

## 5. persona-cluster와의 일관성

| 항목 | persona-cluster | journey |
|------|-----------------|---------|
| Screen State 타입 | `PersonaClusterScreenState` | `JourneyScreenState` |
| Panel 컴포넌트 | `ScreenStatePanel` | `JourneyScreenStatePanel` |
| 상태 빌더 | `buildScreenState()` | `buildJourneyScreenState()` |
| 컬러 코드 | 동일 | 동일 |
| 상태 우선순위 | 동일 | 동일 |
| 메시지 원칙 | 한국어/친절/기술용어 최소화 | 동일 |
