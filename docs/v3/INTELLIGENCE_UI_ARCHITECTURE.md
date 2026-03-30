# Intelligence UI Architecture

## 개요

Vertical Intelligence의 프론트엔드 구조를 정의한다. 검색/소셜/댓글/벤치마크 시그널을 통합 시각화하여, 업종별 인텔리전스 결과를 직관적으로 탐색할 수 있도록 한다.

---

## 화면 구조

- **vertical-preview** 페이지에 Intelligence Panel을 통합
- 5개 탭으로 구성:

| 탭 | 설명 |
|----|------|
| Intelligence 요약 | 시그널 품질 요약 + 4개 미니 카드 |
| 키워드 확장 그래프 | SVG 방사형 확장 시각화 |
| 벤치마크 비교 | baseline vs actual 링 게이지 |
| 시그널 융합 | 검색/소셜/댓글 3채널 레이어 |
| Taxonomy 분포 | 카테고리별 히트맵 |

---

## 컴포넌트 목록

### IntelligenceSummaryCards

- 시그널 품질 표시
- 4개 미니 카드: Taxonomy / Benchmark / Social / Fusion
- Confidence bar 포함

### IntelligenceRadialGraph

- SVG 방사형 확장 시각화
- Center → Taxonomy → Blocks 구조
- 키워드 간 관계를 시각적으로 표현

### BenchmarkDifferentialRing

- SVG 링 게이지 형태
- Baseline vs Actual 비교 시각화
- 메트릭별 아크 세그먼트로 구분

### SignalFusionOverlayPanel

- 3개 시그널 레이어 시각화
- 검색 / 소셜 / 댓글 → 통합 시그널
- 레이어별 강도 및 융합 결과 표시

### TaxonomyHeatMatrix

- 카테고리별 히트맵
- 업종별 Taxonomy 분포 시각화
- 색상 강도로 클러스터 밀도 표현

### IntelligenceStatePanel

- 데이터 품질 및 상태 배너
- 현재 인텔리전스 데이터 상태를 사용자에게 안내

---

## 데이터 흐름

```
vertical-preview page
  → useCurrentProject()
  → comment.sentimentStats + comment.listByProject (tRPC)
  → 댓글 데이터 → socialDataPayload 변환 (useMemo)
  → apply mutation에 socialData로 전달
  → apply response의 intelligence 섹션
  → 시각화 컴포넌트에 props 전달
```

### 상세 흐름

1. **vertical-preview page**에서 `useCurrentProject()`로 프로젝트 정보 조회
2. `comment.sentimentStats`와 `comment.listByProject`로 댓글/감성 데이터 가져옴
3. 댓글 데이터를 `socialDataPayload`로 변환 (useMemo 사용)
4. `apply` mutation 호출 시 `socialData`로 전달
5. 서버 응답의 `intelligence` 섹션을 각 시각화 컴포넌트에 props로 전달

---

## 상태 처리

각 상태별 한국어 메시지를 제공하여 사용자가 현재 데이터 상태를 명확히 파악할 수 있도록 한다.

| 상태 | 설명 | 메시지 예시 |
|------|------|------------|
| `loading` | 데이터 로딩 중 | "인텔리전스 데이터를 불러오는 중입니다..." |
| `empty` | 데이터 없음 | "분석할 데이터가 없습니다." |
| `partial` | 일부 데이터만 존재 | "일부 시그널만 수집되었습니다." |
| `stale` | 오래된 데이터 | "데이터가 오래되었습니다. 새로고침을 권장합니다." |
| `low confidence` | 신뢰도 낮음 | "시그널 신뢰도가 낮습니다." |
| `insufficient coverage` | 커버리지 부족 | "충분한 데이터가 수집되지 않았습니다." |
| `error` | 오류 발생 | "데이터 처리 중 오류가 발생했습니다." |

---

## 파일 구조

```
apps/web/src/components/intelligence/
├── IntelligenceSummaryCards.tsx
├── IntelligenceRadialGraph.tsx
├── BenchmarkDifferentialRing.tsx
├── SignalFusionOverlayPanel.tsx
├── TaxonomyHeatMatrix.tsx
└── IntelligenceStatePanel.tsx
```
