# Search Document Implementation Notes

> 이번 단계에서 실제 반영한 코드 · 설계 결정 · 남은 과제

## 1. 이번 단계에서 반영한 코드

### 1.1 문서 생성 서비스 (신규 생성: 8개 파일)

```
packages/api/src/services/documents/
├── types.ts                                # DocumentBlock, ReportOutputSection, PtSlideBlock 등 공통 타입
├── evidence-to-document-mapper.ts          # Evidence → 문서용 EvidenceRef/SourceRef 매퍼
├── geo-aeo-document-block-builder.ts       # GEO/AEO 최적화 문서 블록 빌더 (7종)
├── search-pt-section-builder.ts            # PT/제안서 슬라이드 빌더 (10종)
├── search-report-output-builder.ts         # 보고서 섹션 빌더 (6종 × 11종 섹션)
├── role-based-document-assembler.ts        # 역할별 필터링·조립
├── search-document-generation.service.ts   # 오케스트레이터 (메인 진입점)
└── index.ts                                # Barrel export
```

### 1.2 서비스 팩토리 등록

`packages/api/src/services/index.ts`에 추가:
- import: `SearchDocumentGenerationService`
- re-export: Group 8 서비스 + 문서 타입 7종
- factory: `searchDocumentGeneration: new SearchDocumentGenerationService()` (stateless)

### 1.3 생성된 문서 (4개)

```
docs/v3/
├── SEARCH_DOCUMENT_GENERATION_ARCHITECTURE.md
├── GEO_AEO_DOCUMENT_BLOCK_SPEC.md
├── PT_REPORT_OUTPUT_SPEC.md
└── SEARCH_DOCUMENT_IMPLEMENTATION_NOTES.md (이 파일)
```

## 2. 설계 결정

### 2.1 공통 문서 블록 모델

- `DocumentBlock`, `ReportOutputSection`, `PtSlideBlock` 3종을 공통 모델로 설계
- 같은 데이터를 GEO 문서 / PT / 보고서에서 재사용 가능
- 모든 블록에 `evidenceRefs` + `sourceRefs` + `quality` 필수
- 이유: evidence 없는 문서 블록 생성 금지 원칙

### 2.2 오케스트레이터 패턴

- `SearchDocumentGenerationService`가 전체 파이프라인을 조율
- 내부에서 Mapper → GeoBuilder → PtBuilder → ReportBuilder → Assembler 순서로 호출
- 이유: 단일 진입점으로 UseCase/Role만 지정하면 적절한 출력물이 자동 생성

### 2.3 Stateless 서비스

- 모든 문서 생성 서비스는 stateless (Repository 의존 없음)
- 입력: SearchIntelligenceResult + EvidenceBundleItem[] (외부에서 주입)
- 이유: 문서 생성은 순수 변환 로직, DB 접근 불필요

### 2.4 GEO/AEO 최적화 전략

- 각 DocumentBlock에 `geoOptimized`, `schemaHint` 필드
- FAQ → FAQPage, Summary → Article, Stage → HowTo, Comparison → Table
- `mapper.filterCitationReady()`로 citation 준비된 소스만 GEO 블록에 연결
- 이유: AI 검색엔진이 인용하기 쉬운 구조를 명시적으로 표현

### 2.5 Evidence → Document 매핑

- `EvidenceToDocumentMapper`가 중간 레이어 역할
- Phase 7의 `EvidenceBundleItem` → 문서용 `EvidenceRef`로 1:1 변환
- `filterByCategory()`로 각 블록에 관련 근거만 필터링
- `hasEvidence()`로 근거 없는 블록 생성 방지
- 이유: "이 문장이 어떤 근거에서 나왔는지" 역추적 가능

### 2.6 Role-based Assembly

- `ROLE_DOCUMENT_CONFIG`에 역할별 설정 (maxBlocks, includeRawEvidence 등)
- `RoleBasedDocumentAssembler`가 최종 필터링
- EXECUTIVE: 요약/전략만, warning 제거
- PRACTITIONER: 전체 포함, 기술 상세
- 이유: 같은 분석 결과라도 역할에 따라 필요한 정보의 깊이가 다름

## 3. Backward Compatibility

| 항목 | 호환성 |
|------|--------|
| SearchEvidenceBundleService | 유지됨 — 문서 서비스의 입력으로 사용 |
| assessSearchDataQuality() | 유지됨 — quality gate로 사용 |
| SearchReportSectionBuilder | 유지됨 — 별도 서비스 (ReportCompositionService 연동) |
| SearchExecutiveSummaryService | 유지됨 — 별도 서비스 |
| ReportCompositionService | 유지됨 — 향후 GeneratedDocumentOutput → InsightReport 변환 연동 |
| GeoAeoService | 유지됨 — 향후 citation/source 직접 연동 |
| 기존 서비스 팩토리 | 유지됨 — Group 8 추가만 |

## 4. 실제 흐름 예시

### GEO/AEO 문서 생성 흐름

```
1. SearchIntelligenceResult 수신
2. assessSearchDataQuality(result) → quality
3. searchEvidenceBundle.buildSearchEvidenceItems(result, quality) → evidenceItems
4. searchDocumentGeneration.generate({
     result, quality, evidenceItems,
     role: "ADMIN",
     useCase: "GEO_AEO_DOCUMENT"
   })
5. 내부:
   - EvidenceToDocumentMapper → evidenceRefs + sourceRefs
   - GeoAeoDocumentBlockBuilder.buildAll() → 7개 블록 (FAQ, Summary, ...)
   - RoleBasedDocumentAssembler.assemble() → ADMIN용 필터링
6. → GeneratedDocumentOutput (documentBlocks: 7개, evidenceRefs, sourceRefs)
```

### PT/제안서 생성 흐름

```
1. SearchIntelligenceResult 수신
2. assessSearchDataQuality(result) → quality
3. searchEvidenceBundle.buildSearchEvidenceItems(result, quality) → evidenceItems
4. searchDocumentGeneration.generate({
     result, quality, evidenceItems,
     role: "MARKETER",
     useCase: "PT_PROPOSAL"
   })
5. 내부:
   - EvidenceToDocumentMapper → evidenceRefs + sourceRefs
   - SearchPtSectionBuilder.buildAll() → 10개 슬라이드
   - RoleBasedDocumentAssembler.assemble() → MARKETER용 필터링
6. → GeneratedDocumentOutput (ptSlides: ~10개, evidenceRefs, sourceRefs)
```

## 5. 남은 과제

### 5.1 단기 (다음 스프린트)

- [ ] **프론트엔드 문서 생성 UI**: 리스닝 허브에서 "문서 생성" 버튼 → useCase 선택 → 출력
- [ ] **tRPC 라우터**: `searchDocument.generate` 엔드포인트
- [ ] **GeoAeoService 직접 연동**: citation 상태, visibility score를 문서 블록에 직접 반영
- [ ] **ReportService 연동**: GeneratedDocumentOutput → InsightReport(DB) 변환
- [ ] **LLM 내러티브**: 기계적 템플릿 → AI 기반 자연어 문장

### 5.2 중기

- [ ] **Export 포맷**: Markdown → PDF, PPTX, DOCX 변환
- [ ] **템플릿 시스템**: 사용자 정의 문서 템플릿
- [ ] **히스토리**: 과거 문서 생성 결과 저장/비교
- [ ] **실시간 문서 업데이트**: 분석 결과 변경 시 문서 자동 갱신

### 5.3 장기

- [ ] **슬라이드 미리보기**: PT 슬라이드를 실제 장표로 렌더링
- [ ] **협업 편집**: 생성된 문서의 블록 단위 편집/수정
- [ ] **배포 자동화**: 생성된 문서를 Slack/이메일로 자동 발송
- [ ] **A/B 테스트**: GEO 최적화 전/후 citation 변화 측정
