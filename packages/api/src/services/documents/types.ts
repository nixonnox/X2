/**
 * Document Generation Types
 *
 * Search Intelligence → GEO/AEO 문서, PT, 보고서 출력을 위한 공통 모델.
 * 같은 데이터라도 GEO 문서 / PT / 보고서에서 재사용 가능한 구조.
 */

// ─── Evidence & Source References ───────────────────────────────────

export type EvidenceRef = {
  evidenceId: string;
  category: string;
  label: string;
  snippet?: string;
  dataSourceType?: string;
  entityIds?: string[];
};

export type SourceRef = {
  sourceId: string;
  sourceName: string;
  sourceType:
    | "SEARCH_ENGINE"
    | "ANALYTICS"
    | "SOCIAL"
    | "AEO_SNAPSHOT"
    | "INTERNAL"
    | "CITATION";
  url?: string;
  domain?: string;
  trustScore?: number;
  citationReady?: boolean;
};

// ─── Quality Metadata (모든 블록에 공통) ─────────────────────────────

export type DocumentQualityMeta = {
  confidence: number; // 0-1
  freshness?: "fresh" | "recent" | "stale";
  isPartial?: boolean;
  isMockOnly?: boolean;
  warnings?: string[];
};

// ─── 1. DocumentBlock (GEO/AEO + 범용) ──────────────────────────────

export type DocumentBlockType =
  | "FAQ"
  | "SUMMARY"
  | "COMPARISON_TABLE"
  | "INTENT_STAGE_EXPLANATION"
  | "PERSONA_INSIGHT"
  | "KEY_EVIDENCE"
  | "RECOMMENDED_ACTION"
  | "DEFINITION"
  | "STAT_HIGHLIGHT";

export type DocumentBlock = {
  id: string;
  type: DocumentBlockType;
  title: string;
  purpose: string;
  body: string;
  /** 구조화 데이터 (FAQ → questions[], TABLE → rows[] 등) */
  structuredData?: Record<string, unknown>;
  evidenceRefs: EvidenceRef[];
  sourceRefs: SourceRef[];
  quality: DocumentQualityMeta;
  /** GEO/AEO 특화: AI가 인용하기 유리한 포맷인지 */
  geoOptimized?: boolean;
  /** GEO/AEO 특화: schema.org 타입 힌트 */
  schemaHint?: string;
  /** 생성 시각 */
  generatedAt: string;
};

// ─── 2. ReportSection (보고서용) ──────────────────────────────────────

export type ReportOutputSectionType =
  | "EXECUTIVE_SUMMARY"
  | "MARKET_BACKGROUND"
  | "SEARCH_INTENT_OVERVIEW"
  | "CLUSTER_ANALYSIS"
  | "JOURNEY_ANALYSIS"
  | "PERSONA_ANALYSIS"
  | "COMPETITIVE_LANDSCAPE"
  | "RECOMMENDED_ACTIONS"
  | "EVIDENCE_APPENDIX"
  | "GEO_AEO_IMPLICATIONS"
  | "DATA_QUALITY_NOTE";

export type ReportOutputSection = {
  id: string;
  type: ReportOutputSectionType;
  title: string;
  summary: string;
  blocks: DocumentBlock[];
  relatedInsightIds: string[];
  relatedActionIds: string[];
  quality: DocumentQualityMeta;
  order: number;
};

// ─── 3. PtSlideBlock (PT/제안서용) ────────────────────────────────────

export type PtSlideType =
  | "TITLE"
  | "MARKET_BACKGROUND"
  | "INTENT_SHIFT"
  | "JOURNEY_MAP"
  | "PERSONA_ARCHETYPE"
  | "CLUSTER_INSIGHT"
  | "COMPETITIVE_OPPORTUNITY"
  | "RECOMMENDED_ACTION"
  | "EVIDENCE_SUPPORT"
  | "GEO_AEO_INSIGHT"
  | "CAMPAIGN_CONNECTION"
  | "CLOSING";

export type PtSlideBlock = {
  id: string;
  slideType: PtSlideType;
  headline: string;
  subheadline?: string;
  supportingPoints: string[];
  evidenceRefs: EvidenceRef[];
  sourceRefs: SourceRef[];
  /** 시각화 힌트: chart_bar, chart_pie, table, flow_diagram, persona_card 등 */
  visualHint?: string;
  /** 발표자 노트 */
  speakerNote?: string;
  quality: DocumentQualityMeta;
  order: number;
};

// ─── 보고서 유형 ──────────────────────────────────────────────────────

export type ReportOutputType =
  | "WEEKLY_LISTENING"
  | "MONTHLY_SEARCH_INTELLIGENCE"
  | "EXECUTIVE_SUMMARY"
  | "ISSUE_FAQ"
  | "CAMPAIGN_STRATEGY_BRIEF"
  | "GEO_AEO_OPTIMIZATION_MEMO";

// ─── Role / Use Case ─────────────────────────────────────────────────

export type DocumentRole = "PRACTITIONER" | "MARKETER" | "ADMIN" | "EXECUTIVE";

export type DocumentUseCase =
  | "GEO_AEO_DOCUMENT"
  | "PT_PROPOSAL"
  | "WEEKLY_REPORT"
  | "MONTHLY_REPORT"
  | "EXECUTIVE_BRIEF"
  | "CAMPAIGN_BRIEF"
  | "FAQ_REPORT"
  | "OPTIMIZATION_MEMO";

// ─── 최종 출력 ────────────────────────────────────────────────────────

export type GeneratedDocumentOutput = {
  id: string;
  useCase: DocumentUseCase;
  role: DocumentRole;
  title: string;
  generatedAt: string;
  seedKeyword: string;
  quality: DocumentQualityMeta;

  /** GEO/AEO 문서 블록 (use case에 따라) */
  documentBlocks?: DocumentBlock[];
  /** 보고서 섹션 (use case에 따라) */
  reportSections?: ReportOutputSection[];
  /** PT 슬라이드 (use case에 따라) */
  ptSlides?: PtSlideBlock[];

  /** 전체 사용된 evidence 목록 */
  allEvidenceRefs: EvidenceRef[];
  /** 전체 사용된 source 목록 */
  allSourceRefs: SourceRef[];
};

// ─── Role별 문서 설정 ─────────────────────────────────────────────────

export type RoleDocumentConfig = {
  includeRawEvidence: boolean;
  includeQualityWarnings: boolean;
  includeSourceDetail: boolean;
  maxBlocks: number;
  maxSlides: number;
  maxSections: number;
  narrativeStyle: "technical" | "actionable" | "strategic";
};

export const ROLE_DOCUMENT_CONFIG: Record<DocumentRole, RoleDocumentConfig> = {
  PRACTITIONER: {
    includeRawEvidence: true,
    includeQualityWarnings: true,
    includeSourceDetail: true,
    maxBlocks: 20,
    maxSlides: 15,
    maxSections: 12,
    narrativeStyle: "technical",
  },
  MARKETER: {
    includeRawEvidence: false,
    includeQualityWarnings: true,
    includeSourceDetail: false,
    maxBlocks: 15,
    maxSlides: 12,
    maxSections: 8,
    narrativeStyle: "actionable",
  },
  ADMIN: {
    includeRawEvidence: true,
    includeQualityWarnings: true,
    includeSourceDetail: true,
    maxBlocks: 18,
    maxSlides: 12,
    maxSections: 10,
    narrativeStyle: "technical",
  },
  EXECUTIVE: {
    includeRawEvidence: false,
    includeQualityWarnings: false,
    includeSourceDetail: false,
    maxBlocks: 8,
    maxSlides: 10,
    maxSections: 5,
    narrativeStyle: "strategic",
  },
};
