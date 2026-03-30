/**
 * VerticalDifferenceHighlighter
 *
 * 4개 업종 비교 결과에서 시각적으로 강조할 차이점을 분석.
 * VerticalComparisonData를 입력으로 받아 UI에서 강조 표시할
 * 셀/행/섹션 위치와 강조 수준을 결정.
 *
 * 하는 일:
 * 1. 행 단위 차이 감지 → hasDifference 기반 강조 행 추출
 * 2. 셀 단위 이상값 감지 → 4개 중 혼자 다른 값 탐지
 * 3. 섹션 단위 요약 → 어떤 비교 섹션에 차이가 가장 많은지
 * 4. 업종 단위 요약 → 어떤 업종이 가장 많이 다른지
 */

import type { IndustryType } from "./types";
import type {
  VerticalComparisonData,
  HighlightedDifference,
  SummaryComparisonRow,
  BlockComparisonRow,
  EvidenceComparisonRow,
  ActionComparisonRow,
  WarningComparisonRow,
  ToneComparisonRow,
  QualityComparisonRow,
} from "./vertical-comparison-assembler";

// ─── Output Types ─────────────────────────────────────────────────

/** 강조 대상 셀 */
export type HighlightCell = {
  section: ComparisonSection;
  rowIndex: number;
  industry: IndustryType;
  reason: string;
  level: "CRITICAL" | "WARNING" | "INFO";
};

/** 강조 대상 행 */
export type HighlightRow = {
  section: ComparisonSection;
  rowIndex: number;
  dimension: string;
  level: "CRITICAL" | "WARNING" | "INFO";
};

/** 섹션별 차이 요약 */
export type SectionDifferenceSummary = {
  section: ComparisonSection;
  label: string;
  totalRows: number;
  diffRows: number;
  diffRatio: number;
  topDifference?: string;
};

/** 업종별 이탈도 요약 */
export type IndustryDeviationSummary = {
  industry: IndustryType;
  label: string;
  /** 이 업종이 다른 3개와 다른 항목 수 */
  deviationCount: number;
  /** 주요 이탈 항목 */
  topDeviations: string[];
};

/** 전체 강조 결과 */
export type DifferenceHighlightResult = {
  highlightCells: HighlightCell[];
  highlightRows: HighlightRow[];
  sectionSummaries: SectionDifferenceSummary[];
  industryDeviations: IndustryDeviationSummary[];
  /** 가장 차이가 큰 섹션 */
  mostDifferentSection: ComparisonSection;
  /** 가장 이탈이 큰 업종 */
  mostDeviatingIndustry: IndustryType;
  /** 전체 차이 점수 (0-1) */
  overallDifferenceScore: number;
};

export type ComparisonSection =
  | "SUMMARY"
  | "BLOCK"
  | "EVIDENCE"
  | "ACTION"
  | "WARNING"
  | "TONE"
  | "QUALITY";

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

const SECTION_LABELS: Record<ComparisonSection, string> = {
  SUMMARY: "요약",
  BLOCK: "블록 구성",
  EVIDENCE: "Evidence",
  ACTION: "Action",
  WARNING: "경고",
  TONE: "톤",
  QUALITY: "품질",
};

// ─── Service ──────────────────────────────────────────────────────

export class VerticalDifferenceHighlighter {
  /**
   * 비교 데이터에서 강조 대상 추출
   */
  highlight(data: VerticalComparisonData): DifferenceHighlightResult {
    const highlightCells: HighlightCell[] = [];
    const highlightRows: HighlightRow[] = [];

    // 1. 각 섹션별 행 단위 분석
    this.analyzeSimpleRows(
      "SUMMARY",
      data.summaryComparison,
      highlightRows,
      highlightCells,
    );
    this.analyzeBlockRows(data.blockComparison, highlightRows, highlightCells);
    this.analyzeSimpleRows(
      "EVIDENCE",
      data.evidenceComparison,
      highlightRows,
      highlightCells,
    );
    this.analyzeActionRows(
      data.actionComparison,
      highlightRows,
      highlightCells,
    );
    this.analyzeWarningRows(
      data.warningComparison,
      highlightRows,
      highlightCells,
    );
    this.analyzeSimpleRows(
      "TONE",
      data.toneComparison,
      highlightRows,
      highlightCells,
    );
    this.analyzeQualityRows(
      data.qualityComparison,
      highlightRows,
      highlightCells,
    );

    // 2. 섹션별 요약
    const sectionSummaries = this.buildSectionSummaries(data);

    // 3. 업종별 이탈도
    const industryDeviations = this.buildIndustryDeviations(
      data,
      highlightCells,
    );

    // 4. 전체 점수
    const totalRows = sectionSummaries.reduce((s, sec) => s + sec.totalRows, 0);
    const totalDiffRows = sectionSummaries.reduce(
      (s, sec) => s + sec.diffRows,
      0,
    );
    const overallDifferenceScore =
      totalRows > 0 ? totalDiffRows / totalRows : 0;

    const mostDifferentSection = sectionSummaries.reduce((a, b) =>
      b.diffRatio > a.diffRatio ? b : a,
    ).section;

    const mostDeviatingIndustry = industryDeviations.reduce((a, b) =>
      b.deviationCount > a.deviationCount ? b : a,
    ).industry;

    return {
      highlightCells,
      highlightRows,
      sectionSummaries,
      industryDeviations,
      mostDifferentSection,
      mostDeviatingIndustry,
      overallDifferenceScore,
    };
  }

  // ─── Simple Row Analysis ─────────────────────────────────────────

  private analyzeSimpleRows(
    section: ComparisonSection,
    rows: {
      dimension: string;
      values: Record<IndustryType, string>;
      hasDifference: boolean;
    }[],
    highlightRows: HighlightRow[],
    highlightCells: HighlightCell[],
  ): void {
    rows.forEach((row, idx) => {
      if (!row.hasDifference) return;

      highlightRows.push({
        section,
        rowIndex: idx,
        dimension: row.dimension,
        level: this.inferRowLevel(section, row.dimension),
      });

      // 혼자 다른 값 탐지
      this.detectOutlierCells(section, idx, row.values, highlightCells);
    });
  }

  // ─── Block Row Analysis ──────────────────────────────────────────

  private analyzeBlockRows(
    rows: BlockComparisonRow[],
    highlightRows: HighlightRow[],
    highlightCells: HighlightCell[],
  ): void {
    rows.forEach((row, idx) => {
      if (!row.hasDifference) return;

      highlightRows.push({
        section: "BLOCK",
        rowIndex: idx,
        dimension: row.blockType,
        level: row.differenceNote?.includes("숨김") ? "WARNING" : "INFO",
      });

      // HIDDEN인 업종 강조
      for (const industry of ALL_INDUSTRIES) {
        if (row.values[industry].emphasis === "HIDDEN") {
          highlightCells.push({
            section: "BLOCK",
            rowIndex: idx,
            industry,
            reason: `${row.blockType} 블록 숨김`,
            level: "WARNING",
          });
        }
      }
    });
  }

  // ─── Action Row Analysis ─────────────────────────────────────────

  private analyzeActionRows(
    rows: ActionComparisonRow[],
    highlightRows: HighlightRow[],
    highlightCells: HighlightCell[],
  ): void {
    rows.forEach((row, idx) => {
      if (!row.hasDifference) return;

      highlightRows.push({
        section: "ACTION",
        rowIndex: idx,
        dimension: row.originalAction,
        level: "INFO",
      });

      // 우선순위가 다른 경우
      const priorities = ALL_INDUSTRIES.map((i) => row.values[i].priority);
      const uniquePriorities = new Set(priorities.filter((p) => p !== "-"));
      if (uniquePriorities.size > 1) {
        for (const industry of ALL_INDUSTRIES) {
          const count = priorities.filter(
            (p) => p === row.values[industry].priority,
          ).length;
          if (count === 1 && row.values[industry].priority !== "-") {
            highlightCells.push({
              section: "ACTION",
              rowIndex: idx,
              industry,
              reason: `우선순위 이탈: ${row.values[industry].priority}`,
              level: "INFO",
            });
          }
        }
      }
    });
  }

  // ─── Warning Row Analysis ────────────────────────────────────────

  private analyzeWarningRows(
    rows: WarningComparisonRow[],
    highlightRows: HighlightRow[],
    highlightCells: HighlightCell[],
  ): void {
    rows.forEach((row, idx) => {
      if (!row.hasDifference) return;

      highlightRows.push({
        section: "WARNING",
        rowIndex: idx,
        dimension: row.category,
        level: "WARNING",
      });

      // 경고가 가장 많은 업종 강조
      let maxCount = 0;
      for (const industry of ALL_INDUSTRIES) {
        maxCount = Math.max(maxCount, row.values[industry].length);
      }
      for (const industry of ALL_INDUSTRIES) {
        if (row.values[industry].length === maxCount && maxCount > 0) {
          highlightCells.push({
            section: "WARNING",
            rowIndex: idx,
            industry,
            reason: `${row.category} ${row.values[industry].length}건 (최다)`,
            level: "WARNING",
          });
        }
      }
    });
  }

  // ─── Quality Row Analysis ────────────────────────────────────────

  private analyzeQualityRows(
    rows: QualityComparisonRow[],
    highlightRows: HighlightRow[],
    highlightCells: HighlightCell[],
  ): void {
    rows.forEach((row, idx) => {
      if (!row.hasDifference) return;

      const level =
        row.severity === "CRITICAL"
          ? "CRITICAL"
          : row.severity === "WARNING"
            ? "WARNING"
            : "INFO";

      highlightRows.push({
        section: "QUALITY",
        rowIndex: idx,
        dimension: row.dimension,
        level,
      });

      this.detectOutlierCells("QUALITY", idx, row.values, highlightCells);
    });
  }

  // ─── Outlier Detection ───────────────────────────────────────────

  /**
   * 4개 값 중 혼자만 다른 값(이상값) 탐지
   */
  private detectOutlierCells(
    section: ComparisonSection,
    rowIndex: number,
    values: Record<IndustryType, string>,
    highlightCells: HighlightCell[],
  ): void {
    const valueCounts = new Map<string, IndustryType[]>();
    for (const industry of ALL_INDUSTRIES) {
      const v = values[industry];
      if (!valueCounts.has(v)) valueCounts.set(v, []);
      valueCounts.get(v)!.push(industry);
    }

    // 혼자만 다른 값인 경우 강조
    for (const [value, industries] of valueCounts) {
      if (industries.length === 1) {
        highlightCells.push({
          section,
          rowIndex,
          industry: industries[0]!,
          reason: `이상값: ${value}`,
          level: "INFO",
        });
      }
    }
  }

  // ─── Section Summaries ───────────────────────────────────────────

  private buildSectionSummaries(
    data: VerticalComparisonData,
  ): SectionDifferenceSummary[] {
    const sections: {
      section: ComparisonSection;
      rows: { hasDifference: boolean }[];
    }[] = [
      { section: "SUMMARY", rows: data.summaryComparison },
      { section: "BLOCK", rows: data.blockComparison },
      { section: "EVIDENCE", rows: data.evidenceComparison },
      { section: "ACTION", rows: data.actionComparison },
      { section: "WARNING", rows: data.warningComparison },
      { section: "TONE", rows: data.toneComparison },
      { section: "QUALITY", rows: data.qualityComparison },
    ];

    return sections.map(({ section, rows }) => {
      const diffRows = rows.filter((r) => r.hasDifference).length;
      const topDiff = data.highlightedDifferences.find(
        (d) => d.category === section,
      );
      return {
        section,
        label: SECTION_LABELS[section],
        totalRows: rows.length,
        diffRows,
        diffRatio: rows.length > 0 ? diffRows / rows.length : 0,
        topDifference: topDiff?.description,
      };
    });
  }

  // ─── Industry Deviations ─────────────────────────────────────────

  private buildIndustryDeviations(
    data: VerticalComparisonData,
    highlightCells: HighlightCell[],
  ): IndustryDeviationSummary[] {
    return ALL_INDUSTRIES.map((industry) => {
      const cells = highlightCells.filter((c) => c.industry === industry);
      const topDeviations = cells
        .slice(0, 3)
        .map((c) => `${SECTION_LABELS[c.section]}: ${c.reason}`);

      return {
        industry,
        label: LABELS[industry],
        deviationCount: cells.length,
        topDeviations,
      };
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  private inferRowLevel(
    section: ComparisonSection,
    dimension: string,
  ): "CRITICAL" | "WARNING" | "INFO" {
    // 톤/품질 관련 차이는 더 높은 수준
    if (
      section === "TONE" &&
      (dimension === "기본 톤" || dimension === "리스크 강도")
    )
      return "WARNING";
    if (section === "QUALITY") return "WARNING";
    if (section === "WARNING") return "WARNING";
    return "INFO";
  }
}
