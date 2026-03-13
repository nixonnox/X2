/**
 * Competitor Gap Engine.
 *
 * Analyzes gaps between own channel metrics and competitor metrics.
 * Identifies missing content formats, topic gaps, and opportunities.
 *
 * Upgrade path: Add LLM-based strategic analysis via @x2/ai.
 */

import type {
  CompetitorGapResult,
  OpportunityArea,
  CompetitorStrength,
  EngineVersion,
} from "./types";

const ENGINE_VERSION: EngineVersion = {
  engine: "competitor-gap",
  version: "1.0.0",
  model: "metric-comparison-v1",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChannelMetrics = {
  channelId: string;
  channelName: string;
  platform: string;
  subscriberCount: number;
  contentCount: number;
  avgViewCount: number;
  avgEngagementRate: number;
  topTopics: string[];
  contentTypes: string[]; // e.g., "VIDEO", "SHORT", "LIVE", "POST"
  postingFrequency: number; // posts per week
};

// ---------------------------------------------------------------------------
// Competitor Gap Engine
// ---------------------------------------------------------------------------

export class CompetitorGapEngine {
  /**
   * Analyze gaps between own channel and competitors.
   */
  analyze(
    projectId: string,
    ownMetrics: ChannelMetrics,
    competitorMetrics: ChannelMetrics[],
  ): CompetitorGapResult {
    if (competitorMetrics.length === 0) {
      return {
        projectId,
        gapSummary: "경쟁사 데이터가 없어 비교 분석을 수행할 수 없습니다.",
        opportunityAreas: [],
        missingContentFormats: [],
        competitorStrengths: [],
        suggestedActions: ["경쟁사 채널을 등록하여 비교 분석을 시작하세요."],
        engineVersion: ENGINE_VERSION,
      };
    }

    const opportunityAreas: OpportunityArea[] = [];
    const competitorStrengths: CompetitorStrength[] = [];
    const suggestedActions: string[] = [];

    // 1. Subscriber gap
    const avgCompetitorSubs = this.average(
      competitorMetrics.map((c) => c.subscriberCount),
    );
    if (ownMetrics.subscriberCount < avgCompetitorSubs * 0.7) {
      opportunityAreas.push({
        area: "구독자 성장",
        description: `구독자 수(${this.formatNumber(ownMetrics.subscriberCount)})가 경쟁사 평균(${this.formatNumber(avgCompetitorSubs)})보다 낮습니다.`,
        priority: "HIGH",
        relatedKeywords: [],
      });
      suggestedActions.push(
        "구독자 성장을 위한 콜투액션과 콘텐츠 전략을 강화하세요.",
      );
    }

    // 2. Engagement gap
    const avgCompetitorEngagement = this.average(
      competitorMetrics.map((c) => c.avgEngagementRate),
    );
    if (ownMetrics.avgEngagementRate < avgCompetitorEngagement * 0.8) {
      opportunityAreas.push({
        area: "참여율 개선",
        description: `평균 참여율(${(ownMetrics.avgEngagementRate * 100).toFixed(1)}%)이 경쟁사 평균(${(avgCompetitorEngagement * 100).toFixed(1)}%)보다 낮습니다.`,
        priority: "HIGH",
        relatedKeywords: [],
      });
      suggestedActions.push(
        "댓글 유도, 질문형 콘텐츠, CTA 최적화를 통해 참여율을 높이세요.",
      );
    }

    // 3. Content frequency gap
    const avgCompetitorFreq = this.average(
      competitorMetrics.map((c) => c.postingFrequency),
    );
    if (ownMetrics.postingFrequency < avgCompetitorFreq * 0.6) {
      opportunityAreas.push({
        area: "콘텐츠 빈도",
        description: `주간 포스팅 빈도(${ownMetrics.postingFrequency.toFixed(1)})가 경쟁사 평균(${avgCompetitorFreq.toFixed(1)})보다 낮습니다.`,
        priority: "MEDIUM",
        relatedKeywords: [],
      });
      suggestedActions.push("콘텐츠 발행 빈도를 경쟁사 수준으로 높이세요.");
    }

    // 4. Missing content formats
    const allCompetitorFormats = new Set<string>();
    for (const comp of competitorMetrics) {
      for (const format of comp.contentTypes) {
        allCompetitorFormats.add(format);
      }
    }
    const ownFormats = new Set(ownMetrics.contentTypes);
    const missingFormats = Array.from(allCompetitorFormats).filter(
      (f) => !ownFormats.has(f),
    );

    if (missingFormats.length > 0) {
      opportunityAreas.push({
        area: "콘텐츠 포맷 다양화",
        description: `경쟁사가 사용하지만 우리가 사용하지 않는 포맷: ${missingFormats.join(", ")}`,
        priority: "MEDIUM",
        relatedKeywords: [],
      });
      suggestedActions.push(
        `${missingFormats.join(", ")} 포맷의 콘텐츠를 시도해 보세요.`,
      );
    }

    // 5. Topic gaps
    const allCompetitorTopics = new Set<string>();
    for (const comp of competitorMetrics) {
      for (const topic of comp.topTopics) {
        allCompetitorTopics.add(topic);
      }
    }
    const ownTopics = new Set(ownMetrics.topTopics);
    const missingTopics = Array.from(allCompetitorTopics).filter(
      (t) => !ownTopics.has(t),
    );

    if (missingTopics.length > 0) {
      opportunityAreas.push({
        area: "주제 영역 확장",
        description: `경쟁사가 다루지만 우리가 다루지 않는 주제: ${missingTopics.slice(0, 5).join(", ")}`,
        priority: "MEDIUM",
        relatedKeywords: missingTopics.slice(0, 10),
      });
    }

    // 6. Identify competitor strengths
    for (const comp of competitorMetrics) {
      if (comp.avgViewCount > ownMetrics.avgViewCount * 1.5) {
        competitorStrengths.push({
          competitorName: comp.channelName,
          strength: `평균 조회수 ${this.formatNumber(comp.avgViewCount)}`,
          ourGap: `우리 평균 조회수 ${this.formatNumber(ownMetrics.avgViewCount)}`,
          impactLevel:
            comp.avgViewCount > ownMetrics.avgViewCount * 3 ? "HIGH" : "MEDIUM",
        });
      }

      if (comp.avgEngagementRate > ownMetrics.avgEngagementRate * 1.5) {
        competitorStrengths.push({
          competitorName: comp.channelName,
          strength: `참여율 ${(comp.avgEngagementRate * 100).toFixed(1)}%`,
          ourGap: `우리 참여율 ${(ownMetrics.avgEngagementRate * 100).toFixed(1)}%`,
          impactLevel: "MEDIUM",
        });
      }
    }

    // Build gap summary
    const gapSummary = this.buildGapSummary(
      ownMetrics,
      competitorMetrics,
      opportunityAreas,
    );

    return {
      projectId,
      gapSummary,
      opportunityAreas,
      missingContentFormats: missingFormats,
      competitorStrengths,
      suggestedActions,
      engineVersion: ENGINE_VERSION,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  }

  private buildGapSummary(
    own: ChannelMetrics,
    competitors: ChannelMetrics[],
    opportunities: OpportunityArea[],
  ): string {
    const highPriority = opportunities.filter((o) => o.priority === "HIGH");
    const medPriority = opportunities.filter((o) => o.priority === "MEDIUM");

    const parts: string[] = [];
    parts.push(`${competitors.length}개 경쟁사와 비교 분석 완료.`);

    if (highPriority.length > 0) {
      parts.push(
        `높은 우선순위 개선 영역 ${highPriority.length}건: ${highPriority.map((o) => o.area).join(", ")}.`,
      );
    }
    if (medPriority.length > 0) {
      parts.push(`중간 우선순위 개선 영역 ${medPriority.length}건.`);
    }
    if (opportunities.length === 0) {
      parts.push("현재 주요 경쟁 지표에서 양호한 수준입니다.");
    }

    return parts.join(" ");
  }
}
