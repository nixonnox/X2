# Vertical Template Preview Spec

> 업종별 프리뷰 / 4개 업종 비교 프리뷰 / export 형식별 프리뷰 구조

## 1. 프리뷰 목적

| 목적 | 설명 |
|------|------|
| 업종 선택 보조 | 어떤 업종 템플릿을 적용할지 미리 비교 |
| 결과 확인 | 적용 후 블록 구성/톤/경고 차이를 미리 확인 |
| export 형식 결정 | Word/PPT/PDF 중 어떤 형식이 적합한지 비교 |

## 2. 단일 업종 프리뷰 (VerticalPreview)

### 2.1 구조

```typescript
{
  industry: "BEAUTY",
  label: "뷰티",
  blockPreview: [
    { blockType: "FAQ", title: "성분/효능 FAQ", emphasis: "EMPHASIZED", order: 1 },
    { blockType: "COMPARISON", title: "성분 비교표", emphasis: "EMPHASIZED", order: 2 },
    { blockType: "PERSONA", title: "피부 고민별 고객 유형", emphasis: "EMPHASIZED", order: 3 },
    ...
  ],
  tonePreview: {
    defaultTone: "REPORT",
    uncertaintyHandling: "NEUTRAL",
    forbiddenPatternsCount: 6,
    sampleForbidden: ["확실히 효과가 있는", "반드시 ~해야", "모든 피부에 적합"],
    samplePreferred: ["~에 관심이 높은 것으로 나타남"]
  },
  warningPreview: [
    { type: "REGULATORY", message: "[뷰티 규제] 의약품 표현 금지", severity: "WARNING" }
  ],
  evidencePreview: {
    minCount: 2, maxCount: 15, minConfidence: 0.4,
    allowStaleData: true,
    priorityCategories: ["ingredient_analysis", "product_comparison"]
  },
  keyDifferences: [
    "강조 블록: FAQ, COMPARISON, PERSONA",
    "금지 표현 6건"
  ]
}
```

### 2.2 포함 정보

| 항목 | 설명 |
|------|------|
| blockPreview | 블록별 강조 수준, 제목 오버라이드, 순서 |
| tonePreview | 기본 톤, 불확실성 처리, 금지/권장 패턴 샘플 |
| warningPreview | 규제/리스크 경고 목록 |
| evidencePreview | 최소/최대 evidence 수, 신뢰도 기준, stale 허용 여부 |
| keyDifferences | 다른 업종과의 핵심 차이점 |

## 3. 4개 업종 비교 프리뷰 (VerticalComparisonPreview)

### 3.1 구조

```typescript
{
  seedKeyword: "레티놀 세럼",
  suggestion: {
    suggestedIndustry: "BEAUTY",
    confidence: 1.0,
    scores: { BEAUTY: 1.0, FNB: 0, FINANCE: 0, ENTERTAINMENT: 0 },
    reasoning: "BEAUTY 업종 추천 (confidence: 1.0, 시그널: KEYWORD)"
  },
  previews: [
    { industry: "BEAUTY", ... },   // 4개 업종 각각의 VerticalPreview
    { industry: "FNB", ... },
    { industry: "FINANCE", ... },
    { industry: "ENTERTAINMENT", ... }
  ],
  differenceMatrix: [
    { dimension: "기본 톤", values: { BEAUTY: "REPORT", FNB: "REPORT", FINANCE: "FORMAL", ENTERTAINMENT: "REPORT" } },
    { dimension: "불확실성 처리", values: { BEAUTY: "NEUTRAL", FNB: "NEUTRAL", FINANCE: "CONSERVATIVE", ENTERTAINMENT: "OPTIMISTIC" } },
    { dimension: "최소 신뢰도", values: { BEAUTY: "40%", FNB: "40%", FINANCE: "60%", ENTERTAINMENT: "35%" } },
    { dimension: "Stale 허용", values: { BEAUTY: "허용", FNB: "허용", FINANCE: "불가", ENTERTAINMENT: "불가" } },
    ...
  ]
}
```

### 3.2 차이점 매트릭스 항목

| 차원 | 뷰티 | F&B | 금융 | 엔터 |
|------|------|-----|------|------|
| 기본 톤 | REPORT | REPORT | FORMAL | REPORT |
| 불확실성 | NEUTRAL | NEUTRAL | CONSERVATIVE | OPTIMISTIC |
| 강조 블록 | FAQ, COMPARISON, PERSONA | CLUSTER, ROAD_STAGE, COMPARISON | COMPARISON, FAQ, RISK_NOTE | CLUSTER, PATH, ACTION |
| 최소 신뢰도 | 40% | 40% | 60% | 35% |
| 규제 경고 | 2건 | 2건 | 4건+ | 2건 |
| 리스크 강도 | STANDARD | STANDARD | STRICT | SOFT |
| Stale 허용 | 허용 | 허용 | 불가 | 불가 |

### 3.3 사용 시나리오

1. **업종 선택 UI**: 드롭다운에서 업종 선택 전, 4개 업종 미리보기로 차이 비교
2. **자동 추천 확인**: 자동 추론 결과와 함께 다른 업종 적용 시 어떻게 달라지는지 표시
3. **보고서 검토**: 동일 데이터에 대해 업종별 결과물 구조 차이 사전 확인

## 4. Export 형식별 프리뷰 (ExportFormatPreview)

### 4.1 구조

```typescript
{
  industry: "FINANCE",
  format: "PDF",
  structureSummary: "금융 × PDF: 배포/보관 목적. 고정 레이아웃, 표지 신뢰도 뱃지, 유의사항 페이지.",
  blockPlacements: [
    { blockType: "COMPARISON", placement: "BODY_PAGE" },
    { blockType: "FAQ", placement: "BODY_PAGE" },
    { blockType: "RISK_NOTE", placement: "BODY_PAGE" },
    { blockType: "EVIDENCE", placement: "BODY_PAGE" },  ← 금융: 부록이 아닌 본문
  ],
  warningPlacements: [
    { type: "MOCK_DATA", placement: "WATERMARK" },
    { type: "REGULATORY", placement: "FOOTER" }
  ],
  specialFeatures: [
    "표지 신뢰도 뱃지 (HIGH/MEDIUM/LOW)",
    "규제 경고 3건 필수 포함",
    "EVIDENCE 본문 유지 (부록 이동 금지)"
  ]
}
```

### 4.2 형식별 핵심 차이

| 형식 | 구조 | 경고 위치 | 특수 기능 |
|------|------|----------|----------|
| Word | 문단+표+불릿 혼합 | HEADER/INLINE/APPENDIX | 복붙 친화, 부록 Evidence 표 |
| PPT | 슬라이드당 1메시지 | FOOTER/SPEAKER_NOTE | 시각화 힌트, 백업 슬라이드 |
| PDF | 고정 페이지 | FOOTER/WATERMARK | 표지 뱃지, 목차, 유의사항 페이지 |

## 5. 프리뷰 → 실제 생성 흐름

```
1. comparisonPreview(seedKeyword) → 4개 업종 비교 프리뷰
   ↓ 사용자가 업종 선택 (또는 자동 추천 수락)
2. exportFormatPreview(industry, format) → 형식별 프리뷰
   ↓ 사용자가 형식 선택
3. generate(input) → VerticalDocumentGenerationResult
   ↓ 결과 확인
4. export(result, format, purpose) → ExportResult
   ↓ 파일 다운로드
```
