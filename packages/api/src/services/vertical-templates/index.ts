/**
 * Vertical Template Engine — Barrel Export
 *
 * 업종별 문서 템플릿 엔진.
 * 공통 문서 엔진(workdocs/, pt/, documents/) 위에 얹는 vertical layer.
 */

// Types
export type {
  IndustryType,
  SupportedOutputType,
  VerticalBlockType,
  BlockEmphasis,
  VerticalBlockConfig,
  ToneGuideline,
  InsightPriority,
  EvidencePolicyConfig,
  ActionPolicyConfig,
  RiskPolicyConfig,
  VerticalTemplate,
  VerticalDocumentProfile,
  VerticalSentenceModification,
  VerticalInsightMapping,
  VerticalActionMapping,
} from "./types";

// Templates
export { BEAUTY_TEMPLATE, BEAUTY_PROFILE } from "./beauty-template";
export { FNB_TEMPLATE, FNB_PROFILE } from "./fnb-template";
export { FINANCE_TEMPLATE, FINANCE_PROFILE } from "./finance-template";
export {
  ENTERTAINMENT_TEMPLATE,
  ENTERTAINMENT_PROFILE,
} from "./entertainment-template";

// Services
export { VerticalTemplateRegistryService } from "./vertical-template-registry";
export { VerticalDocumentAssembler } from "./vertical-document-assembler";
export type {
  VerticalAssemblyInput,
  VerticalAssemblyResult,
} from "./vertical-document-assembler";
export { VerticalInsightMapper } from "./vertical-insight-mapper";
export { VerticalActionMapper } from "./vertical-action-mapper";
export { VerticalEvidencePolicyService } from "./vertical-evidence-policy";
export type { EvidencePolicyResult } from "./vertical-evidence-policy";

// Runtime Connection (Task M)
export { VerticalIndustrySuggester } from "./vertical-industry-suggester";
export type { IndustrySuggestion } from "./vertical-industry-suggester";
export { VerticalPreviewBuilder } from "./vertical-preview-builder";
export type {
  VerticalPreview,
  VerticalComparisonPreview,
  ExportFormatPreview,
} from "./vertical-preview-builder";
export { VerticalDocumentIntegrationService } from "./vertical-document-integration.service";
export type {
  VerticalDocumentGenerationInput,
  VerticalDocumentGenerationResult,
  VerticalDocumentOutputType,
  VerticalExportInput,
  VerticalComparisonInput,
} from "./vertical-document-integration.service";

// Vertical Preview (Task N)
export { VerticalComparisonAssembler } from "./vertical-comparison-assembler";
export type {
  IndustryResult,
  VerticalComparisonData,
  SummaryComparisonRow,
  BlockComparisonRow,
  EvidenceComparisonRow,
  ActionComparisonRow,
  WarningComparisonRow,
  ToneComparisonRow,
  QualityComparisonRow,
  HighlightedDifference,
} from "./vertical-comparison-assembler";
export { VerticalDifferenceHighlighter } from "./vertical-difference-highlighter";
export type {
  HighlightCell,
  HighlightRow,
  SectionDifferenceSummary,
  IndustryDeviationSummary,
  DifferenceHighlightResult,
  ComparisonSection,
} from "./vertical-difference-highlighter";
export { VerticalPreviewService } from "./vertical-preview.service";
export type {
  VerticalPreviewInput,
  VerticalPreviewResult,
} from "./vertical-preview.service";
export { VerticalPreviewViewModelBuilder } from "./vertical-preview-viewmodel-builder";
export type {
  VerticalPreviewViewModel,
  InputSummaryViewModel,
  SuggestionBadgeViewModel,
  IndustryColumnViewModel,
  ComparisonSectionViewModel,
  VerticalComparisonRowViewModel,
  VerticalComparisonCellViewModel,
  DifferenceSummaryViewModel,
  VerticalPreviewScreenState,
} from "./vertical-preview-viewmodel-builder";
