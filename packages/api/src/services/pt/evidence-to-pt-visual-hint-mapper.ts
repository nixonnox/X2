/**
 * EvidenceToPtVisualHintMapper
 *
 * Evidence 카테고리와 데이터 유형에 따라 PT 장표에 적합한 시각화 유형을 추천.
 *
 * 입력: EvidenceRef[] + displayType
 * 출력: RecommendedVisualType
 *
 * evidence 연결: 각 evidence의 category/displayType으로 visual hint 결정
 * confidence 처리: low confidence인 경우 quote_highlight로 대체 추천
 */

import type { EvidenceRef, RecommendedVisualType, PtSlideType } from "./types";

const CATEGORY_VISUAL_MAP: Record<string, RecommendedVisualType> = {
  search_intelligence_quality: "metric_dashboard",
  search_cluster_distribution: "cluster_board",
  search_cluster_detail: "comparison_table",
  search_pathfinder_graph: "path_graph",
  search_roadview_stages: "stage_flow",
  search_persona_profiles: "persona_cards",
  search_source_summary: "evidence_panel",
  search_quality_warnings: "quote_highlight",
};

const DISPLAY_TYPE_VISUAL_MAP: Record<string, RecommendedVisualType> = {
  KPI_CARD: "metric_dashboard",
  PIE_CHART: "cluster_board",
  BAR_CHART: "trend_bar",
  TABLE: "comparison_table",
  FLOW_DIAGRAM: "path_graph",
  QUOTE_LIST: "quote_highlight",
  LINE_CHART: "line_chart",
};

const SLIDE_DEFAULT_VISUAL: Record<PtSlideType, RecommendedVisualType> = {
  TITLE: "none",
  EXECUTIVE_SUMMARY: "executive_summary_card",
  PROBLEM_DEFINITION: "trend_bar",
  OPPORTUNITY: "funnel_chart",
  PATHFINDER: "path_graph",
  ROADVIEW: "stage_flow",
  PERSONA: "persona_cards",
  CLUSTER: "cluster_board",
  SOCIAL_INSIGHT: "quote_highlight",
  COMPETITIVE_GAP: "comparison_table",
  GEO_AEO: "comparison_table",
  STRATEGY: "none",
  ACTION: "none",
  EXPECTED_IMPACT: "metric_dashboard",
  EVIDENCE: "evidence_panel",
  CLOSING: "none",
};

export class EvidenceToPtVisualHintMapper {
  /**
   * Evidence 카테고리 기반으로 시각화 유형을 추천.
   */
  inferFromEvidence(
    evidenceRefs: EvidenceRef[],
    displayType?: string,
  ): RecommendedVisualType {
    // displayType 우선
    if (displayType && DISPLAY_TYPE_VISUAL_MAP[displayType]) {
      return DISPLAY_TYPE_VISUAL_MAP[displayType];
    }

    // 가장 빈번한 카테고리의 visual 사용
    if (evidenceRefs.length > 0) {
      const categoryCount = new Map<string, number>();
      for (const ref of evidenceRefs) {
        categoryCount.set(
          ref.category,
          (categoryCount.get(ref.category) ?? 0) + 1,
        );
      }
      const topCategory = [...categoryCount.entries()].sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0];
      if (topCategory && CATEGORY_VISUAL_MAP[topCategory]) {
        return CATEGORY_VISUAL_MAP[topCategory];
      }
    }

    return "none";
  }

  /**
   * 슬라이드 유형의 기본 시각화 추천.
   */
  getDefaultForSlide(slideType: PtSlideType): RecommendedVisualType {
    return SLIDE_DEFAULT_VISUAL[slideType] ?? "none";
  }

  /**
   * Evidence + 슬라이드 유형을 결합하여 최적 시각화 추천.
   * evidence가 있으면 evidence 기반, 없으면 슬라이드 기본값.
   */
  recommend(
    slideType: PtSlideType,
    evidenceRefs: EvidenceRef[],
    displayType?: string,
  ): RecommendedVisualType {
    const fromEvidence = this.inferFromEvidence(evidenceRefs, displayType);
    if (fromEvidence !== "none") return fromEvidence;
    return this.getDefaultForSlide(slideType);
  }
}
