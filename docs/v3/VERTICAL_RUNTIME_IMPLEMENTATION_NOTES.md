# Vertical Runtime Implementation Notes

> 이번 단계에서 실제 반영한 코드 · 설계 결정 · 남은 과제

## 1. 이번 단계에서 반영한 코드

### 1.1 신규 서비스 (3개 파일)

```
packages/api/src/services/vertical-templates/
├── vertical-industry-suggester.ts       # seedKeyword/cluster/category → 업종 추론
├── vertical-preview-builder.ts          # 단일/비교/export 프리뷰 생성
└── vertical-document-integration.service.ts  # 전체 파이프라인 통합 오케스트레이터
```

### 1.2 신규 라우터 (1개 파일)

```
packages/api/src/routers/
└── vertical-document.ts                # tRPC 라우터 (6개 엔드포인트)
```

### 1.3 수정된 파일 (3개)

```
packages/api/src/services/vertical-templates/index.ts  # barrel export 확장
packages/api/src/services/index.ts                      # Group 11b 서비스 등록
packages/api/src/root.ts                                # verticalDocument 라우터 등록
```

### 1.4 생성된 문서 (4개)

```
docs/v3/
├── VERTICAL_TEMPLATE_RUNTIME_CONNECTION.md    # 전체 연결 구조
├── VERTICAL_TEMPLATE_PREVIEW_SPEC.md          # 프리뷰/비교 프리뷰 구조
├── VERTICAL_TEMPLATE_API_INTEGRATION.md       # tRPC API 명세
└── VERTICAL_RUNTIME_IMPLEMENTATION_NOTES.md   # 이 파일
```

## 2. 설계 결정

### 2.1 통합 서비스 (VerticalDocumentIntegrationService)

- 기존 7개 서비스를 내부에서 조합하는 façade 패턴
- 호출자가 WorkReportGeneration → VerticalDocumentAssembler → ExportOrchestrator를 직접 조합하지 않아도 됨
- 이유: 3단계 파이프라인(생성→조립→export)의 데이터 변환이 복잡하고, 일관된 진입점이 필요

### 2.2 업종 추론 (VerticalIndustrySuggester)

- 단일 키워드 매칭이 아닌 복수 시그널 결합 (KEYWORD + CLUSTER + CATEGORY)
- 스코어 정규화 후 threshold + gap 기반 판단
- 금융은 50% 이상이어야 추천 (오탐 방지)
- 이유: "적금" 하나만으로 금융이라 단정하면 F&B "적금 이벤트" 같은 경우에 오탐

### 2.3 프리뷰 구조 (VerticalPreviewBuilder)

- 전체 문서를 렌더링하지 않고, 구조적 요약만 제공
- 4개 업종 비교는 차이점 매트릭스로 7개 차원 비교
- Export 형식별 프리뷰는 블록 배치 + 경고 위치 + 특수 기능
- 이유: 프론트엔드에서 업종/형식 선택 전 사전 비교가 필요

### 2.4 기존 서비스 무수정

- WorkReportGenerationService, PtDeckGenerationService, SearchDocumentGenerationService는 수정하지 않음
- VerticalDocumentAssembler, ExportOrchestratorService도 수정하지 않음
- Integration 서비스가 데이터 변환을 담당
- 이유: 기존 서비스의 인터페이스를 바꾸면 다른 호출자에 영향

### 2.5 outputType → 원본 문서 선택

- WORKDOC → WorkReportGenerationService (실무형)
- PT_DECK → PtDeckGenerationService (PT형)
- GENERATED_DOCUMENT → SearchDocumentGenerationService (배포형)
- audience에 따라 docType/deckType/role을 자동 추론
- 이유: 호출자가 세부 타입을 모르더라도 audience만으로 적절한 문서 생성 가능

### 2.6 tRPC 라우터 설계

- query vs mutation: 조회/프리뷰 → query, 생성/export → mutation
- 모든 엔드포인트 protectedProcedure (인증 필수)
- Zod 스키마로 입력 검증 (SearchResult, Quality, Evidence 등 구조 검증)
- 이유: 문서 생성은 상태 변경(mutation)이고, 프리뷰는 읽기(query)

## 3. Backward Compatibility

| 항목 | 호환성 |
|------|--------|
| WorkReportGenerationService | 유지됨 — Integration이 소비만 함 |
| PtDeckGenerationService | 유지됨 — Integration이 소비만 함 |
| SearchDocumentGenerationService | 유지됨 — Integration이 소비만 함 |
| VerticalDocumentAssembler | 유지됨 — Integration이 호출만 함 |
| VerticalTemplateRegistryService | 유지됨 — Suggester/Preview가 참조만 함 |
| ExportOrchestratorService | 유지됨 — Integration이 호출만 함 |
| 기존 서비스 팩토리 | 유지됨 — Group 11b 추가만 |
| 기존 라우터 | 유지됨 — verticalDocument 라우터 추가만 |

## 4. 실제 흐름 예시

### 4.1 프론트 → 업종 추론 → 문서 생성 → Word Export

```
1. 사용자: seedKeyword "레티놀 세럼" 입력
2. FE: verticalDocument.suggestIndustry({ seedKeyword: "레티놀 세럼" })
   → { suggestedIndustry: "BEAUTY", confidence: 1.0 }
3. 사용자: BEAUTY 확인 (또는 수동 변경)
4. FE: verticalDocument.generateAndExport({
     industryType: "BEAUTY",
     result: searchResult,
     quality: qualityAssessment,
     evidenceItems: [...],
     insights: [...],
     actions: [...],
     outputType: "WORKDOC",
     audience: "OPERATIONS",
     exportFormat: "WORD",
     purpose: "WEEKLY_REPORT"
   })
5. BE:
   a. WorkReportGenerationService.generate() → WorkDoc
   b. VerticalDocumentAssembler.assemble("BEAUTY") → verticalResult
      - FAQ 강조, COMPARISON 강조, "성분/효능 FAQ" 제목
      - 화장품 규제 경고 삽입
   c. ExportOrchestratorService.execute("WORD") → ExportResult
      - ExportWarningBuilder → 형식별 경고
      - VerticalExportPolicyService → BEAUTY × WORD 정책
      - WordExportBuilder → WordDocument
6. FE: WordDocument 수신 → 다운로드 UI 표시
```

### 4.2 4개 업종 비교 프리뷰

```
1. FE: verticalDocument.comparisonPreview({
     result: searchResult,
     quality, evidenceItems, insights, actions,
     outputType: "WORKDOC", audience: "OPERATIONS"
   })
2. BE:
   a. VerticalIndustrySuggester.suggest() → BEAUTY 추천
   b. 4개 업종 각각: WorkDoc 생성 → VerticalAssembler 조립
   c. VerticalPreviewBuilder.buildComparisonPreview()
      - 4개 VerticalPreview 생성
      - 7개 차원 차이점 매트릭스 생성
3. FE: 비교 테이블 렌더링
   - 톤: BEAUTY=REPORT, FINANCE=FORMAL
   - 강조: BEAUTY=FAQ/COMPARISON, FINANCE=RISK_NOTE/COMPARISON
   - 신뢰도 기준: BEAUTY=40%, FINANCE=60%
```

## 5. 남은 과제

### 5.1 단기 (다음 스프린트)

- [ ] **프론트엔드 UI**: 업종 선택 드롭다운 + 자동 추천 표시 + 비교 프리뷰 모달
- [ ] **Export 파일 렌더링**: WordDocument → .docx, PptPresentation → .pptx, PdfDocument → .pdf
- [ ] **파일 저장/다운로드**: S3 업로드 + 다운로드 URL
- [ ] **업종 추론 정확도 개선**: 실제 키워드 데이터로 키워드 사전 보강

### 5.2 중기

- [ ] **업종별 템플릿 커스터마이징**: 사용자별 블록 순서/강조 수정
- [ ] **프리뷰 캐싱**: 동일 데이터에 대한 비교 프리뷰 캐싱
- [ ] **A/B 프리뷰**: 2개 업종 나란히 비교 (전체 문서 diff)
- [ ] **업종 추론 학습**: 사용자 선택 이력 기반 추천 정확도 개선

### 5.3 장기

- [ ] **커스텀 업종 등록**: 기존 4개 외 사용자 정의 업종 템플릿
- [ ] **업종 복합 적용**: 뷰티+F&B 같은 크로스 업종 지원
- [ ] **실시간 프리뷰**: 설정 변경 시 즉시 프리뷰 업데이트
