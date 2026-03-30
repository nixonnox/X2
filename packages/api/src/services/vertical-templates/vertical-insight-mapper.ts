/**
 * VerticalInsightMapper
 *
 * 공통 insight를 업종별 해석 포인트로 변환.
 * "같은 인사이트라도 뷰티에서는 성분 관점, 금융에서는 조건 관점으로 해석"
 *
 * 핵심 원칙:
 * - evidence 없는 업종별 해석 금지
 * - 원본 인사이트를 왜곡하지 않음 (프레이밍만 변경)
 * - confidence/stale/partial 상태 유지
 */

import type {
  IndustryType,
  VerticalInsightMapping,
  VerticalTemplate,
} from "./types";
import { VerticalTemplateRegistryService } from "./vertical-template-registry";

type InsightItem = {
  id?: string;
  type: string;
  title: string;
  description: string;
  confidence?: number;
  evidenceRefs?: { category: string }[];
};

export class VerticalInsightMapper {
  private registry = new VerticalTemplateRegistryService();

  /**
   * 공통 인사이트를 업종 맥락으로 변환
   */
  mapInsights(
    insights: InsightItem[],
    industry: IndustryType,
  ): VerticalInsightMapping[] {
    const template = this.registry.getTemplate(industry);

    return insights
      .map((insight) => this.mapSingle(insight, template))
      .sort((a, b) => b.verticalRelevance - a.verticalRelevance);
  }

  private mapSingle(
    insight: InsightItem,
    template: VerticalTemplate,
  ): VerticalInsightMapping {
    const relevance = this.calculateRelevance(insight, template);
    const framing = this.buildFraming(insight, template);
    const interpretation = this.buildInterpretation(insight, template);

    return {
      originalInsight: {
        id: insight.id,
        type: insight.type,
        title: insight.title,
        description: insight.description,
      },
      verticalInterpretation: interpretation,
      verticalRelevance: relevance,
      framing,
    };
  }

  /**
   * 업종별 관련도 계산 (0-1)
   * - 우선 인사이트 유형 매칭: +0.3
   * - 업종 키워드 포함: +0.2 per keyword (max 0.4)
   * - evidence 존재: +0.2
   * - 기본: 0.1
   */
  private calculateRelevance(
    insight: InsightItem,
    template: VerticalTemplate,
  ): number {
    let score = 0.1;

    // 우선 인사이트 유형 매칭
    if (template.insightPriority.priorityTypes.includes(insight.type)) {
      score += 0.3;
    }

    // 업종 키워드 매칭
    const text = `${insight.title} ${insight.description}`.toLowerCase();
    let keywordHits = 0;
    for (const kw of template.insightPriority.interpretationKeywords) {
      if (text.includes(kw.toLowerCase())) {
        keywordHits++;
      }
    }
    score += Math.min(keywordHits * 0.2, 0.4);

    // evidence 존재
    if (insight.evidenceRefs?.length) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * 업종 맥락 프레이밍 생성
   */
  private buildFraming(
    insight: InsightItem,
    template: VerticalTemplate,
  ): string {
    return template.insightPriority.framingTemplate
      .replace("{insight}", insight.title)
      .replace("{context}", this.inferContext(insight, template));
  }

  /**
   * 업종 맥락 해석 생성
   * - 원본 description을 유지하면서 업종 맥락 추가
   * - evidence 없으면 원본 그대로 반환 (업종별 해석 금지)
   */
  private buildInterpretation(
    insight: InsightItem,
    template: VerticalTemplate,
  ): string {
    // evidence 없으면 원본 유지 (업종별 해석 금지)
    if (!insight.evidenceRefs?.length) {
      return insight.description;
    }

    // 업종 키워드가 이미 포함되어 있으면 원본 유지
    const text = insight.description.toLowerCase();
    const hasVerticalContext =
      template.insightPriority.interpretationKeywords.some((kw) =>
        text.includes(kw.toLowerCase()),
      );

    if (hasVerticalContext) {
      return insight.description;
    }

    // 업종 맥락 추가
    const context = this.inferContext(insight, template);
    return `${insight.description} (${template.label} 관점: ${context})`;
  }

  /**
   * 인사이트 유형에서 업종 맥락 추론
   */
  private inferContext(
    insight: InsightItem,
    template: VerticalTemplate,
  ): string {
    switch (template.industryType) {
      case "BEAUTY":
        return this.beautyContext(insight);
      case "FNB":
        return this.fnbContext(insight);
      case "FINANCE":
        return this.financeContext(insight);
      case "ENTERTAINMENT":
        return this.entertainmentContext(insight);
      default:
        return "일반 분석";
    }
  }

  private beautyContext(insight: InsightItem): string {
    const type = insight.type;
    if (type.includes("TREND")) return "성분/효능 트렌드 변화";
    if (type.includes("COMPARISON") || type.includes("GAP"))
      return "제품/성분 비교 검토";
    if (type.includes("PERSONA") || type.includes("SEGMENT"))
      return "피부 고민별 고객 분류";
    if (type.includes("JOURNEY") || type.includes("STAGE"))
      return "구매 결정 과정";
    return "뷰티 고객 검색 행동";
  }

  private fnbContext(insight: InsightItem): string {
    const type = insight.type;
    if (type.includes("TREND")) return "메뉴/시즌 트렌드";
    if (type.includes("COMPARISON") || type.includes("GAP"))
      return "메뉴/가격 비교";
    if (type.includes("PERSONA") || type.includes("SEGMENT"))
      return "방문 고객 유형";
    if (type.includes("JOURNEY") || type.includes("STAGE"))
      return "방문 의사결정 과정";
    return "F&B 고객 탐색 행동";
  }

  private financeContext(insight: InsightItem): string {
    const type = insight.type;
    if (type.includes("TREND")) return "금리/조건 변화 관심";
    if (type.includes("COMPARISON") || type.includes("GAP"))
      return "상품 조건 비교 검토";
    if (type.includes("PERSONA") || type.includes("SEGMENT"))
      return "금융 상품 탐색 고객 유형";
    if (type.includes("JOURNEY") || type.includes("STAGE"))
      return "상품 가입 의사결정 과정";
    return "금융 상품 검색 행동";
  }

  private entertainmentContext(insight: InsightItem): string {
    const type = insight.type;
    if (type.includes("TREND")) return "이슈/컨텐츠 확산 타이밍";
    if (type.includes("COMPARISON") || type.includes("GAP"))
      return "콘텐츠/IP 반응 비교";
    if (type.includes("PERSONA") || type.includes("SEGMENT"))
      return "팬 참여 유형";
    if (type.includes("JOURNEY") || type.includes("STAGE"))
      return "콘텐츠 소비 확산 단계";
    return "팬/오디언스 검색 반응";
  }
}
