/**
 * Vertical Preview ViewModel Types
 *
 * 4개 업종 비교 프리뷰 화면의 ViewModel 타입 정의.
 * 백엔드에서 VerticalPreviewViewModelBuilder가 생성한 구조를
 * 프론트엔드에서 타입 안전하게 사용.
 */

export type IndustryType = "BEAUTY" | "FNB" | "FINANCE" | "ENTERTAINMENT";

// ─── Screen State ─────────────────────────────────────────────────

export type VerticalPreviewScreenState = {
  status: "idle" | "loading" | "success" | "error";
  isEmpty: boolean;
  hasError: boolean;
  errorMessage?: string;
  loadingMessage?: string;
  qualityWarnings: string[];
  isMockBased: boolean;
  isStale: boolean;
  isPartial: boolean;
};

// ─── Main ViewModel ───────────────────────────────────────────────

export type VerticalPreviewViewModel = {
  title: string;
  inputSummary: InputSummaryViewModel;
  suggestionBadge: SuggestionBadgeViewModel;
  industryColumns: IndustryColumnViewModel[];
  comparisonSections: ComparisonSectionViewModel[];
  differenceSummary: DifferenceSummaryViewModel;
  overallScore: {
    score: number;
    label: string;
    colorClass: string;
  };
  generatedAt: string;
};

// ─── Sub ViewModels ───────────────────────────────────────────────

export type InputSummaryViewModel = {
  seedKeyword: string;
  outputType: string;
  outputTypeLabel: string;
  audience: string;
  confidence: string;
  evidenceCount: number;
  insightCount: number;
  actionCount: number;
  qualityWarnings: string[];
};

export type SuggestionBadgeViewModel = {
  industry: string;
  label: string;
  confidence: string;
  confidencePercent: number;
  colorClass: string;
  reasoning: string;
};

export type IndustryColumnViewModel = {
  industry: string;
  label: string;
  isRecommended: boolean;
  colorClass: string;
  deviationCount: number;
  deviationLabel: string;
};

export type ComparisonSectionViewModel = {
  section: string;
  label: string;
  icon: string;
  diffCount: number;
  totalCount: number;
  hasDifferences: boolean;
  rows: ComparisonRowViewModel[];
};

export type ComparisonRowViewModel = {
  id: string;
  dimension: string;
  hasDifference: boolean;
  highlightLevel?: "CRITICAL" | "WARNING" | "INFO";
  cells: ComparisonCellViewModel[];
};

export type ComparisonCellViewModel = {
  industry: string;
  value: string;
  subValue?: string;
  isOutlier: boolean;
  highlightLevel?: "CRITICAL" | "WARNING" | "INFO";
  highlightReason?: string;
};

export type DifferenceSummaryViewModel = {
  totalDifferences: number;
  mostDifferentSection: { section: string; label: string };
  mostDeviatingIndustry: { industry: string; label: string };
  topDifferences: { description: string; severity: string; colorClass: string }[];
  industryDeviations: { industry: string; label: string; count: number; topItems: string[] }[];
};
