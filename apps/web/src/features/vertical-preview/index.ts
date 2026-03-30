/**
 * Vertical Preview Feature — Public API
 *
 * 4개 업종 비교 프리뷰 기능의 진입점.
 */

// Hooks
export { useVerticalPreviewQuery } from "./hooks/useVerticalPreviewQuery";
export type { UseVerticalPreviewQueryReturn, VerticalPreviewQueryInput } from "./hooks/useVerticalPreviewQuery";

// Types (ViewModels)
export type {
  VerticalPreviewViewModel,
  VerticalPreviewScreenState,
  InputSummaryViewModel,
  SuggestionBadgeViewModel,
  IndustryColumnViewModel,
  ComparisonSectionViewModel,
  ComparisonRowViewModel,
  ComparisonCellViewModel,
  DifferenceSummaryViewModel,
} from "./types/viewModel";

// Mappers
export {
  formatDiffRatio,
  getSectionBadgeClass,
  getCellHighlightClass,
  getRowHighlightClass,
  getIndustryColor,
  getScoreBarWidth,
  formatGeneratedAt,
  buildScreenState,
} from "./mappers/mapPreviewToViewModel";

// Components
export { VerticalPreviewBoard } from "./components/VerticalPreviewBoard";
export { VerticalComparisonMatrix } from "./components/VerticalComparisonMatrix";
export { VerticalDifferencePanel } from "./components/VerticalDifferencePanel";
export { VerticalPreviewStatePanel } from "./components/VerticalPreviewStatePanel";
