# Vertical Preview ViewModel Spec

> VerticalPreviewViewModel 구조와 데이터 흐름

## 1. ViewModel 계층

```
VerticalPreviewViewModel (전체 화면)
├── InputSummaryViewModel          — 입력 요약 카드
├── SuggestionBadgeViewModel       — 업종 추천 뱃지
├── IndustryColumnViewModel[]      — 4개 업종 헤더 (×4)
├── ComparisonSectionViewModel[]   — 비교 섹션 (×7)
│   └── ComparisonRowViewModel[]   — 비교 행 (섹션당 N개)
│       └── ComparisonCellViewModel[] — 비교 셀 (행당 4개)
├── DifferenceSummaryViewModel     — 차이점 요약
└── overallScore                   — 전체 차이 점수
```

## 2. 각 ViewModel 상세

### 2.1 VerticalPreviewViewModel

```typescript
{
  title: "레티놀 세럼 — 업종별 비교 프리뷰",
  inputSummary: InputSummaryViewModel,
  suggestionBadge: SuggestionBadgeViewModel,
  industryColumns: IndustryColumnViewModel[],    // 4개
  comparisonSections: ComparisonSectionViewModel[], // 7개
  differenceSummary: DifferenceSummaryViewModel,
  overallScore: { score: 0.45, label: "차이 있음", colorClass: "bg-amber-500" },
  generatedAt: "2026-03-14T10:30:00.000Z"
}
```

### 2.2 InputSummaryViewModel

| 필드 | 타입 | 예시 |
|------|------|------|
| seedKeyword | string | "레티놀 세럼" |
| outputType | string | "WORKDOC" |
| outputTypeLabel | string | "실무형 보고서" |
| audience | string | "OPERATIONS" |
| confidence | string | "70%" |
| evidenceCount | number | 5 |
| insightCount | number | 3 |
| actionCount | number | 4 |
| qualityWarnings | string[] | ["Mock 데이터 기반"] |

### 2.3 SuggestionBadgeViewModel

| 필드 | 타입 | 예시 |
|------|------|------|
| industry | IndustryType | "BEAUTY" |
| label | string | "뷰티" |
| confidence | string | "100%" |
| confidencePercent | number | 100 |
| colorClass | string | "text-pink-600 bg-pink-50 border-pink-200" |
| reasoning | string | "BEAUTY 업종 추천 (confidence: 1.0, 시그널: KEYWORD+CATEGORY)" |

### 2.4 IndustryColumnViewModel

| 필드 | 타입 | 예시 |
|------|------|------|
| industry | IndustryType | "FINANCE" |
| label | string | "금융" |
| isRecommended | boolean | false |
| colorClass | string | "text-blue-600 bg-blue-50 border-blue-200" |
| deviationCount | number | 8 |
| deviationLabel | string | "8개 항목 차이" |

### 2.5 ComparisonSectionViewModel

| 필드 | 타입 | 예시 |
|------|------|------|
| section | ComparisonSection | "TONE" |
| label | string | "톤/표현" |
| icon | string | "MessageSquare" (Lucide 아이콘명) |
| diffCount | number | 4 |
| totalCount | number | 6 |
| hasDifferences | boolean | true |
| rows | ComparisonRowViewModel[] | [...] |

### 2.6 ComparisonRowViewModel

| 필드 | 타입 | 예시 |
|------|------|------|
| id | string | "TONE-0" |
| dimension | string | "기본 톤" |
| hasDifference | boolean | true |
| highlightLevel | "CRITICAL"/"WARNING"/"INFO" | "WARNING" |
| cells | ComparisonCellViewModel[] | 4개 |

### 2.7 ComparisonCellViewModel

| 필드 | 타입 | 예시 |
|------|------|------|
| industry | IndustryType | "FINANCE" |
| value | string | "FORMAL" |
| subValue | string? | "엄격한 보고서 톤" |
| isOutlier | boolean | true (4개 중 혼자 다름) |
| highlightLevel | "CRITICAL"/"WARNING"/"INFO"? | "INFO" |
| highlightReason | string? | "이상값: FORMAL" |

### 2.8 DifferenceSummaryViewModel

```typescript
{
  totalDifferences: 12,
  mostDifferentSection: { section: "TONE", label: "톤/표현" },
  mostDeviatingIndustry: { industry: "FINANCE", label: "금융" },
  topDifferences: [
    { description: "기본 톤이 다름: 금융=FORMAL, 나머지=REPORT", severity: "HIGH", colorClass: "text-red-600" },
    { description: "신뢰도 기준 차이: 금융=60%, 뷰티/F&B=40%, 엔터=35%", severity: "HIGH", colorClass: "text-red-600" },
    ...
  ],
  industryDeviations: [
    { industry: "BEAUTY", label: "뷰티", count: 3, topItems: ["..."] },
    { industry: "FNB", label: "F&B", count: 2, topItems: ["..."] },
    { industry: "FINANCE", label: "금융", count: 8, topItems: ["..."] },
    { industry: "ENTERTAINMENT", label: "엔터", count: 5, topItems: ["..."] }
  ]
}
```

### 2.9 VerticalPreviewScreenState

| 필드 | 타입 | 설명 |
|------|------|------|
| status | "idle"/"loading"/"success"/"error" | 현재 상태 |
| isEmpty | boolean | 데이터 없음 여부 |
| hasError | boolean | 에러 여부 |
| errorMessage | string? | 에러 메시지 |
| loadingMessage | string? | 로딩 메시지 |
| qualityWarnings | string[] | 품질 경고 목록 |
| isMockBased | boolean | Mock 데이터 여부 |
| isStale | boolean | Stale 데이터 여부 |
| isPartial | boolean | Partial 데이터 여부 |

## 3. 변환 흐름

```
VerticalPreviewResult (백엔드)
  │
  ├─ suggestion → SuggestionBadgeViewModel
  │   - confidence → percentage 문자열
  │   - industry → 한글 라벨 + CSS 클래스
  │
  ├─ comparisonData → ComparisonSectionViewModel[]
  │   - 7개 섹션 각각:
  │     - rows → ComparisonRowViewModel[]
  │       - hasDifference 기반 행 강조
  │       - 4개 업종 값 → ComparisonCellViewModel[]
  │         - outlier 감지 (highlight와 merge)
  │
  ├─ differenceHighlight → DifferenceSummaryViewModel
  │   - highlightRows → totalDifferences
  │   - sectionSummaries → mostDifferentSection
  │   - industryDeviations → mostDeviatingIndustry + 이탈도 바
  │   - highlightedDifferences → topDifferences (severity별 색상)
  │
  └─ overallDifferenceScore → overallScore
      - 0~0.1 → "거의 동일" (gray)
      - 0.1~0.4 → "차이 적음" (green)
      - 0.4~0.7 → "차이 있음" (amber)
      - 0.7~1.0 → "차이 매우 큼" (red)
```

## 4. 백엔드 vs 프론트엔드 ViewModel 생성

| 항목 | 백엔드 (ViewModelBuilder) | 프론트엔드 (mapper) |
|------|--------------------------|---------------------|
| 구조 변환 | ✅ 수행 | - |
| 라벨 매핑 | ✅ 수행 | - |
| CSS 클래스 | ✅ 생성 | ✅ 추가 유틸 |
| 포맷팅 | ✅ 기본 | ✅ 세부 포맷 |
| 강조 merge | ✅ 수행 | - |
| 아이콘명 | ✅ 생성 (Lucide명) | 프론트에서 import |
