/**
 * Search Intelligence Integration — barrel export
 *
 * Phase 7 파이프라인(Insight/Action/Evidence/Report)에
 * search intelligence 결과를 통합하는 서비스 모음.
 */

// Types
export type {
  SearchTraceMetadata,
  EngineExecutionResult,
  SearchIntelligenceResult,
  SearchDataQualityAssessment,
  DataQualityLevel,
  SearchIntelligenceInput,
  RoleContext,
  RoleOutputConfig,
} from "./types";
export { ROLE_OUTPUT_CONFIG } from "./types";

// Data quality assessment
export { assessSearchDataQuality } from "./search-data-quality";

// Integration services
export { SearchInsightIntegrationService } from "./search-insight-integration.service";
export { SearchActionIntegrationService } from "./search-action-integration.service";
export { SearchEvidenceBundleService } from "./search-evidence-bundle.service";
export { SearchReportSectionBuilder } from "./search-report-section-builder";
export type { SearchReportSection } from "./search-report-section-builder";
export { SearchExecutiveSummaryService } from "./search-executive-summary.service";
export type { SearchExecutiveSummary } from "./search-executive-summary.service";
