/**
 * mapPreviewToViewModel
 *
 * 백엔드 VerticalPreviewResult → 프론트엔드 ViewModel 변환.
 * 백엔드의 VerticalPreviewViewModelBuilder와 동일한 구조를 생성하되,
 * 프론트엔드 전용 가공(포맷팅, 레이블, CSS 클래스)을 추가.
 *
 * 실제로는 백엔드에서 ViewModel까지 변환하여 내려주므로,
 * 이 mapper는 추가 가공이 필요한 경우에만 사용.
 */

import type {
  VerticalPreviewViewModel,
  VerticalPreviewScreenState,
  ComparisonSectionViewModel,
} from "../types/viewModel";

// ─── 추가 가공 유틸 ───────────────────────────────────────────────

/** 차이 비율 → 표시 문자열 */
export function formatDiffRatio(diffCount: number, totalCount: number): string {
  if (totalCount === 0) return "N/A";
  const ratio = diffCount / totalCount;
  if (ratio === 0) return "동일";
  if (ratio <= 0.3) return `${diffCount}건 차이`;
  if (ratio <= 0.6) return `${diffCount}건 차이 (주의)`;
  return `${diffCount}건 차이 (다수)`;
}

/** 섹션별 배지 색상 */
export function getSectionBadgeClass(section: ComparisonSectionViewModel): string {
  if (!section.hasDifferences) return "bg-gray-100 text-gray-500";
  const ratio = section.diffCount / section.totalCount;
  if (ratio >= 0.6) return "bg-red-100 text-red-700";
  if (ratio >= 0.3) return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

/** 셀 강조 CSS 클래스 */
export function getCellHighlightClass(
  highlightLevel?: "CRITICAL" | "WARNING" | "INFO",
  isOutlier?: boolean,
): string {
  if (highlightLevel === "CRITICAL") return "bg-red-50 border-red-300 ring-1 ring-red-200";
  if (highlightLevel === "WARNING") return "bg-amber-50 border-amber-300";
  if (isOutlier) return "bg-blue-50 border-blue-200";
  return "";
}

/** 행 강조 CSS 클래스 */
export function getRowHighlightClass(
  hasDifference: boolean,
  highlightLevel?: "CRITICAL" | "WARNING" | "INFO",
): string {
  if (!hasDifference) return "";
  if (highlightLevel === "CRITICAL") return "bg-red-50/50";
  if (highlightLevel === "WARNING") return "bg-amber-50/50";
  return "bg-blue-50/30";
}

/** 업종 색상 */
export function getIndustryColor(industry: string): string {
  const colors: Record<string, string> = {
    BEAUTY: "#ec4899",
    FNB: "#f97316",
    FINANCE: "#3b82f6",
    ENTERTAINMENT: "#a855f7",
  };
  return colors[industry] ?? "#6b7280";
}

/** 스코어 바 width 계산 */
export function getScoreBarWidth(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/** 시간 포맷 */
export function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

/** 빈 ScreenState 생성 */
export function buildScreenState(
  partial: Partial<VerticalPreviewScreenState>,
  status: VerticalPreviewScreenState["status"],
  errorMessage?: string,
): VerticalPreviewScreenState {
  return {
    status,
    isEmpty: partial.isEmpty ?? false,
    hasError: status === "error",
    errorMessage,
    loadingMessage: status === "loading" ? "4개 업종 비교 프리뷰 생성 중..." : undefined,
    qualityWarnings: partial.qualityWarnings ?? [],
    isMockBased: partial.isMockBased ?? false,
    isStale: partial.isStale ?? false,
    isPartial: partial.isPartial ?? false,
  };
}
