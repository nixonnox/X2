# Vertical Template API Integration

> tRPC 라우터를 통한 vertical template 호출 구조

## 1. 라우터 구조

```
packages/api/src/routers/vertical-document.ts
  │
  ├─ verticalDocument.suggestIndustry    (query)
  ├─ verticalDocument.generate           (mutation)
  ├─ verticalDocument.generateAndExport  (mutation)
  ├─ verticalDocument.comparisonPreview  (query)
  ├─ verticalDocument.exportFormatPreview (query)
  └─ verticalDocument.listIndustries     (query)
```

등록: `packages/api/src/root.ts` → `verticalDocument: verticalDocumentRouter`

## 2. 엔드포인트 상세

### 2.1 suggestIndustry — 업종 자동 추론

| 항목 | 내용 |
|------|------|
| 타입 | query |
| 인증 | protectedProcedure |
| 용도 | seedKeyword 입력 시 업종 드롭다운 기본값 설정 |

```typescript
// 입력
{
  seedKeyword: "레티놀 세럼",
  clusterTopics?: ["성분 분석", "피부 효능"],
  category?: "cosmetics",
  relatedKeywords?: ["비타민C", "나이아신아마이드"]
}

// 출력
{
  suggestedIndustry: "BEAUTY",
  confidence: 1.0,
  scores: { BEAUTY: 1.0, FNB: 0, FINANCE: 0, ENTERTAINMENT: 0 },
  matchedSignals: [
    { source: "KEYWORD", industry: "BEAUTY", matchedTerm: "세럼", weight: 0.7 },
    { source: "CATEGORY", industry: "BEAUTY", matchedTerm: "cosmetics", weight: 1.5 }
  ],
  reasoning: "BEAUTY 업종 추천 (confidence: 1.0, 시그널: KEYWORD+CATEGORY)"
}
```

### 2.2 generate — 업종별 문서 생성

| 항목 | 내용 |
|------|------|
| 타입 | mutation |
| 인증 | protectedProcedure |
| 용도 | 업종 선택 후 문서 생성 |

```typescript
// 입력
{
  industryType?: "BEAUTY",              // 없으면 자동 추론
  result: SearchIntelligenceResult,
  quality: QualityAssessment,
  evidenceItems: EvidenceBundleItem[],
  insights: InsightItem[],
  actions: ActionItem[],
  outputType: "WORKDOC" | "PT_DECK" | "GENERATED_DOCUMENT",
  audience: "OPERATIONS",
  tone?: "REPORT",
  relatedKeywords?: [...],
  category?: "cosmetics",
  clusterTopics?: [...]
}

// 출력
{
  industry: "BEAUTY",
  suggestion?: IndustrySuggestion,       // 자동 추론이었으면 포함
  originalDocument: {
    workDoc?: WorkDoc,                   // outputType에 따라 하나만 포함
    ptDeck?: PtDeck,
    generatedDocument?: GeneratedDocumentOutput
  },
  verticalResult: VerticalAssemblyResult,
  generatedAt: "2026-03-14T..."
}
```

### 2.3 generateAndExport — 문서 생성 + Export 한번에

| 항목 | 내용 |
|------|------|
| 타입 | mutation |
| 인증 | protectedProcedure |
| 용도 | 문서 생성부터 Word/PPT/PDF까지 한번에 |

```typescript
// 입력 (generate 입력 + export 옵션)
{
  ...generateInput,
  exportFormat: "WORD" | "PPT" | "PDF",
  purpose: "WEEKLY_REPORT" | "ADVERTISER_PROPOSAL" | "EXTERNAL_DISTRIBUTION" | ...
}

// 출력
{
  documentResult: VerticalDocumentGenerationResult,
  exportResult: ExportResult               // job + wordDocument/pptPresentation/pdfDocument + bundle
}
```

### 2.4 comparisonPreview — 4개 업종 비교 프리뷰

| 항목 | 내용 |
|------|------|
| 타입 | query |
| 인증 | protectedProcedure |
| 용도 | 업종 선택 전 4개 업종 결과 비교 |

```typescript
// 입력 (generate 입력에서 industryType/exportFormat/purpose 제외)
{
  result: SearchIntelligenceResult,
  quality: QualityAssessment,
  evidenceItems: [...],
  insights: [...],
  actions: [...],
  outputType: "WORKDOC",
  audience: "OPERATIONS"
}

// 출력
{
  seedKeyword: "레티놀 세럼",
  suggestion: IndustrySuggestion,
  previews: VerticalPreview[],             // 4개
  differenceMatrix: DifferenceMatrixRow[], // 7개 차원
  generatedAt: "2026-03-14T..."
}
```

### 2.5 exportFormatPreview — 형식별 프리뷰

| 항목 | 내용 |
|------|------|
| 타입 | query |
| 인증 | protectedProcedure |
| 용도 | 업종 선택 후 Word/PPT/PDF 구조 비교 |

```typescript
// 입력
{
  industryType: "BEAUTY",
  format: "WORD" | "PPT" | "PDF"
}

// 출력
{
  industry: "BEAUTY",
  format: "WORD",
  structureSummary: "뷰티 × Word: 편집/공유 목적...",
  blockPlacements: [...],
  warningPlacements: [...],
  specialFeatures: [...]
}
```

### 2.6 listIndustries — 업종 목록

| 항목 | 내용 |
|------|------|
| 타입 | query |
| 인증 | protectedProcedure |
| 용도 | 업종 드롭다운 옵션 제공 |

```typescript
// 출력
[
  { industryType: "BEAUTY", label: "뷰티", description: "...", supportedOutputTypes: [...] },
  { industryType: "FNB", label: "F&B", ... },
  { industryType: "FINANCE", label: "금융", ... },
  { industryType: "ENTERTAINMENT", label: "엔터테인먼트", ... }
]
```

## 3. 프론트엔드 호출 패턴

### 3.1 업종 자동 추론 + 선택 UI

```typescript
// 1. seedKeyword 입력 시 업종 자동 추론
const suggestion = trpc.verticalDocument.suggestIndustry.useQuery({
  seedKeyword: "레티놀 세럼",
  category: "cosmetics"
});

// 2. 드롭다운 기본값 설정
const defaultIndustry = suggestion.data?.suggestedIndustry ?? "BEAUTY";

// 3. 업종 비교 프리뷰 (선택적)
const comparison = trpc.verticalDocument.comparisonPreview.useQuery({
  result, quality, evidenceItems, insights, actions,
  outputType: "WORKDOC", audience: "OPERATIONS"
});

// 4. 업종 확정 후 문서 생성
const generate = trpc.verticalDocument.generate.useMutation();
generate.mutate({ industryType: selectedIndustry, ...docInput });
```

### 3.2 문서 생성 + Export 흐름

```typescript
// 한번에: 문서 생성 + Word export
const result = trpc.verticalDocument.generateAndExport.useMutation();
result.mutate({
  industryType: "FINANCE",
  result, quality, evidenceItems, insights, actions,
  outputType: "WORKDOC",
  audience: "EXECUTIVE",
  exportFormat: "WORD",
  purpose: "WEEKLY_REPORT"
});
// result.data → { documentResult, exportResult }
```

## 4. 서비스 팩토리 등록

`packages/api/src/services/index.ts`:

```typescript
// Group 11b: Vertical Runtime Connection (stateless)
verticalIndustrySuggester: new VerticalIndustrySuggester(),
verticalPreviewBuilder: new VerticalPreviewBuilder(),
verticalDocumentIntegration: new VerticalDocumentIntegrationService(),
```

## 5. Zod 스키마 구조

| 스키마 | 용도 |
|--------|------|
| industryTypeSchema | z.enum(["BEAUTY", "FNB", "FINANCE", "ENTERTAINMENT"]) |
| exportFormatSchema | z.enum(["WORD", "PPT", "PDF"]) |
| outputTypeSchema | z.enum(["WORKDOC", "PT_DECK", "GENERATED_DOCUMENT"]) |
| searchResultSchema | SearchIntelligenceResult 호환 |
| qualitySchema | QualityAssessment 호환 |
| evidenceItemSchema | EvidenceBundleItem 호환 |
| insightSchema | InsightItem 호환 |
| actionSchema | ActionItem 호환 |
