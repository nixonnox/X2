# Frontend State and Error Policy

> loading / empty / error / partial / low confidence / stale 상태 처리 정책

## 1. 상태 유형

### 1.1 Loading State
- **조건**: API 호출 진행 중
- **표시**: 파란색 배경 + 스피너 아이콘 + 안내 메시지
- **메시지 예시**: "소비자 페르소나를 분석하고 있습니다..."
- **동작**: 입력 필드 비활성화, 분석 버튼 비활성화

### 1.2 Empty State (결과 없음)
- **조건**: `status === "success" && isEmpty === true`
- **표시**: 회색 배경 + Info 아이콘
- **메시지**: `"{keyword}"에 대한 충분한 데이터를 찾지 못했습니다. 다른 키워드를 시도해보세요.`
- **동작**: 입력 필드 유지, 다른 키워드 입력 유도

### 1.3 Error State (분석 실패)
- **조건**: `status === "error"`
- **표시**: 빨간색 배경 + AlertCircle 아이콘
- **메시지 구조**:
  - 제목: "분석 실패"
  - 상세: 실제 에러 메시지 또는 "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
- **동작**: 입력 필드 유지, 재시도 가능

### 1.4 Partial State (부분 데이터)
- **조건**: `isPartial === true` (일부 데이터 소스 실패)
- **표시**: 주황색 배경 + AlertTriangle 아이콘
- **메시지**: "일부 데이터 소스에서 수집에 실패하여 부분적인 결과만 표시됩니다."
- **동작**: 결과는 정상 표시, 배너로 안내

### 1.5 Low Confidence State (낮은 신뢰도)
- **조건**: `lowConfidenceItems > 0`
- **표시 위치**:
  - 전체 배너: 주황색 배경, 영향 받는 항목 수 표시
  - 개별 카드: AlertTriangle 아이콘 + "낮은 신뢰도" 뱃지
  - 상세 패널: 신뢰도 % 표시 + 안내 문구
- **메시지**: "{N}개 항목의 신뢰도가 낮습니다. 결과 해석 시 참고해주세요."
- **원칙**: 과한 강조 금지 — 결과는 보여주되 주의만 환기

### 1.6 Stale Data State (오래된 데이터)
- **조건**: `lastUpdatedAt`이 24시간 이상 경과
- **표시**: 회색 배경 + Clock 아이콘
- **메시지**: "마지막 분석: {N}시간 전. 최신 데이터가 아닐 수 있습니다."
- **동작**: 결과 정상 표시, 재분석 유도

## 2. 상태 우선순위

여러 상태가 동시에 해당될 때 표시 순서:

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

## 4. 메시지 작성 원칙

- 한국어 기본
- 친절하고 이해하기 쉽게
- 기술 용어 최소화
- 해결 방법 또는 다음 행동 안내 포함
- 사용자 탓하지 않음

## 5. 구현 위치

- **ScreenStatePanel** (`features/persona-cluster/components/ScreenStatePanel.tsx`)
  - 공통 상태 배너 렌더링
  - loading/error/empty/partial/lowConfidence/stale 모두 처리

- **개별 카드 내 lowConfidenceFlag**
  - PersonaCard: 뱃지 + 상세 패널에 경고
  - ClusterRow: AlertTriangle 아이콘

- **buildScreenState()**
  - mapper에서 계산된 부분 상태를 최종 ScreenState로 조합
  - stale 판단: 24시간 기준 자동 계산
