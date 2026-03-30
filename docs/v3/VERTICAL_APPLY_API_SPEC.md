# Vertical Apply API Spec

> verticalDocument.apply 엔드포인트 입출력 스키마와 연결 방식

## 1. 엔드포인트

- **라우터**: `verticalDocument.apply`
- **타입**: mutation
- **tRPC 경로**: `trpc.verticalDocument.apply.useMutation()`

## 2. 입력 스키마

```typescript
{
  // 필수
  seedKeyword: string;
  outputType: "WORKDOC" | "PT_DECK" | "GENERATED_DOCUMENT";

  // 선택 — 업종
  selectedIndustry?: "BEAUTY" | "FNB" | "FINANCE" | "ENTERTAINMENT";
  // 없으면 suggestIndustry로 자동 추론, 추론도 실패하면 BEAUTY 기본값

  // 선택 — 대상/톤
  audience?: string;  // 기본값 "OPERATIONS"
  tone?: "REPORT" | "MESSENGER" | "MEETING_BULLET" | "FORMAL";

  // 선택 — 데이터 (있으면 실 데이터, 없으면 mock 모드)
  result?: SearchResultSchema;
  quality?: QualitySchema;
  evidenceItems?: EvidenceItemSchema[];
  insights?: InsightSchema[];
  actions?: ActionSchema[];

  // 선택 — 업종 추론 보조
  relatedKeywords?: string[];
  category?: string;
  clusterTopics?: string[];

  // 선택 — 모드
  previewMode?: boolean;  // 기본값 false
}
```

## 3. 출력 스키마

```typescript
{
  // 업종 정보
  selectedIndustry: IndustryType;
  industryLabel: string;              // 예: "뷰티"
  recommendedIndustry: IndustryType | null;
  suggestion: IndustrySuggestion;     // 전체 추론 결과

  // 블록 구조 (vertical 조립 결과를 용도별 분류)
  summaryBlocks: DocumentSection[];   // QUICK_SUMMARY, KEY_FINDING
  evidenceBlocks: DocumentSection[];  // EVIDENCE
  actionBlocks: DocumentSection[];    // ACTION
  warningBlocks: DocumentSection[];   // RISK_NOTE
  dataBlocks: DocumentSection[];      // PERSONA, CLUSTER, PATH, ROAD_STAGE, FAQ, COMPARISON
  allSections: DocumentSection[];     // 전체 (순서 유지)

  // 정책 결과
  insightMappings: InsightMapping[];
  actionMappings: ActionMapping[];
  evidencePolicy: EvidencePolicyResult;
  additionalWarnings: string[];

  // 메타데이터
  metadata: {
    confidence: number;
    freshness: string;
    isPartial: boolean;
    isMockOnly: boolean;
    isStaleBased: boolean;
    templateId: string;
    toneStyle: string;              // REPORT | FORMAL | ...
    actionToneStyle: string;        // DIRECTIVE | SUGGESTIVE | CONSERVATIVE
    evidenceThreshold: number;      // 0.35~0.60
    staleAllowed: boolean;
    blockCount: number;
    warningCount: number;
  };

  generatedAt: string;
}
```

## 4. 적용되는 Template Policy

| 항목 | 적용 시점 | 업종별 차이 |
|------|----------|------------|
| blockConfigs | filterAndOrderSections | 블록 순서, 강조, 숨김 |
| toneGuideline | sentencePolicy | 톤, 금지표현, 불확실성 처리 |
| evidencePolicy | applyPolicy | 신뢰도 기준, stale 허용, 경고 |
| actionPolicy | mapActions | 액션 톤(DIRECTIVE/CONSERVATIVE), 담당자 |
| insightPriority | mapInsights | 우선 인사이트 유형, 프레이밍 |
| riskPolicy | addRiskNotes | 리스크 강도, 규제 문구 |

## 5. Preview 화면 연결

```
Page: /vertical-preview
  ├─ suggestIndustry query → IndustrySuggestionPanel
  ├─ apply mutation → ApplyResultPanel
  │   ├─ metadata badges (톤, 액션스타일, 신뢰도 등)
  │   ├─ quality warnings (mock/stale/partial)
  │   └─ block accordion (summary → data → evidence → action → warning)
  └─ comparisonPreview query → ComparisonPanel
```

## 6. Mock 모드

`result`, `quality`, `evidenceItems` 등을 전달하지 않으면:
- `result`는 seedKeyword + 기본 confidence(0.7)로 자동 생성
- `quality`는 `{ level: "MEDIUM", confidence: 0.7, isMockOnly: true }`
- metadata에 `isMockOnly: true` 플래그 설정
- 프론트엔드에서 "Mock 데이터 기반" 경고 배너 표시
