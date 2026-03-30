/**
 * Work Document Generation — Barrel Export
 *
 * 검색 인텔리전스 결과를 실무형 복붙/정리/보고 문서로 변환하는 서비스 모듈.
 */

// Types
export type {
  WorkDoc,
  WorkDocType,
  WorkDocAudience,
  WorkDocSection,
  WorkDocSentenceBlock,
  WorkDocBlockType,
  SentenceTone,
  WorkDocQualityMeta,
  WorkDocAudienceConfig,
  EvidenceRef,
  SourceRef,
} from "./types";

export {
  WORKDOC_SECTION_MAP,
  WORKDOC_AUDIENCE_CONFIG,
  WORKDOC_TITLES,
  WORKDOC_OBJECTIVES,
} from "./types";

// Services
export { WorkReportGenerationService } from "./work-report-generation.service";
export type { GenerateWorkDocInput } from "./work-report-generation.service";
export { QuickSummaryBuilder } from "./quick-summary-builder";
export { EvidenceToWorkDocMapper } from "./evidence-to-workdoc-mapper";
export { ReportSentenceBuilder } from "./report-sentence-builder";
export { RoleBasedWorkDocAssembler } from "./role-based-workdoc-assembler";
export { WorkDocSectionBuilder } from "./workdoc-section-builder";
