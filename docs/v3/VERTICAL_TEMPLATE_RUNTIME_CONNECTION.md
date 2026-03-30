# Vertical Template Runtime Connection

> vertical template이 실제 document generation / preview / export 흐름에 연결되는 구조

## 1. 연결 구조

```
seedKeyword / cluster / category
  │
  ▼
VerticalIndustrySuggester.suggest()
  → IndustrySuggestion { suggestedIndustry, confidence, scores, reasoning }
  │
  ▼
VerticalDocumentIntegrationService.generate(input)
  │
  ├─ 1. resolveIndustry() — 수동 선택 or 자동 추론
  │
  ├─ 2. generateOriginalDocument() — WorkDoc / PtDeck / GeneratedDocument
  │     ├─ WorkReportGenerationService.generate()
  │     ├─ PtDeckGenerationService.generate()
  │     └─ SearchDocumentGenerationService.generate()
  │
  ├─ 3. buildAssemblyInput() — 원본 → VerticalAssemblyInput 변환
  │
  └─ 4. VerticalDocumentAssembler.assemble() — 업종별 재조립
        → VerticalDocumentGenerationResult
  │
  ▼ (선택)
VerticalDocumentIntegrationService.export()
  │
  └─ ExportOrchestratorService.execute() — Word/PPT/PDF 변환
     → ExportResult
```

## 2. 핵심 서비스

### 2.1 VerticalDocumentIntegrationService (신규)

| 항목 | 내용 |
|------|------|
| 역할 | 전체 파이프라인 통합 오케스트레이터 |
| 입력 | VerticalDocumentGenerationInput |
| 출력 | VerticalDocumentGenerationResult |
| 메서드 | generate(), generateAndExport(), export(), suggestIndustry(), buildComparisonPreview(), buildExportFormatPreview() |
| Stateless | 내부에서 7개 서비스를 조합 |

### 2.2 VerticalIndustrySuggester (신규)

| 항목 | 내용 |
|------|------|
| 역할 | seedKeyword/cluster/category → 업종 추론 |
| 입력 | { seedKeyword, clusterTopics?, category?, relatedKeywords? } |
| 출력 | IndustrySuggestion { suggestedIndustry, confidence, scores, reasoning } |
| 규칙 | 복수 시그널 결합, 40% 미만 추천 없음, 금융은 50% 기준 |

### 2.3 VerticalPreviewBuilder (신규)

| 항목 | 내용 |
|------|------|
| 역할 | 업종별 프리뷰 / 비교 프리뷰 생성 |
| 출력 | VerticalPreview, VerticalComparisonPreview, ExportFormatPreview |
| 기능 | 블록 구성/톤/경고/evidence 정책 미리보기, 차이점 매트릭스 |

## 3. 데이터 흐름

### 3.1 업종 추론 흐름

```
seedKeyword: "레티놀 세럼"
  → KEYWORD 매칭: BEAUTY (레티놀, 세럼) → weight 1.0
  → CATEGORY 매핑: cosmetics → BEAUTY → weight 1.5
  → 스코어: BEAUTY=1.0, FNB=0, FINANCE=0, ENTERTAINMENT=0
  → suggestedIndustry: "BEAUTY", confidence: 1.0
```

### 3.2 문서 생성 + 조립 흐름

```
VerticalDocumentGenerationInput {
  industryType: "BEAUTY" (또는 자동 추론),
  result: SearchIntelligenceResult,
  quality: QualityAssessment,
  evidenceItems: [...],
  insights: [...],
  actions: [...],
  outputType: "WORKDOC",
  audience: "OPERATIONS"
}
  │
  ├─ WorkReportGenerationService.generate() → WorkDoc
  │    (공통 구조: sections, evidenceRefs, quality)
  │
  ├─ buildAssemblyInput() → VerticalAssemblyInput
  │    (WorkDoc.sections → DocumentSection[] 변환)
  │
  └─ VerticalDocumentAssembler.assemble("BEAUTY")
       ├─ 블록 필터링: HIDDEN 제외
       ├─ 제목 오버라이드: FAQ → "성분/효능 FAQ"
       ├─ 톤 적용: "확실히 효과가 있는" → 경고
       ├─ Evidence 우선순위: 성분 분석 > 비교 > 일반
       └─ 리스크 노트: 화장품 규제 주의
```

### 3.3 Export 연결 흐름

```
VerticalDocumentGenerationResult
  │
  └─ export({ documentResult, exportFormat: "WORD", purpose: "WEEKLY_REPORT" })
       │
       ├─ buildExportInput() — vertical 결과 → ExportInput 변환
       │    sections: verticalResult.sections
       │    allEvidenceRefs: verticalResult.evidencePolicy.sortedEvidence
       │    industryType: "BEAUTY"
       │
       └─ ExportOrchestratorService.execute()
            ├─ ExportWarningBuilder (형식별 경고)
            ├─ ExportBlockAssembler (공통 블록)
            ├─ VerticalExportPolicyService (업종 × 형식 정책)
            └─ WordExportBuilder → WordDocument
```

## 4. 기존 서비스와의 관계

```
기존 (변경 없음)                          신규 (runtime connection)
─────────────────                      ──────────────────────────
WorkReportGenerationService        ←── VerticalDocumentIntegrationService
PtDeckGenerationService            ←──   └─ 내부에서 호출
SearchDocumentGenerationService    ←──
VerticalDocumentAssembler          ←──
VerticalTemplateRegistryService    ←──
ExportOrchestratorService          ←──

VerticalIndustrySuggester          (신규 — 업종 추론)
VerticalPreviewBuilder             (신규 — 프리뷰)
tRPC verticalDocument router       (신규 — API 진입점)
```

기존 서비스는 전혀 수정하지 않음. Integration 서비스가 기존 서비스를 조합하여 연결.

## 5. 업종 결정 전략

| 방식 | 조건 | 결과 |
|------|------|------|
| 수동 선택 | input.industryType 지정 | 해당 업종 사용 |
| 자동 추론 | industryType 없음 | VerticalIndustrySuggester 호출 |
| 추론 성공 | confidence ≥ threshold + gap ≥ 0.15 | 추천 업종 사용 |
| 추론 실패 | confidence 미달 | BEAUTY 기본값 |
| 금융 특수 | 금융은 50% 이상이어야 추천 | 오탐 방지 |
