# Export Implementation Notes

> 이번 단계에서 실제 반영한 코드 · 설계 결정 · 남은 과제

## 1. 이번 단계에서 반영한 코드

### 1.1 Export 서비스 (신규 생성: 8개 파일)

```
packages/api/src/services/export/
├── types.ts                         # 50+ 타입 (ExportJob, ExportBundle, Word/PPT/PDF 전용 구조)
├── export-orchestrator.service.ts   # 전체 파이프라인 오케스트레이션
├── export-block-assembler.ts        # 원본 블록 → ExportBlock → ExportBundle
├── export-warning-builder.ts        # 품질 경고 생성 + 형식별 배치
├── vertical-export-policy.ts        # 4 업종 × 3 형식 = 12개 정책
├── word-export-builder.ts           # ExportBundle → WordDocument
├── ppt-export-builder.ts            # ExportBundle → PptPresentation
├── pdf-export-builder.ts            # ExportBundle → PdfDocument
└── index.ts                         # Barrel export
```

### 1.2 서비스 팩토리 등록

`packages/api/src/services/index.ts`에 추가:
- import: 7개 서비스 (Orchestrator, BlockAssembler, WarningBuilder, VerticalExportPolicy, Word/PPT/PDF Builder)
- re-export: ExportFormat, ExportPurpose, ExportJob, ExportBundle, ExportWarning, ExportResult, ExportInput, WordDocument, PptPresentation, PdfDocument
- factory: Group 12로 7개 서비스 인스턴스 등록 (모두 stateless)

### 1.3 생성된 문서 (4개)

```
docs/v3/
├── EXPORT_ARCHITECTURE.md               # 전체 파이프라인 구조
├── WORD_PPT_PDF_EXPORT_SPEC.md          # 형식별 차이 + 블록 조립 규칙
├── VERTICAL_EXPORT_POLICY_SPEC.md        # 업종별 export 결합 정책
└── EXPORT_IMPLEMENTATION_NOTES.md        # 이 파일
```

## 2. 설계 결정

### 2.1 공통 중간 모델 (ExportBlock / ExportBundle)

- 원본 블록(WorkDocSection/PtSlideBlock/DocumentBlock)을 직접 형식별 Builder에 넘기지 않음
- ExportBlockAssembler가 공통 ExportBlock으로 변환 → ExportBundle로 그루핑
- 이유: 형식별 Builder가 원본 타입에 의존하지 않게 하여 재사용성 확보

### 2.2 형식별 Builder 분리

- WordExportBuilder, PptExportBuilder, PdfExportBuilder를 완전 분리
- 공통 ExportBundle을 입력으로 받지만, 출력 구조가 완전히 다름
  - Word: sections[] with renderMode (PARAGRAPH/TABLE/BULLET/MIXED)
  - PPT: slides[] + backupSlides[] with visualHint
  - PDF: pages[] with pageType + coverPage + disclaimerPage
- 이유: "같은 블록이 형식에 따라 다르게 변환"되는 것이 핵심 요구사항

### 2.3 Evidence 금지 정책

- ExportOrchestratorService.validate()에서 allEvidenceRefs === 0이면 에러
- ExportBlockAssembler에서 EVIDENCE 역할 블록은 별도 그루핑
- 이유: evidence 없는 export 생성은 명시적 금지 사항

### 2.4 Warning 형식별 배치

- ExportWarningBuilder가 형식(Word/PPT/PDF)에 따라 placement 결정
  - Word: HEADER/INLINE (본문 중간에 경고 표시)
  - PPT: FOOTER/SPEAKER_NOTE (발표자가 볼 수 있는 위치)
  - PDF: HEADER/FOOTER/WATERMARK (읽기 전용이므로 눈에 띄게)
- 이유: 각 형식의 사용 맥락이 다름 (편집 vs 발표 vs 읽기)

### 2.5 업종 × 형식 정책 매트릭스

- VERTICAL_EXPORT_POLICIES: 4 업종 × 3 형식 = 12개 정책
- 각 정책: emphasizedBlocks, hiddenBlocks, appendixBlocks, additionalWarnings, toneOverride
- 금융 특수: Word/PDF에서 EVIDENCE를 부록으로 안 보냄 (근거 본문 유지 필수)
- 엔터 특수: PPT에서 FAQ/EVIDENCE 숨김 (반응/확산/타이밍에 집중)
- 이유: "Beauty x Word"와 "Finance x PDF"는 완전히 다른 export 결과를 만들어야 함

### 2.6 PPT 시각화 힌트

- VISUAL_HINT_MAP: 블록 타입별 시각화 추천 (13종)
- cluster_board, comparison_table, persona_cards, stage_flow, path_graph, heatmap 등
- 이유: PPT는 데이터 나열이 아닌 시각화 중심이어야 함

### 2.7 PDF 표지 신뢰도 뱃지

- PdfConfidenceIndicator: HIGH(70%+)/MEDIUM(40-70%)/LOW(40%-)
- 표지에 바로 표시하여 문서 전체 신뢰도를 즉시 파악
- 이유: PDF는 배포/보관 목적이므로 첫 페이지에서 품질 상태를 알려야 함

## 3. Backward Compatibility

| 항목 | 호환성 |
|------|--------|
| workdocs/WorkReportGenerationService | 유지됨 — export는 출력을 소비만 함 |
| pt/PtDeckGenerationService | 유지됨 — export는 출력을 소비만 함 |
| documents/SearchDocumentGenerationService | 유지됨 — export는 출력을 소비만 함 |
| vertical-templates/ | 유지됨 — VerticalExportPolicy가 참조만 함 |
| 기존 서비스 팩토리 | 유지됨 — Group 12 추가만 |

## 4. 실제 흐름 예시

### 4.1 뷰티 업종 주간 보고서 → Word Export

```
1. SearchIntelligenceResult 수신
2. workReportGeneration.generate({
     docType: "WEEKLY_REPORT", audience: "TEAM_LEAD", tone: "REPORT"
   }) → WorkDoc
3. verticalDocumentAssembler.assemble({ industry: "BEAUTY", ... }) → verticalResult
4. exportOrchestrator.execute({
     exportFormat: "WORD",
     purpose: "WEEKLY_REPORT",
     audience: "TEAM_LEAD",
     industryType: "BEAUTY",
     sourceData: { sections: verticalResult.sections, ... }
   }) → ExportResult
5. 결과: WordDocument
   - header: "뷰티 | [키워드] 주간 보고"
   - sections:
     - SUMMARY → 문단 (한 줄 요약)
     - KEY_FINDING → 문단 + 불릿 (핵심 발견)
     - FAQ → 표 (성분/효능 질문-답변)          ← Beauty 강조
     - COMPARISON → 표 (제품/성분 비교)         ← Beauty 강조
     - PERSONA → 문단 (고객 피부 고민 유형)     ← Beauty 강조
     - ACTION → 불릿 (콘텐츠 대응)
   - appendix: evidence 표 + 출처 표
   - disclaimers: 규제 경고 (의약품 표현 금지)
```

### 4.2 금융 업종 경영진 보고 → PPT Export

```
1. ptDeckGeneration.generate({
     deckType: "ADVERTISER_PROPOSAL", audience: "EXECUTIVE"
   }) → PtDeck
2. verticalDocumentAssembler.assemble({ industry: "FINANCE", ... }) → verticalResult
3. exportOrchestrator.execute({
     exportFormat: "PPT",
     purpose: "EXECUTIVE_REPORT",
     audience: "EXECUTIVE",
     industryType: "FINANCE",
     sourceData: { slides: ptDeck.slides, ... }
   }) → ExportResult
4. 결과: PptPresentation
   - slides:
     - TITLE: "금융 | [키워드] 분석"
     - EXECUTIVE_SUMMARY: 핵심 요약 + qualityNote
     - COMPARISON: 조건/금리 비교 (comparison_table)     ← Finance 강조
     - KEY_FINDING: 핵심 발견 + FORMAL 톤              ← Finance 톤
     - RISK_NOTE: 규제 주의사항                          ← Finance REQUIRED
     - ACTION: 액션 ("~을 검토하시기 바랍니다")
     - CLOSING: 전략 메시지 + qualityNote
   - backupSlides: EVIDENCE (근거 상세)
   - 각 슬라이드 speakerNote에 경고 삽입
   - metadata: isMockBased 표시
```

### 4.3 엔터 업종 외부 배포 → PDF Export

```
1. searchDocumentGeneration.generate({ ... }) → GeneratedDocumentOutput
2. verticalDocumentAssembler.assemble({ industry: "ENTERTAINMENT", ... })
3. exportOrchestrator.execute({
     exportFormat: "PDF",
     purpose: "EXTERNAL_DISTRIBUTION",
     audience: "MARKETER",
     industryType: "ENTERTAINMENT",
     sourceData: { documentBlocks: output.documentBlocks, ... }
   }) → ExportResult
4. 결과: PdfDocument
   - coverPage: 신뢰도 뱃지 + "엔터테인먼트 | [키워드]"
   - pages:
     - SUMMARY: 요약 + headerBadge (stale이면 표시)
     - CLUSTER: 팬 반응 관심 영역 (본문)            ← 엔터 강조
     - PATH: 콘텐츠 확산 경로 (본문)                ← 엔터 강조
     - KEY_FINDING: 핵심 발견
     - ACTION: 타이밍 대응 액션
     - APPENDIX: evidence 부록
   - disclaimerPage: 미확인 일정/루머 구분 경고
   - metadata: isWatermarked (mock이면 true)
```

## 5. 남은 과제

### 5.1 단기 (다음 스프린트)

- [ ] **tRPC 라우터**: `export.word` / `export.ppt` / `export.pdf` 엔드포인트
- [ ] **실제 파일 렌더링**: WordDocument → .docx (docx 라이브러리), PptPresentation → .pptx (pptxgenjs), PdfDocument → .pdf (pdf-lib)
- [ ] **프론트엔드 UI**: Export 형식 선택 드롭다운 + 업종 결합 옵션
- [ ] **파일 저장/다운로드**: S3 업로드 + 다운로드 URL 생성
- [ ] **ExportJob 영속화**: DB에 export 이력 저장

### 5.2 중기

- [ ] **템플릿 커스터마이징**: 사용자별 Word/PPT 템플릿 업로드
- [ ] **브랜드 스타일 적용**: 로고, 색상, 폰트 커스터마이징
- [ ] **차트 실제 렌더링**: 시각화 힌트 → 실제 차트 이미지 생성
- [ ] **비동기 export**: 대용량 문서 export를 백그라운드 작업으로 처리
- [ ] **export 이력 관리**: 생성 이력 조회, 재다운로드, 버전 관리

### 5.3 장기

- [ ] **Excel export**: 데이터 테이블 중심 export
- [ ] **HTML export**: 웹 공유용 인터랙티브 문서
- [ ] **이메일 export**: 요약 + 첨부파일 자동 발송
- [ ] **Slack/Teams export**: 채널별 맞춤 요약 전송
- [ ] **크로스 형식 미리보기**: 같은 데이터를 Word/PPT/PDF로 동시 미리보기
