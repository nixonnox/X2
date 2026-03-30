# Vertical Preview Implementation Notes

> 이번 단계에서 실제 반영한 코드 · 설계 결정 · 남은 과제

## 1. 이번 단계에서 반영한 코드

### 1.1 신규 서비스 (4개 파일)

```
packages/api/src/services/vertical-templates/
├── vertical-comparison-assembler.ts      # 4개 IndustryResult → 7개 비교 섹션
├── vertical-difference-highlighter.ts    # 비교 데이터 → 강조 대상 분석
├── vertical-preview.service.ts           # 전체 프리뷰 파이프라인 오케스트레이터
└── vertical-preview-viewmodel-builder.ts # 원시 데이터 → ViewModel 변환
```

### 1.2 tRPC 엔드포인트 확장 (1개)

```
packages/api/src/routers/vertical-document.ts
└── detailedComparison (query) — 추가
```

### 1.3 신규 프론트엔드 피처 (8개 파일)

```
apps/web/src/features/vertical-preview/
├── index.ts
├── types/
│   └── viewModel.ts
├── hooks/
│   └── useVerticalPreviewQuery.ts
├── mappers/
│   └── mapPreviewToViewModel.ts
└── components/
    ├── VerticalPreviewBoard.tsx
    ├── VerticalComparisonMatrix.tsx
    ├── VerticalDifferencePanel.tsx
    └── VerticalPreviewStatePanel.tsx
```

### 1.4 수정된 파일 (3개)

```
packages/api/src/services/vertical-templates/index.ts  # barrel export 확장
packages/api/src/services/index.ts                      # Group 11c 추가
packages/api/src/routers/vertical-document.ts           # detailedComparison 추가
```

### 1.5 생성된 문서 (4개)

```
docs/v3/
├── VERTICAL_PREVIEW_ARCHITECTURE.md
├── VERTICAL_COMPARISON_UI_SPEC.md
├── VERTICAL_PREVIEW_VIEWMODEL_SPEC.md
└── VERTICAL_PREVIEW_IMPLEMENTATION_NOTES.md  # 이 파일
```

## 2. 설계 결정

### 2.1 오케스트레이터 분리

- VerticalPreviewService를 VerticalDocumentIntegrationService와 별도로 생성
- 이유: Integration은 개별 문서 생성/export 파이프라인, Preview는 4개 업종 비교 QA/QC용
- Integration.buildComparisonPreview()는 PreviewBuilder 기반 간략한 비교
- PreviewService.generatePreview()는 실제 문서 생성 후 상세 비교

### 2.2 DifferenceHighlighter 분리

- ComparisonAssembler와 별도 서비스로 분리
- 이유: 비교 데이터 조립(구조)과 강조 분석(시각화)의 관심사 분리
- ComparisonAssembler는 hasDifference 플래그만 설정
- DifferenceHighlighter는 행/셀/섹션/업종 단위 분석 + outlier 감지

### 2.3 ViewModel 백엔드 생성

- VerticalPreviewViewModelBuilder를 백엔드에 배치
- 이유: ViewModel 생성 로직이 복잡하고, 프론트에서 중복 구현 방지
- CSS 클래스, 라벨, 색상까지 백엔드에서 생성
- 프론트 mapper는 추가 가공 유틸만 제공

### 2.4 원본 문서 1회 생성

- 4개 업종에 대해 원본 문서(WorkDoc/PT/GeneratedDoc)는 1회만 생성
- vertical 조립(VerticalDocumentAssembler)만 4회 실행
- 이유: 원본 문서는 업종과 무관, vertical 조립이 업종별 차이를 만듦

### 2.5 아코디언 자동 펼침

- 차이가 있는 섹션만 자동 펼침
- 이유: 7개 섹션 모두 펼치면 정보 과부하, 차이 없는 섹션은 관심 밖

### 2.6 Outlier 감지

- 4개 값 중 혼자만 다른 값을 "이상값"으로 표시
- 이유: 3:1 비율의 차이가 가장 유의미한 정보 (해당 업종의 고유 특성)
- 예: 금융만 FORMAL, 나머지 REPORT → 금융 셀에 파란 점 표시

## 3. Backward Compatibility

| 항목 | 호환성 |
|------|--------|
| VerticalDocumentIntegrationService | 유지됨 — Preview는 별도 서비스 |
| verticalDocument.comparisonPreview | 유지됨 — detailedComparison 추가만 |
| 기존 서비스 팩토리 | 유지됨 — Group 11c 추가만 |
| 기존 라우터 | 유지됨 — 엔드포인트 추가만 |
| 기존 barrel export | 유지됨 — 추가만 |

## 4. 비교 항목 7개 섹션 상세

| # | 섹션 | 비교 항목 | 예상 차이 |
|---|------|----------|----------|
| 1 | 요약 | Quick Summary, 섹션 수, 톤, 경고 수, 인사이트 수 | 톤, 경고 수 |
| 2 | 블록 | emphasis, title, order, sentenceCount, hasContent | HIDDEN 블록, 강조 블록, 제목 오버라이드 |
| 3 | Evidence | 사용 가능 수, 신뢰도, mock, stale, 우선 카테고리 | 최소 신뢰도, stale 허용 |
| 4 | Action | reframedAction, priority, owner, framing | 톤 스타일 (DIRECTIVE/CONSERVATIVE/SUGGESTIVE) |
| 5 | 경고 | 규제 경고, 추가 경고, evidence 경고 | 규제 수 (금융 최다) |
| 6 | 톤 | 기본 톤, 불확실성, 액션 톤, 리스크 강도, 금지 표현 수 | FORMAL vs REPORT, CONSERVATIVE vs NEUTRAL |
| 7 | 품질 | 신뢰도 충족, stale 정책, mock 처리 | 금융 CRITICAL 경고 |

## 5. 남은 과제

### 5.1 단기 (다음 스프린트)

- [ ] **페이지 라우팅**: `apps/web/src/app/(dashboard)/vertical-preview/page.tsx` 추가
- [ ] **tRPC 클라이언트 연동**: useVerticalPreviewQuery를 tRPC hook으로 전환
- [ ] **outputType 전환 UI**: 탭으로 WORKDOC/PT_DECK/GENERATED_DOCUMENT 전환
- [ ] **export 프리뷰 연동**: 업종 선택 후 Word/PPT/PDF 프리뷰 표시

### 5.2 중기

- [ ] **A/B 비교 모드**: 2개 업종 나란히 전체 문서 비교 (diff view)
- [ ] **프리뷰 캐싱**: 동일 입력에 대한 프리뷰 결과 캐싱
- [ ] **프리뷰 → 문서 생성**: 프리뷰에서 바로 선택한 업종으로 문서 생성
- [ ] **프리뷰 히스토리**: 이전 프리뷰 결과 저장 및 비교

### 5.3 장기

- [ ] **실시간 프리뷰**: 데이터 변경 시 즉시 프리뷰 갱신
- [ ] **커스텀 업종 프리뷰**: 사용자 정의 업종 템플릿도 비교 포함
- [ ] **프리뷰 공유**: 프리뷰 결과 링크 공유 (읽기 전용)
