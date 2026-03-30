/**
 * Document Generation Services — Barrel Export
 */

// Types
export type {
  DocumentBlock,
  DocumentBlockType,
  ReportOutputSection,
  ReportOutputSectionType,
  PtSlideBlock,
  PtSlideType,
  DocumentRole,
  DocumentUseCase,
  DocumentQualityMeta,
  GeneratedDocumentOutput,
  ReportOutputType,
  EvidenceRef,
  SourceRef,
  RoleDocumentConfig,
} from "./types";

export { ROLE_DOCUMENT_CONFIG } from "./types";

// Services
export { SearchDocumentGenerationService } from "./search-document-generation.service";
export { GeoAeoDocumentBlockBuilder } from "./geo-aeo-document-block-builder";
export { SearchPtSectionBuilder } from "./search-pt-section-builder";
export { SearchReportOutputBuilder } from "./search-report-output-builder";
export { EvidenceToDocumentMapper } from "./evidence-to-document-mapper";
export { RoleBasedDocumentAssembler } from "./role-based-document-assembler";
