/**
 * Export Format Engine Types
 *
 * Word / PPT / PDF export를 위한 공통 + 형식별 타입 시스템.
 *
 * 핵심 원칙:
 * - 같은 데이터라도 export format별 조립 규칙이 다름
 * - Word: 텍스트 중심 + 표/근거 부록 친화형
 * - PPT: 메시지 중심 + 슬라이드 구조 + 시각화 힌트 중심
 * - PDF: 읽기/배포/보관 중심 + 레이아웃 안정성 중시
 * - confidence/stale/partial/warnings는 export에도 반영
 * - evidence 없는 export 생성 금지
 * - mock 데이터 기반 export를 기본 경로로 사용하지 않음
 */

import type { IndustryType } from "../vertical-templates/types";

// ─── Export Format ──────────────────────────────────────────────────

export type ExportFormat = "WORD" | "PPT" | "PDF" | "CSV" | "XLSX";

// ─── Export 목적 ────────────────────────────────────────────────────

export type WordExportPurpose =
  | "WEEKLY_REPORT" // 주간 보고
  | "MONTHLY_REPORT" // 월간 보고
  | "MEETING_MATERIAL" // 회의자료
  | "DECISION_MEMO" // 기안/검토 문서
  | "SHARED_DOCUMENT" // 실무 공유 문서
  | "EVIDENCE_BUNDLE"; // 근거 자료 문서

export type PptExportPurpose =
  | "ADVERTISER_PROPOSAL" // 광고주 제안 발표
  | "INTERNAL_STRATEGY" // 내부 전략 발표
  | "EXECUTIVE_REPORT" // 경영진 보고
  | "CAMPAIGN_STRATEGY" // 캠페인 전략 발표
  | "GEO_AEO_STRATEGY"; // GEO/AEO 전략 제안

export type PdfExportPurpose =
  | "EXTERNAL_DISTRIBUTION" // 외부 배포
  | "ARCHIVE_REPORT" // 보관용 보고서
  | "APPROVAL_DOCUMENT" // 승인/결재용 고정 문서
  | "SNAPSHOT_RESULT" // 스냅샷 결과물
  | "SHAREABLE_REPORT"; // 공유 링크 대체 문서

export type CsvExportPurpose =
  | "DATA_TABLE" // 원시 데이터 테이블
  | "KEYWORD_LIST" // 키워드 목록
  | "RANKING_EXPORT" // 랭킹 내보내기
  | "MENTION_LIST"; // 멘션 목록

export type XlsxExportPurpose =
  | "FULL_REPORT" // 시트별 전체 보고서
  | "DASHBOARD_DATA" // 대시보드 데이터
  | "COMPARISON_TABLE" // 비교 분석 표
  | "EVIDENCE_BUNDLE"; // 근거 자료 묶음

export type ExportPurpose =
  | WordExportPurpose
  | PptExportPurpose
  | PdfExportPurpose
  | CsvExportPurpose
  | XlsxExportPurpose;

// ─── Export Status ──────────────────────────────────────────────────

export type ExportStatus =
  | "PENDING"
  | "ASSEMBLING"
  | "RENDERING"
  | "COMPLETED"
  | "FAILED";

// ─── Source Document Type ───────────────────────────────────────────

export type SourceDocumentType = "WORKDOC" | "PT_DECK" | "GENERATED_DOCUMENT";

// ─── 1. ExportJob ───────────────────────────────────────────────────

export type ExportJob = {
  id: string;
  /** export 형식 */
  exportFormat: ExportFormat;
  /** export 목적 */
  purpose: ExportPurpose;
  /** 대상 역할 */
  audience: string;
  /** 업종 (vertical template 결합 시) */
  industryType?: IndustryType;
  /** 원본 문서 ID */
  sourceDocumentId: string;
  /** 원본 문서 유형 */
  sourceDocumentType: SourceDocumentType;
  /** 상태 */
  status: ExportStatus;
  /** 생성 시각 */
  createdAt: string;
  /** 완료 시각 */
  completedAt?: string;
  /** 메타데이터 */
  metadata: ExportJobMetadata;
};

export type ExportJobMetadata = {
  seedKeyword: string;
  title: string;
  /** export에 포함된 블록 수 */
  blockCount: number;
  /** export에 포함된 경고 수 */
  warningCount: number;
  /** evidence 기반 여부 (false면 export 금지) */
  hasEvidence: boolean;
  /** mock 데이터 여부 */
  isMockBased: boolean;
  /** 파일 크기 (bytes, 렌더링 후) */
  fileSizeBytes?: number;
};

// ─── 2. ExportWarning ───────────────────────────────────────────────

export type ExportWarningSeverity = "INFO" | "CAUTION" | "WARNING" | "CRITICAL";

export type ExportWarningType =
  | "LOW_CONFIDENCE"
  | "STALE_DATA"
  | "PARTIAL_SOURCE"
  | "MOCK_DATA"
  | "EVIDENCE_LIMITATION"
  | "VERTICAL_POLICY"
  | "REGULATORY";

export type ExportWarning = {
  type: ExportWarningType;
  message: string;
  severity: ExportWarningSeverity;
  /** 관련 evidence/source ID */
  relatedRefs: string[];
  /** 표시 위치 */
  placement: ExportWarningPlacement;
};

export type ExportWarningPlacement =
  | "HEADER" // 문서 상단
  | "INLINE" // 본문 중간 (해당 블록 옆)
  | "FOOTER" // 페이지 하단
  | "APPENDIX" // 부록
  | "WATERMARK"; // 워터마크 (PDF)

// ─── 3. Export Block (공통 중간 모델) ────────────────────────────────

export type ExportBlockRole =
  | "TITLE" // 표지/제목
  | "SUMMARY" // 요약
  | "BODY" // 본문
  | "TABLE" // 표
  | "CHART_HINT" // 차트/시각화 힌트
  | "EVIDENCE" // 근거
  | "ACTION" // 실행 항목
  | "WARNING" // 경고/유의사항
  | "FAQ" // FAQ
  | "COMPARISON" // 비교
  | "RISK" // 리스크
  | "APPENDIX"; // 부록

export type ExportBlock = {
  id: string;
  /** 블록 역할 */
  role: ExportBlockRole;
  /** 원본 블록 타입 (workdoc/pt/document 원본) */
  sourceBlockType: string;
  /** 제목 */
  title: string;
  /** 한 줄 요약 */
  oneLiner?: string;
  /** 본문 내용 (문단) */
  paragraphs: ExportParagraph[];
  /** 구조화 데이터 (표/FAQ/비교 등) */
  structuredData?: Record<string, unknown>;
  /** 근거 연결 */
  evidenceRefs: ExportEvidenceRef[];
  /** 품질 정보 */
  quality: ExportQualityMeta;
  /** 경고 */
  warnings: ExportWarning[];
  /** 순서 */
  order: number;
};

export type ExportParagraph = {
  text: string;
  tone: string;
  /** 문장 수준 품질 경고 */
  qualityNote?: string;
  /** 근거 연결 */
  evidenceRef?: ExportEvidenceRef;
};

export type ExportEvidenceRef = {
  evidenceId: string;
  category: string;
  label: string;
  snippet?: string;
  dataSourceType?: string;
};

export type ExportQualityMeta = {
  confidence: number;
  freshness?: "fresh" | "recent" | "stale";
  isPartial?: boolean;
  isMockOnly?: boolean;
  warnings?: string[];
};

// ─── 4. ExportBundle (조립 결과) ────────────────────────────────────

export type ExportBundle = {
  /** 표지/제목 블록 */
  titleBlock: ExportBlock;
  /** 요약 블록 */
  summaryBlocks: ExportBlock[];
  /** 본문 블록 (findings, analysis 등) */
  bodyBlocks: ExportBlock[];
  /** 근거 블록 */
  evidenceBlocks: ExportBlock[];
  /** 액션 블록 */
  actionBlocks: ExportBlock[];
  /** 경고/유의사항 블록 */
  warningBlocks: ExportBlock[];
  /** 부록 블록 */
  appendixBlocks: ExportBlock[];
  /** 전체 경고 */
  globalWarnings: ExportWarning[];
  /** 전체 품질 메타 */
  quality: ExportQualityMeta;
};

// ─── 5. Word Export 전용 구조 ───────────────────────────────────────

export type WordDocument = {
  id: string;
  title: string;
  purpose: WordExportPurpose;
  /** 문서 헤더 (제목, 일자, 키워드) */
  header: WordHeader;
  /** 한 줄 요약 */
  quickSummary: string;
  /** 섹션 목록 */
  sections: WordSection[];
  /** 부록 */
  appendix: WordAppendix;
  /** 유의사항 (문서 하단) */
  disclaimers: string[];
  /** 메타데이터 */
  metadata: WordMetadata;
};

export type WordHeader = {
  title: string;
  subtitle?: string;
  date: string;
  seedKeyword: string;
  industryLabel?: string;
  audience: string;
};

export type WordSection = {
  id: string;
  title: string;
  /** 렌더링 모드 */
  renderMode: WordRenderMode;
  /** 문단 콘텐츠 */
  paragraphs: WordParagraph[];
  /** 표 콘텐츠 */
  tables: WordTable[];
  /** 불릿 리스트 */
  bulletLists: WordBulletList[];
  /** 인라인 경고 */
  inlineWarnings: string[];
  /** 순서 */
  order: number;
};

export type WordRenderMode =
  | "PARAGRAPH" // 문단형
  | "TABLE" // 표형
  | "BULLET_LIST" // 불릿 리스트형
  | "MIXED"; // 혼합형

export type WordParagraph = {
  text: string;
  style:
    | "NORMAL"
    | "HEADING1"
    | "HEADING2"
    | "HEADING3"
    | "QUOTE"
    | "CAPTION"
    | "WARNING_BOX";
  qualityNote?: string;
};

export type WordTable = {
  caption: string;
  headers: string[];
  rows: string[][];
  footnotes?: string[];
};

export type WordBulletList = {
  title?: string;
  items: { text: string; level: number; qualityNote?: string }[];
};

export type WordAppendix = {
  evidenceTable: WordTable | null;
  sourceTable: WordTable | null;
  qualityNotes: string[];
  rawDataSections: { title: string; content: string }[];
};

export type WordMetadata = {
  generatedAt: string;
  confidence: number;
  warningCount: number;
  evidenceCount: number;
  isMockBased: boolean;
};

// ─── 6. PPT Export 전용 구조 ────────────────────────────────────────

export type PptPresentation = {
  id: string;
  title: string;
  purpose: PptExportPurpose;
  /** 전체 내러티브 */
  narrative: PptExportNarrative;
  /** 슬라이드 목록 */
  slides: PptExportSlide[];
  /** 백업 슬라이드 (근거/부록) */
  backupSlides: PptExportSlide[];
  /** 메타데이터 */
  metadata: PptMetadata;
};

export type PptExportNarrative = {
  storyline: string;
  strategicMessage: string;
  keyTakeaways: string[];
};

export type PptExportSlide = {
  id: string;
  /** 슬라이드 유형 */
  slideType: string;
  /** 헤드라인 (한 줄) */
  headline: string;
  /** 서브 헤드라인 */
  subHeadline?: string;
  /** 핵심 메시지 */
  keyMessage: string;
  /** 서포팅 포인트 (3-5개) */
  supportingPoints: string[];
  /** 시각화 추천 */
  recommendedVisual: PptVisualHint;
  /** 발표자 노트 */
  speakerNote: string;
  /** 근거 요약 (슬라이드 하단) */
  evidenceSummary: string;
  /** 품질 경고 (슬라이드 하단) */
  qualityNote?: string;
  /** 순서 */
  order: number;
};

export type PptVisualHint = {
  type: string;
  description: string;
  dataKeys?: string[];
};

export type PptMetadata = {
  generatedAt: string;
  slideCount: number;
  backupSlideCount: number;
  confidence: number;
  isMockBased: boolean;
};

// ─── 7. PDF Export 전용 구조 ────────────────────────────────────────

export type PdfDocument = {
  id: string;
  title: string;
  purpose: PdfExportPurpose;
  /** 표지 */
  coverPage: PdfCoverPage;
  /** 목차 */
  tableOfContents: PdfTocEntry[];
  /** 페이지 목록 */
  pages: PdfPage[];
  /** 유의사항 페이지 */
  disclaimerPage: PdfDisclaimerPage;
  /** 메타데이터 */
  metadata: PdfMetadata;
};

export type PdfCoverPage = {
  title: string;
  subtitle?: string;
  date: string;
  seedKeyword: string;
  industryLabel?: string;
  audience: string;
  confidenceIndicator: PdfConfidenceIndicator;
};

export type PdfConfidenceIndicator = {
  level: "HIGH" | "MEDIUM" | "LOW";
  label: string;
  description: string;
};

export type PdfTocEntry = {
  title: string;
  pageNumber: number;
  level: number;
};

export type PdfPage = {
  pageNumber: number;
  /** 페이지 유형 */
  pageType: PdfPageType;
  /** 섹션 제목 */
  sectionTitle: string;
  /** 콘텐츠 블록 */
  contentBlocks: PdfContentBlock[];
  /** 페이지 하단 경고 */
  footerWarnings: string[];
  /** 페이지 상단 뱃지 */
  headerBadge?: string;
};

export type PdfPageType =
  | "SUMMARY"
  | "ANALYSIS"
  | "EVIDENCE"
  | "ACTION"
  | "COMPARISON"
  | "FAQ"
  | "RISK"
  | "APPENDIX";

export type PdfContentBlock = {
  type:
    | "PARAGRAPH"
    | "TABLE"
    | "BULLET_LIST"
    | "CHART_PLACEHOLDER"
    | "WARNING_BOX"
    | "QUOTE_BOX";
  content: string;
  structuredData?: Record<string, unknown>;
  qualityNote?: string;
};

export type PdfDisclaimerPage = {
  title: string;
  disclaimers: string[];
  qualityWarnings: string[];
  evidenceSummary: string;
  generatedAt: string;
};

export type PdfMetadata = {
  generatedAt: string;
  pageCount: number;
  confidence: number;
  warningCount: number;
  isMockBased: boolean;
  isWatermarked: boolean;
};

// ─── 8. CSV Export 전용 구조 ─────────────────────────────────────────

export type CsvDocument = {
  id: string;
  title: string;
  purpose: CsvExportPurpose;
  /** 헤더 행 */
  headers: string[];
  /** 데이터 행 */
  rows: string[][];
  /** 메타데이터 */
  metadata: CsvMetadata;
};

export type CsvMetadata = {
  generatedAt: string;
  rowCount: number;
  columnCount: number;
  confidence: number;
  isMockBased: boolean;
  /** CSV 인코딩 (BOM 포함 UTF-8 권장) */
  encoding: "utf-8-bom" | "utf-8";
};

// ─── 9. XLSX Export 전용 구조 ────────────────────────────────────────

export type XlsxDocument = {
  id: string;
  title: string;
  purpose: XlsxExportPurpose;
  /** 시트 목록 */
  sheets: XlsxSheet[];
  /** 메타데이터 */
  metadata: XlsxMetadata;
};

export type XlsxSheet = {
  /** 시트 이름 */
  name: string;
  /** 헤더 행 */
  headers: string[];
  /** 데이터 행 */
  rows: (string | number | null)[][];
  /** 열 너비 (문자 수 기준) */
  columnWidths?: number[];
  /** 시트 유형 */
  sheetType: XlsxSheetType;
};

export type XlsxSheetType =
  | "SUMMARY" // 요약
  | "DATA" // 원시 데이터
  | "EVIDENCE" // 근거
  | "WARNINGS" // 경고/유의사항
  | "ACTIONS"; // 실행 항목

export type XlsxMetadata = {
  generatedAt: string;
  sheetCount: number;
  totalRowCount: number;
  confidence: number;
  isMockBased: boolean;
};

// ─── 10. Export Orchestrator Input/Output ────────────────────────────

export type ExportInput = {
  exportFormat: ExportFormat;
  purpose: ExportPurpose;
  audience: string;
  industryType?: IndustryType;
  sourceDocumentId: string;
  sourceDocumentType: SourceDocumentType;
  /** WorkDoc / PtDeck / GeneratedDocumentOutput 중 하나 */
  sourceData: ExportSourceData;
};

export type ExportSourceData = {
  id: string;
  title: string;
  seedKeyword: string;
  /** 공통 섹션/슬라이드/블록 */
  sections?: SectionLike[];
  slides?: SlideLike[];
  documentBlocks?: DocumentBlockLike[];
  /** 전체 evidence */
  allEvidenceRefs: ExportEvidenceRef[];
  /** 전체 source */
  allSourceRefs: {
    sourceId: string;
    sourceName: string;
    sourceType: string;
    url?: string;
    trustScore?: number;
  }[];
  /** 전체 품질 */
  quality: ExportQualityMeta;
  /** 인사이트 (vertical 매핑용) */
  insights?: {
    id?: string;
    type: string;
    title: string;
    description: string;
    confidence?: number;
    evidenceRefs?: { category: string }[];
  }[];
  /** 액션 (vertical 매핑용) */
  actions?: {
    id?: string;
    action: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    owner?: string;
    rationale?: string;
  }[];
  /** 내러티브 (PPT 전용) */
  narrative?: { overallStoryline: string; strategicMessage: string };
  /** 한 줄 요약 */
  quickSummary?: string;
  /** 생성 시각 */
  generatedAt: string;
};

/** WorkDocSection 호환 */
export type SectionLike = {
  id: string;
  blockType: string;
  title: string;
  oneLiner: string;
  sentences: {
    sentence: string;
    tone: string;
    evidenceRef?: ExportEvidenceRef;
    qualityNote?: string;
  }[];
  structuredData?: Record<string, unknown>;
  evidenceRefs: ExportEvidenceRef[];
  quality: ExportQualityMeta;
  order: number;
};

/** PtSlideBlock 호환 */
export type SlideLike = {
  id: string;
  slideType: string;
  headline: string;
  subHeadline?: string;
  keyMessage: string;
  supportingPoints: string[];
  evidenceRefs: ExportEvidenceRef[];
  recommendedVisualType?: string;
  speakerNote?: string;
  quality: ExportQualityMeta;
  order: number;
};

/** DocumentBlock 호환 */
export type DocumentBlockLike = {
  id: string;
  type: string;
  title: string;
  purpose: string;
  body: string;
  structuredData?: Record<string, unknown>;
  evidenceRefs: ExportEvidenceRef[];
  quality: ExportQualityMeta;
};

export type ExportResult = {
  job: ExportJob;
  /** Word 결과 (format=WORD일 때) */
  wordDocument?: WordDocument;
  /** PPT 결과 (format=PPT일 때) */
  pptPresentation?: PptPresentation;
  /** PDF 결과 (format=PDF일 때) */
  pdfDocument?: PdfDocument;
  /** CSV 결과 (format=CSV일 때) */
  csvDocument?: CsvDocument;
  /** XLSX 결과 (format=XLSX일 때) */
  xlsxDocument?: XlsxDocument;
  /** 공통 bundle */
  bundle: ExportBundle;
};

// ─── 9. Format별 Block 배치 규칙 ────────────────────────────────────

/** Word: 어떤 block이 문단/표/부록으로 가는지 */
export type WordBlockPlacement =
  | "PARAGRAPH"
  | "TABLE"
  | "BULLET"
  | "APPENDIX"
  | "INLINE_WARNING";

/** PPT: 어떤 block이 headline/supporting/visual 되는지 */
export type PptBlockPlacement =
  | "SLIDE_HEADLINE"
  | "SUPPORTING_POINT"
  | "VISUAL_HINT"
  | "SPEAKER_NOTE"
  | "BACKUP_SLIDE";

/** PDF: 어떤 block이 본문/요약/부록으로 가는지 */
export type PdfBlockPlacement =
  | "COVER"
  | "BODY"
  | "SUMMARY"
  | "APPENDIX"
  | "FOOTER_WARNING"
  | "WATERMARK";

export const WORD_BLOCK_PLACEMENT: Record<ExportBlockRole, WordBlockPlacement> =
  {
    TITLE: "PARAGRAPH",
    SUMMARY: "PARAGRAPH",
    BODY: "PARAGRAPH",
    TABLE: "TABLE",
    CHART_HINT: "TABLE",
    EVIDENCE: "APPENDIX",
    ACTION: "BULLET",
    WARNING: "INLINE_WARNING",
    FAQ: "TABLE",
    COMPARISON: "TABLE",
    RISK: "INLINE_WARNING",
    APPENDIX: "APPENDIX",
  };

export const PPT_BLOCK_PLACEMENT: Record<ExportBlockRole, PptBlockPlacement> = {
  TITLE: "SLIDE_HEADLINE",
  SUMMARY: "SLIDE_HEADLINE",
  BODY: "SUPPORTING_POINT",
  TABLE: "VISUAL_HINT",
  CHART_HINT: "VISUAL_HINT",
  EVIDENCE: "BACKUP_SLIDE",
  ACTION: "SUPPORTING_POINT",
  WARNING: "SPEAKER_NOTE",
  FAQ: "SUPPORTING_POINT",
  COMPARISON: "VISUAL_HINT",
  RISK: "SPEAKER_NOTE",
  APPENDIX: "BACKUP_SLIDE",
};

export const PDF_BLOCK_PLACEMENT: Record<ExportBlockRole, PdfBlockPlacement> = {
  TITLE: "COVER",
  SUMMARY: "SUMMARY",
  BODY: "BODY",
  TABLE: "BODY",
  CHART_HINT: "BODY",
  EVIDENCE: "APPENDIX",
  ACTION: "BODY",
  WARNING: "FOOTER_WARNING",
  FAQ: "BODY",
  COMPARISON: "BODY",
  RISK: "FOOTER_WARNING",
  APPENDIX: "APPENDIX",
};
