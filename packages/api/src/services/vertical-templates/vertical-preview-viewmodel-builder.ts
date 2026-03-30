/**
 * VerticalPreviewViewModelBuilder
 *
 * VerticalPreviewResult(백엔드 원시 데이터) → 프론트엔드 ViewModel 변환.
 * UI에서 바로 렌더링할 수 있는 구조로 변환.
 *
 * 하는 일:
 * 1. VerticalPreviewResult → VerticalPreviewViewModel (전체 화면)
 * 2. ComparisonData → VerticalComparisonRow[] (비교 테이블)
 * 3. 상태 정보 → VerticalPreviewScreenState (UI 상태)
 */

import type { IndustryType } from "./types";
import type { VerticalPreviewResult } from "./vertical-preview.service";
import type {
  VerticalComparisonData,
  SummaryComparisonRow,
  BlockComparisonRow,
  ActionComparisonRow,
  WarningComparisonRow,
} from "./vertical-comparison-assembler";
import type {
  DifferenceHighlightResult,
  ComparisonSection,
} from "./vertical-difference-highlighter";

// ─── ViewModel Types ──────────────────────────────────────────────

/** 전체 프리뷰 화면 ViewModel */
export type VerticalPreviewViewModel = {
  /** 페이지 제목 */
  title: string;
  /** 입력 요약 */
  inputSummary: InputSummaryViewModel;
  /** 업종 추론 결과 */
  suggestionBadge: SuggestionBadgeViewModel;
  /** 4개 업종 컬럼 헤더 */
  industryColumns: IndustryColumnViewModel[];
  /** 비교 섹션들 */
  comparisonSections: ComparisonSectionViewModel[];
  /** 차이점 요약 패널 */
  differenceSummary: DifferenceSummaryViewModel;
  /** 전체 차이 점수 바 */
  overallScore: {
    score: number;
    label: string;
    colorClass: string;
  };
  /** 생성 시각 */
  generatedAt: string;
};

/** 입력 요약 ViewModel */
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

/** 업종 추천 뱃지 ViewModel */
export type SuggestionBadgeViewModel = {
  industry: IndustryType;
  label: string;
  confidence: string;
  confidencePercent: number;
  colorClass: string;
  reasoning: string;
};

/** 업종 컬럼 헤더 ViewModel */
export type IndustryColumnViewModel = {
  industry: IndustryType;
  label: string;
  isRecommended: boolean;
  colorClass: string;
  deviationCount: number;
  deviationLabel: string;
};

/** 비교 섹션 ViewModel */
export type ComparisonSectionViewModel = {
  section: ComparisonSection;
  label: string;
  icon: string;
  diffCount: number;
  totalCount: number;
  hasDifferences: boolean;
  rows: VerticalComparisonRowViewModel[];
};

/** 비교 행 ViewModel (통합) */
export type VerticalComparisonRowViewModel = {
  id: string;
  dimension: string;
  hasDifference: boolean;
  highlightLevel?: "CRITICAL" | "WARNING" | "INFO";
  cells: VerticalComparisonCellViewModel[];
};

/** 비교 셀 ViewModel */
export type VerticalComparisonCellViewModel = {
  industry: IndustryType;
  value: string;
  subValue?: string;
  isOutlier: boolean;
  highlightLevel?: "CRITICAL" | "WARNING" | "INFO";
  highlightReason?: string;
};

/** 차이점 요약 ViewModel */
export type DifferenceSummaryViewModel = {
  totalDifferences: number;
  mostDifferentSection: { section: string; label: string };
  mostDeviatingIndustry: { industry: string; label: string };
  topDifferences: {
    description: string;
    severity: string;
    colorClass: string;
  }[];
  industryDeviations: {
    industry: string;
    label: string;
    count: number;
    topItems: string[];
  }[];
};

/** 화면 상태 ViewModel */
export type VerticalPreviewScreenState = {
  status: "idle" | "loading" | "success" | "error";
  isEmpty: boolean;
  hasError: boolean;
  errorMessage?: string;
  loadingMessage?: string;
  /** 데이터 품질 경고 */
  qualityWarnings: string[];
  /** mock 데이터 여부 */
  isMockBased: boolean;
  /** stale 데이터 여부 */
  isStale: boolean;
  /** partial 데이터 여부 */
  isPartial: boolean;
};

// ─── Constants ────────────────────────────────────────────────────

const ALL_INDUSTRIES: IndustryType[] = [
  "BEAUTY",
  "FNB",
  "FINANCE",
  "ENTERTAINMENT",
];

const LABELS: Record<IndustryType, string> = {
  BEAUTY: "뷰티",
  FNB: "F&B",
  FINANCE: "금융",
  ENTERTAINMENT: "엔터",
};

const INDUSTRY_COLORS: Record<IndustryType, string> = {
  BEAUTY: "text-pink-600 bg-pink-50 border-pink-200",
  FNB: "text-orange-600 bg-orange-50 border-orange-200",
  FINANCE: "text-blue-600 bg-blue-50 border-blue-200",
  ENTERTAINMENT: "text-purple-600 bg-purple-50 border-purple-200",
};

const OUTPUT_TYPE_LABELS: Record<string, string> = {
  WORKDOC: "실무형 보고서",
  PT_DECK: "PT 데크",
  GENERATED_DOCUMENT: "배포형 문서",
};

const SECTION_ICONS: Record<ComparisonSection, string> = {
  SUMMARY: "FileText",
  BLOCK: "LayoutGrid",
  EVIDENCE: "Database",
  ACTION: "Zap",
  WARNING: "AlertTriangle",
  TONE: "MessageSquare",
  QUALITY: "Shield",
};

const SECTION_LABELS: Record<ComparisonSection, string> = {
  SUMMARY: "요약 비교",
  BLOCK: "블록 구성",
  EVIDENCE: "Evidence 정책",
  ACTION: "Action 프레이밍",
  WARNING: "경고/규제",
  TONE: "톤/표현",
  QUALITY: "품질 기준",
};

// ─── Service ──────────────────────────────────────────────────────

export class VerticalPreviewViewModelBuilder {
  /**
   * 전체 프리뷰 결과 → ViewModel 변환
   */
  build(result: VerticalPreviewResult): VerticalPreviewViewModel {
    const { comparisonData, differenceHighlight, suggestion } = result;

    return {
      title: `${result.seedKeyword} — 업종별 비교 프리뷰`,
      inputSummary: this.buildInputSummary(result),
      suggestionBadge: this.buildSuggestionBadge(suggestion, result),
      industryColumns: this.buildIndustryColumns(
        suggestion.suggestedIndustry,
        differenceHighlight,
      ),
      comparisonSections: this.buildComparisonSections(
        comparisonData,
        differenceHighlight,
      ),
      differenceSummary: this.buildDifferenceSummary(
        differenceHighlight,
        comparisonData,
      ),
      overallScore: this.buildOverallScore(
        differenceHighlight.overallDifferenceScore,
      ),
      generatedAt: result.generatedAt,
    };
  }

  /**
   * 화면 상태 ViewModel 생성
   */
  buildScreenState(
    partial: Partial<VerticalPreviewScreenState>,
    status: "idle" | "loading" | "success" | "error",
    errorMessage?: string,
  ): VerticalPreviewScreenState {
    return {
      status,
      isEmpty: partial.isEmpty ?? false,
      hasError: status === "error",
      errorMessage,
      loadingMessage:
        status === "loading" ? "4개 업종 비교 프리뷰 생성 중..." : undefined,
      qualityWarnings: partial.qualityWarnings ?? [],
      isMockBased: partial.isMockBased ?? false,
      isStale: partial.isStale ?? false,
      isPartial: partial.isPartial ?? false,
    };
  }

  // ─── Private ────────────────────────────────────────────────────

  private buildInputSummary(
    result: VerticalPreviewResult,
  ): InputSummaryViewModel {
    const { comparisonData } = result;
    const input = comparisonData.inputSummary;

    return {
      seedKeyword: input.seedKeyword,
      outputType: input.outputType,
      outputTypeLabel: OUTPUT_TYPE_LABELS[input.outputType] ?? input.outputType,
      audience: input.audience,
      confidence: `${(input.confidence * 100).toFixed(0)}%`,
      evidenceCount: input.evidenceCount,
      insightCount: input.insightCount,
      actionCount: input.actionCount,
      qualityWarnings: [
        ...(input.isMockOnly ? ["Mock 데이터 기반"] : []),
        ...(input.freshness === "stale" ? ["Stale 데이터"] : []),
        ...(input.isPartial ? ["Partial 데이터"] : []),
      ],
    };
  }

  private buildSuggestionBadge(
    suggestion: any,
    result: VerticalPreviewResult,
  ): SuggestionBadgeViewModel {
    const industry = suggestion.suggestedIndustry ?? "BEAUTY";
    const confidence = suggestion.confidence ?? 0;

    return {
      industry,
      label: LABELS[industry as IndustryType] ?? industry,
      confidence: `${(confidence * 100).toFixed(0)}%`,
      confidencePercent: Math.round(confidence * 100),
      colorClass: INDUSTRY_COLORS[industry as IndustryType] ?? "",
      reasoning: suggestion.reasoning ?? "",
    };
  }

  private buildIndustryColumns(
    recommended: IndustryType | null,
    highlight: DifferenceHighlightResult,
  ): IndustryColumnViewModel[] {
    return ALL_INDUSTRIES.map((industry) => {
      const deviation = highlight.industryDeviations.find(
        (d) => d.industry === industry,
      );
      return {
        industry,
        label: LABELS[industry],
        isRecommended: industry === recommended,
        colorClass: INDUSTRY_COLORS[industry],
        deviationCount: deviation?.deviationCount ?? 0,
        deviationLabel: deviation
          ? `${deviation.deviationCount}개 항목 차이`
          : "차이 없음",
      };
    });
  }

  private buildComparisonSections(
    data: VerticalComparisonData,
    highlight: DifferenceHighlightResult,
  ): ComparisonSectionViewModel[] {
    const sections: ComparisonSectionViewModel[] = [];

    // Summary
    sections.push(
      this.buildSimpleSection("SUMMARY", data.summaryComparison, highlight),
    );
    // Block
    sections.push(this.buildBlockSection(data.blockComparison, highlight));
    // Evidence
    sections.push(
      this.buildSimpleSection("EVIDENCE", data.evidenceComparison, highlight),
    );
    // Action
    sections.push(this.buildActionSection(data.actionComparison, highlight));
    // Warning
    sections.push(this.buildWarningSection(data.warningComparison, highlight));
    // Tone
    sections.push(
      this.buildSimpleSection("TONE", data.toneComparison, highlight),
    );
    // Quality
    sections.push(
      this.buildSimpleSection("QUALITY", data.qualityComparison, highlight),
    );

    return sections;
  }

  private buildSimpleSection(
    section: ComparisonSection,
    rows: {
      dimension: string;
      values: Record<IndustryType, string>;
      hasDifference: boolean;
    }[],
    highlight: DifferenceHighlightResult,
  ): ComparisonSectionViewModel {
    const diffCount = rows.filter((r) => r.hasDifference).length;

    return {
      section,
      label: SECTION_LABELS[section],
      icon: SECTION_ICONS[section],
      diffCount,
      totalCount: rows.length,
      hasDifferences: diffCount > 0,
      rows: rows.map((row, idx) => ({
        id: `${section}-${idx}`,
        dimension: row.dimension,
        hasDifference: row.hasDifference,
        highlightLevel: this.findRowHighlight(highlight, section, idx),
        cells: ALL_INDUSTRIES.map((industry) => ({
          industry,
          value: row.values[industry],
          isOutlier: this.isCellOutlier(highlight, section, idx, industry),
          highlightLevel: this.findCellHighlight(
            highlight,
            section,
            idx,
            industry,
          ),
          highlightReason: this.findCellReason(
            highlight,
            section,
            idx,
            industry,
          ),
        })),
      })),
    };
  }

  private buildBlockSection(
    rows: BlockComparisonRow[],
    highlight: DifferenceHighlightResult,
  ): ComparisonSectionViewModel {
    const diffCount = rows.filter((r) => r.hasDifference).length;

    return {
      section: "BLOCK",
      label: SECTION_LABELS.BLOCK,
      icon: SECTION_ICONS.BLOCK,
      diffCount,
      totalCount: rows.length,
      hasDifferences: diffCount > 0,
      rows: rows.map((row, idx) => ({
        id: `BLOCK-${idx}`,
        dimension: row.blockType,
        hasDifference: row.hasDifference,
        highlightLevel: this.findRowHighlight(highlight, "BLOCK", idx),
        cells: ALL_INDUSTRIES.map((industry) => ({
          industry,
          value: row.values[industry].emphasis,
          subValue:
            row.values[industry].title !== row.blockType
              ? row.values[industry].title
              : undefined,
          isOutlier: this.isCellOutlier(highlight, "BLOCK", idx, industry),
          highlightLevel: this.findCellHighlight(
            highlight,
            "BLOCK",
            idx,
            industry,
          ),
          highlightReason: this.findCellReason(
            highlight,
            "BLOCK",
            idx,
            industry,
          ),
        })),
      })),
    };
  }

  private buildActionSection(
    rows: ActionComparisonRow[],
    highlight: DifferenceHighlightResult,
  ): ComparisonSectionViewModel {
    const diffCount = rows.filter((r) => r.hasDifference).length;

    return {
      section: "ACTION",
      label: SECTION_LABELS.ACTION,
      icon: SECTION_ICONS.ACTION,
      diffCount,
      totalCount: rows.length,
      hasDifferences: diffCount > 0,
      rows: rows.map((row, idx) => ({
        id: `ACTION-${idx}`,
        dimension: row.originalAction,
        hasDifference: row.hasDifference,
        highlightLevel: this.findRowHighlight(highlight, "ACTION", idx),
        cells: ALL_INDUSTRIES.map((industry) => ({
          industry,
          value: row.values[industry].reframedAction,
          subValue: `${row.values[industry].priority} / ${row.values[industry].framing}`,
          isOutlier: this.isCellOutlier(highlight, "ACTION", idx, industry),
          highlightLevel: this.findCellHighlight(
            highlight,
            "ACTION",
            idx,
            industry,
          ),
          highlightReason: this.findCellReason(
            highlight,
            "ACTION",
            idx,
            industry,
          ),
        })),
      })),
    };
  }

  private buildWarningSection(
    rows: WarningComparisonRow[],
    highlight: DifferenceHighlightResult,
  ): ComparisonSectionViewModel {
    const diffCount = rows.filter((r) => r.hasDifference).length;

    return {
      section: "WARNING",
      label: SECTION_LABELS.WARNING,
      icon: SECTION_ICONS.WARNING,
      diffCount,
      totalCount: rows.length,
      hasDifferences: diffCount > 0,
      rows: rows.map((row, idx) => ({
        id: `WARNING-${idx}`,
        dimension: row.category,
        hasDifference: row.hasDifference,
        highlightLevel: this.findRowHighlight(highlight, "WARNING", idx),
        cells: ALL_INDUSTRIES.map((industry) => ({
          industry,
          value:
            row.values[industry].length > 0
              ? `${row.values[industry].length}건`
              : "없음",
          subValue: row.values[industry].slice(0, 2).join(", ") || undefined,
          isOutlier: this.isCellOutlier(highlight, "WARNING", idx, industry),
          highlightLevel: this.findCellHighlight(
            highlight,
            "WARNING",
            idx,
            industry,
          ),
          highlightReason: this.findCellReason(
            highlight,
            "WARNING",
            idx,
            industry,
          ),
        })),
      })),
    };
  }

  private buildDifferenceSummary(
    highlight: DifferenceHighlightResult,
    data: VerticalComparisonData,
  ): DifferenceSummaryViewModel {
    const secSummary = highlight.sectionSummaries.find(
      (s) => s.section === highlight.mostDifferentSection,
    );
    const indDeviation = highlight.industryDeviations.find(
      (d) => d.industry === highlight.mostDeviatingIndustry,
    );

    return {
      totalDifferences: highlight.highlightRows.length,
      mostDifferentSection: {
        section: highlight.mostDifferentSection,
        label: SECTION_LABELS[highlight.mostDifferentSection],
      },
      mostDeviatingIndustry: {
        industry: highlight.mostDeviatingIndustry,
        label: LABELS[highlight.mostDeviatingIndustry],
      },
      topDifferences: data.highlightedDifferences.slice(0, 5).map((d) => ({
        description: d.description,
        severity: d.severity,
        colorClass:
          d.severity === "HIGH"
            ? "text-red-600"
            : d.severity === "MEDIUM"
              ? "text-amber-600"
              : "text-gray-500",
      })),
      industryDeviations: highlight.industryDeviations.map((d) => ({
        industry: d.industry,
        label: d.label,
        count: d.deviationCount,
        topItems: d.topDeviations,
      })),
    };
  }

  private buildOverallScore(score: number): {
    score: number;
    label: string;
    colorClass: string;
  } {
    if (score >= 0.7)
      return { score, label: "차이 매우 큼", colorClass: "bg-red-500" };
    if (score >= 0.4)
      return { score, label: "차이 있음", colorClass: "bg-amber-500" };
    if (score >= 0.1)
      return { score, label: "차이 적음", colorClass: "bg-green-500" };
    return { score, label: "거의 동일", colorClass: "bg-gray-400" };
  }

  // ─── Highlight Lookup Helpers ───────────────────────────────────

  private findRowHighlight(
    highlight: DifferenceHighlightResult,
    section: ComparisonSection,
    rowIndex: number,
  ): "CRITICAL" | "WARNING" | "INFO" | undefined {
    return highlight.highlightRows.find(
      (r) => r.section === section && r.rowIndex === rowIndex,
    )?.level;
  }

  private isCellOutlier(
    highlight: DifferenceHighlightResult,
    section: ComparisonSection,
    rowIndex: number,
    industry: IndustryType,
  ): boolean {
    return highlight.highlightCells.some(
      (c) =>
        c.section === section &&
        c.rowIndex === rowIndex &&
        c.industry === industry,
    );
  }

  private findCellHighlight(
    highlight: DifferenceHighlightResult,
    section: ComparisonSection,
    rowIndex: number,
    industry: IndustryType,
  ): "CRITICAL" | "WARNING" | "INFO" | undefined {
    return highlight.highlightCells.find(
      (c) =>
        c.section === section &&
        c.rowIndex === rowIndex &&
        c.industry === industry,
    )?.level;
  }

  private findCellReason(
    highlight: DifferenceHighlightResult,
    section: ComparisonSection,
    rowIndex: number,
    industry: IndustryType,
  ): string | undefined {
    return highlight.highlightCells.find(
      (c) =>
        c.section === section &&
        c.rowIndex === rowIndex &&
        c.industry === industry,
    )?.reason;
  }
}
