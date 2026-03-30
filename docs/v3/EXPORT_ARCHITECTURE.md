# Export Architecture

> Word / PPT / PDF export 전체 구조 — 같은 데이터라도 형식 목적에 맞게 다르게 조립

## 1. 설계 원칙

1. **형식별 조립 규칙 분리**: Word/PPT/PDF 각각 다른 블록 배치, 톤, 레이아웃
2. **evidence 없는 export 금지**: allEvidenceRefs === 0이면 에러
3. **confidence/stale/partial 투명**: 화면에만 있고 export에 안 나오는 구조 금지
4. **mock ≠ 기본**: mock 데이터 기반 export에 워터마크/경고 필수
5. **업종별 템플릿 결합**: vertical template과 export format이 결합 가능
6. **공통 중간 모델**: ExportBlock → ExportBundle → 형식별 Builder

## 2. 파이프라인

```
WorkDoc / PtDeck / GeneratedDocumentOutput
  │
  ▼
ExportOrchestratorService.execute(ExportInput)
  │
  ├─ 1. validate() — evidence 필수, 콘텐츠 존재 확인
  │
  ├─ 2. ExportWarningBuilder.buildWarnings()
  │     → confidence/stale/partial/mock 경고 생성
  │     → 형식별 경고 배치 결정 (HEADER/INLINE/FOOTER/WATERMARK)
  │
  ├─ 3. ExportBlockAssembler
  │     ├─ assembleFromSections() — WorkDoc 소스
  │     ├─ assembleFromSlides() — PtDeck 소스
  │     └─ assembleFromDocumentBlocks() — GeneratedDocument 소스
  │     → ExportBundle (title + summary + body + evidence + action + warning + appendix)
  │
  ├─ 4. VerticalExportPolicyService.applyPolicy()
  │     → 업종별 블록 필터/부록 이동/추가 경고/톤 조정
  │
  └─ 5. 형식별 Builder
        ├─ WordExportBuilder.build() → WordDocument
        ├─ PptExportBuilder.build() → PptPresentation
        └─ PdfExportBuilder.build() → PdfDocument
```

## 3. 서비스 구조

```
packages/api/src/services/export/
├── types.ts                        # 공통 + 형식별 전체 타입 (50+ 타입)
├── export-orchestrator.service.ts  # 전체 파이프라인 오케스트레이션
├── export-block-assembler.ts       # 원본 블록 → ExportBlock → ExportBundle
├── export-warning-builder.ts       # 품질 경고 생성 + 형식별 배치
├── vertical-export-policy.ts       # 업종 × 형식 결합 정책
├── word-export-builder.ts          # ExportBundle → WordDocument
├── ppt-export-builder.ts           # ExportBundle → PptPresentation
├── pdf-export-builder.ts           # ExportBundle → PdfDocument
└── index.ts                        # Barrel export
```

## 4. 서비스별 상세

### 4.1 ExportOrchestratorService

| 항목 | 내용 |
|------|------|
| 입력 | ExportInput (format + purpose + audience + industry + sourceData) |
| 출력 | ExportResult (job + bundle + wordDocument/pptPresentation/pdfDocument) |
| 검증 | evidence 0건 → 에러, 콘텐츠 없음 → 에러 |
| Stateless | 의존: 6개 하위 빌더 (모두 stateless) |

### 4.2 ExportBlockAssembler

| 항목 | 내용 |
|------|------|
| 역할 | 원본 블록 → ExportBlock 변환 + ExportBundle 그루핑 |
| 입력 소스 | WorkDocSection[] / PtSlideBlock[] / DocumentBlock[] |
| 매핑 | blockType/slideType → ExportBlockRole (SUMMARY/BODY/FAQ/COMPARISON 등) |
| 그루핑 | titleBlock + summaryBlocks + bodyBlocks + evidenceBlocks + actionBlocks + warningBlocks + appendixBlocks |

### 4.3 ExportWarningBuilder

| 항목 | 내용 |
|------|------|
| 역할 | 품질 메타 → 형식별 경고 생성 |
| 입력 | ExportQualityMeta + ExportFormat + IndustryType? |
| 출력 | ExportWarning[] (type + message + severity + placement) |
| 형식별 차이 | Word: HEADER/INLINE, PPT: FOOTER/SPEAKER_NOTE, PDF: HEADER/FOOTER/WATERMARK |
| 업종별 차이 | 금융: CRITICAL 레벨, 엔터: 시간 민감 경고 |

### 4.4 VerticalExportPolicyService

| 항목 | 내용 |
|------|------|
| 역할 | 업종 × 형식 결합 정책 적용 |
| 정책 | 4 업종 × 3 형식 = 12개 정책 |
| 처리 | 블록 필터링 + 부록 이동 + 추가 경고 + 톤 오버라이드 |
| 금융 특수 | RISK_NOTE 강조, 규제 경고 3건 추가, FORMAL 톤 강제 |

### 4.5 WordExportBuilder

| 항목 | 내용 |
|------|------|
| 역할 | ExportBundle → WordDocument |
| 구조 | header + quickSummary + sections[] + appendix + disclaimers |
| 렌더 모드 | PARAGRAPH / TABLE / BULLET_LIST / MIXED |
| FAQ → 표, COMPARISON → 표, ACTION → 불릿, EVIDENCE → 부록 |

### 4.6 PptExportBuilder

| 항목 | 내용 |
|------|------|
| 역할 | ExportBundle → PptPresentation |
| 구조 | narrative + slides[] + backupSlides[] |
| 슬라이드 규칙 | 한 장당 하나의 메시지, 시각화 힌트, 발표자 노트 |
| 경고 처리 | CRITICAL → 발표자 노트, WARNING → 슬라이드 하단, 근거 → 백업 슬라이드 |

### 4.7 PdfExportBuilder

| 항목 | 내용 |
|------|------|
| 역할 | ExportBundle → PdfDocument |
| 구조 | coverPage + tableOfContents + pages[] + disclaimerPage |
| 페이지 유형 | SUMMARY / ANALYSIS / EVIDENCE / ACTION / FAQ / COMPARISON / RISK / APPENDIX |
| 품질 표시 | 표지 신뢰도 뱃지, 페이지 헤더 뱃지, 하단 경고, mock 워터마크 |

## 5. 기존 서비스와의 관계

```
기존 (변경 없음)                          신규 (export layer)
─────────────────                      ──────────────────────
workdocs/WorkReportGenerationService ─→ ExportOrchestratorService
pt/PtDeckGenerationService          ─→   ├─ WordExportBuilder
documents/SearchDocumentGeneration  ─→   ├─ PptExportBuilder
vertical-templates/                 ─→   ├─ PdfExportBuilder
                                         └─ VerticalExportPolicyService
```

기존 서비스는 전혀 수정하지 않음. Export layer는 기존 출력을 소비하여 형식별 문서 구조로 변환.

## 6. 공통 중간 모델

### ExportBlock

```typescript
{
  id: string;
  role: "TITLE" | "SUMMARY" | "BODY" | "TABLE" | "CHART_HINT" |
        "EVIDENCE" | "ACTION" | "WARNING" | "FAQ" | "COMPARISON" |
        "RISK" | "APPENDIX";
  sourceBlockType: string;  // 원본 블록 타입
  title: string;
  paragraphs: ExportParagraph[];
  evidenceRefs: ExportEvidenceRef[];
  quality: ExportQualityMeta;
  warnings: ExportWarning[];
}
```

### ExportBundle

```typescript
{
  titleBlock: ExportBlock;
  summaryBlocks: ExportBlock[];
  bodyBlocks: ExportBlock[];
  evidenceBlocks: ExportBlock[];
  actionBlocks: ExportBlock[];
  warningBlocks: ExportBlock[];
  appendixBlocks: ExportBlock[];
  globalWarnings: ExportWarning[];
  quality: ExportQualityMeta;
}
```
