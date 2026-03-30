# Vertical Preview Architecture

> 4개 업종 비교 프리뷰 시스템의 전체 아키텍처

## 1. 목적

같은 입력(seed keyword, search result, insight/evidence/action)으로
Beauty / F&B / Finance / Entertainment 4개 업종 템플릿이
**실제로 어떻게 다르게 동작하는지** 한 화면에서 비교하고 검증.

이것은 단순 UI 프리뷰가 아니라 **QA/QC 검증 도구**.

## 2. 전체 구조

```
[Frontend]                              [Backend]

VerticalPreviewBoard ←──────────── tRPC: detailedComparison
  ├─ VerticalComparisonMatrix             │
  ├─ VerticalDifferencePanel              ├─ VerticalPreviewService (오케스트레이터)
  └─ VerticalPreviewStatePanel            │    ├─ VerticalIndustrySuggester
                                          │    ├─ WorkReportGeneration / PtDeck / SearchDoc
useVerticalPreviewQuery ─────────→        │    ├─ VerticalDocumentAssembler (×4 업종)
  └─ fetch → detailedComparison           │    ├─ VerticalComparisonAssembler
                                          │    └─ VerticalDifferenceHighlighter
mapPreviewToViewModel                     │
  └─ CSS/포맷 가공 유틸                    └─ VerticalPreviewViewModelBuilder
                                               └─ ViewModel 변환
```

## 3. 백엔드 서비스 (5개)

### 3.1 VerticalPreviewService (오케스트레이터)

| 항목 | 내용 |
|------|------|
| 파일 | `packages/api/src/services/vertical-templates/vertical-preview.service.ts` |
| 역할 | 전체 프리뷰 파이프라인 실행 |
| 입력 | VerticalPreviewInput (searchResult, quality, evidence, insights, actions, outputType, audience) |
| 출력 | VerticalPreviewResult (suggestion + 4 IndustryResult + ComparisonData + DifferenceHighlight) |

파이프라인:
1. 업종 추론 (VerticalIndustrySuggester)
2. 원본 문서 생성 (1회 — 3가지 outputType 지원)
3. 4개 업종 vertical 조립 (VerticalDocumentAssembler ×4)
4. 비교 구조 조립 (VerticalComparisonAssembler)
5. 차이점 분석 (VerticalDifferenceHighlighter)

### 3.2 VerticalComparisonAssembler

| 항목 | 내용 |
|------|------|
| 파일 | `vertical-comparison-assembler.ts` |
| 역할 | 4개 IndustryResult → 7개 비교 섹션 + 자동 차이 감지 |
| 출력 | VerticalComparisonData |

7개 비교 섹션:
1. summaryComparison — Quick Summary, 섹션 수, 톤, 경고 수
2. blockComparison — 블록별 emphasis/title/order/sentenceCount
3. evidenceComparison — 사용 가능 수, 신뢰도, mock, stale 정책
4. actionComparison — reframed action, priority, owner, framing
5. warningComparison — 규제/추가/evidence 경고
6. toneComparison — 기본 톤, 불확실성, 리스크, 금지 표현
7. qualityComparison — 신뢰도 충족, stale 정책, mock 처리

### 3.3 VerticalDifferenceHighlighter

| 항목 | 내용 |
|------|------|
| 파일 | `vertical-difference-highlighter.ts` |
| 역할 | 비교 데이터에서 시각적 강조 대상 추출 |
| 출력 | DifferenceHighlightResult |

분석:
- **행 단위**: hasDifference → HighlightRow (level: CRITICAL/WARNING/INFO)
- **셀 단위**: 4개 중 혼자 다른 값 → HighlightCell (outlier)
- **섹션 단위**: 어떤 섹션에 차이가 가장 많은지
- **업종 단위**: 어떤 업종이 가장 이탈이 큰지
- **전체 점수**: 0-1 overallDifferenceScore

### 3.4 VerticalPreviewViewModelBuilder

| 항목 | 내용 |
|------|------|
| 파일 | `vertical-preview-viewmodel-builder.ts` |
| 역할 | 백엔드 원시 데이터 → 프론트엔드 ViewModel 변환 |
| 출력 | VerticalPreviewViewModel |

변환:
- IndustryResult → IndustryColumnViewModel (라벨, 색상, 추천 표시, 이탈 수)
- ComparisonData → ComparisonSectionViewModel[] (7개 섹션 × 접기/펴기)
- Highlight → 행/셀 강조 정보 merge
- DifferenceHighlight → DifferenceSummaryViewModel (차이점 요약)
- Score → overallScore (라벨, 색상 클래스)

### 3.5 tRPC 엔드포인트

```
verticalDocument.detailedComparison (query)
  → VerticalPreviewService.generatePreview()
  → VerticalPreviewViewModelBuilder.build()
  → { raw: VerticalPreviewResult, viewModel: VerticalPreviewViewModel }
```

## 4. 프론트엔드 구조

```
apps/web/src/features/vertical-preview/
├── index.ts                                    # Public API
├── types/
│   └── viewModel.ts                            # ViewModel 타입 정의
├── hooks/
│   └── useVerticalPreviewQuery.ts              # 데이터 요청 + 상태 관리
├── mappers/
│   └── mapPreviewToViewModel.ts                # CSS 클래스, 포맷 유틸
└── components/
    ├── VerticalPreviewBoard.tsx                 # 메인 레이아웃
    ├── VerticalComparisonMatrix.tsx             # 7개 섹션 아코디언 테이블
    ├── VerticalDifferencePanel.tsx              # 차이점 요약 패널
    └── VerticalPreviewStatePanel.tsx            # 상태별 UI (idle/loading/error/success)
```

## 5. 데이터 흐름

```
1. 사용자: seedKeyword + outputType + audience 입력
2. useVerticalPreviewQuery.analyze()
3. tRPC: verticalDocument.detailedComparison
4. VerticalPreviewService.generatePreview()
   a. VerticalIndustrySuggester.suggest() → BEAUTY 추천
   b. WorkReportGeneration.generate() → WorkDoc (1회)
   c. VerticalDocumentAssembler.assemble(BEAUTY) → result1
   d. VerticalDocumentAssembler.assemble(FNB) → result2
   e. VerticalDocumentAssembler.assemble(FINANCE) → result3
   f. VerticalDocumentAssembler.assemble(ENTERTAINMENT) → result4
   g. VerticalComparisonAssembler.assemble([r1,r2,r3,r4]) → ComparisonData
   h. VerticalDifferenceHighlighter.highlight() → DifferenceHighlight
5. VerticalPreviewViewModelBuilder.build() → ViewModel
6. Frontend: VerticalPreviewBoard 렌더링
   - 입력 요약 카드
   - 업종 추천 뱃지
   - 전체 차이 스코어 바
   - 4컬럼 업종 헤더 (추천 업종 링 표시)
   - 7개 비교 섹션 아코디언 (차이 있는 섹션 자동 펼침)
   - 차이점 요약 패널 (주요 차이, 업종별 이탈도 바)
```

## 6. 3가지 outputType 지원

| outputType | 원본 생성 서비스 | sections 변환 |
|------------|-----------------|---------------|
| WORKDOC | WorkReportGenerationService | workDoc.sections → VerticalAssemblyInput.sections |
| PT_DECK | PtDeckGenerationService | ptDeck.slides → VerticalAssemblyInput.sections |
| GENERATED_DOCUMENT | SearchDocumentGenerationService | reportSections → VerticalAssemblyInput.sections |

## 7. 서비스 등록

```
packages/api/src/services/index.ts — Group 11c:
  verticalComparisonAssembler: new VerticalComparisonAssembler()
  verticalDifferenceHighlighter: new VerticalDifferenceHighlighter()
  verticalPreviewService: new VerticalPreviewService()
  verticalPreviewViewModelBuilder: new VerticalPreviewViewModelBuilder()
```
