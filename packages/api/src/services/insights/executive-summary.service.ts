import type { Repositories } from "../../repositories";
import {
  type ServiceResult,
  type TraceContext,
  type Logger,
  ok,
  err,
} from "../types";
import type { GeneratedInsight } from "./insight-generation.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type KPIHighlight = {
  metric: string;
  value: string;
  change: string | null;
  status: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
};

export type ExecutiveSummary = {
  projectId: string;
  period: string;
  strategicOverview: string;
  kpiHighlights: KPIHighlight[];
  criticalAlerts: string[];
  strategicRecommendations: string[];
  competitivePosition: string | null;
  growthIndicators: string[];
  generatedAt: Date;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ExecutiveSummaryService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Generate an executive-level summary for C-level audience.
   * Synthesizes channel stats, content metrics, campaign data, and insights
   * into a strategic overview with KPIs and recommendations.
   */
  async generateExecutiveSummary(
    projectId: string,
    insights: GeneratedInsight[],
    trace: TraceContext,
  ): Promise<ServiceResult<ExecutiveSummary>> {
    try {
      this.logger.info("Generating executive summary", {
        projectId,
        insightCount: insights.length,
        requestId: trace.requestId,
      });

      // 1. Fetch channel and content data
      const channels = await this.repositories.channel.findByProject(projectId);

      let totalSubscribers = 0;
      let totalViews = 0;
      let totalContents = 0;
      let subscriberChange: number | null = null;

      for (const channel of channels.data) {
        const snapshots = await this.repositories.channel.findSnapshots(
          channel.id,
        );
        if (snapshots.length > 0) {
          const latest = snapshots[snapshots.length - 1]!;
          totalSubscribers += Number((latest as any).subscriberCount ?? 0);
          totalViews += Number((latest as any).viewCount ?? 0);

          // Calculate subscriber change from previous snapshot
          if (snapshots.length >= 2) {
            const previous = snapshots[snapshots.length - 2]!;
            const currentSubs = Number((latest as any).subscriberCount ?? 0);
            const previousSubs = Number((previous as any).subscriberCount ?? 0);
            if (previousSubs > 0) {
              const change =
                ((currentSubs - previousSubs) / previousSubs) * 100;
              subscriberChange = (subscriberChange ?? 0) + change;
            }
          }
        }

        const contents = await this.repositories.content.findByChannel(
          channel.id,
        );
        totalContents += contents.data.length;
      }

      // 2. Fetch campaign data
      const campaignResult =
        await this.repositories.campaign.findByProject(projectId);
      const campaigns = campaignResult.data;
      const activeCampaigns = campaigns.filter(
        (c: any) => c.status === "ACTIVE" || c.status === "IN_PROGRESS",
      );
      let totalCampaignBudget = 0;
      for (const campaign of activeCampaigns) {
        totalCampaignBudget += Number((campaign as any).totalBudget ?? 0);
      }

      // 3. Fetch sentiment data
      const sentimentCounts =
        await this.repositories.comment.countBySentiment(projectId);
      const positive =
        sentimentCounts.find((s: any) => s.sentiment === "POSITIVE")?.count ??
        0;
      const negative =
        sentimentCounts.find((s: any) => s.sentiment === "NEGATIVE")?.count ??
        0;
      const totalComments = sentimentCounts.reduce(
        (sum: number, s: any) => sum + s.count,
        0,
      );
      const positiveRate =
        totalComments > 0 ? Math.round((positive / totalComments) * 100) : 0;
      const negativeRate =
        totalComments > 0 ? Math.round((negative / totalComments) * 100) : 0;

      // 4. Build KPI highlights
      const kpiHighlights: KPIHighlight[] = [];

      kpiHighlights.push({
        metric: "총 구독자/팔로워",
        value: this.formatNumber(totalSubscribers),
        change:
          subscriberChange !== null
            ? `${subscriberChange >= 0 ? "+" : ""}${Math.round(subscriberChange * 100) / 100}%`
            : null,
        status:
          subscriberChange !== null
            ? subscriberChange > 0
              ? "POSITIVE"
              : subscriberChange < 0
                ? "NEGATIVE"
                : "NEUTRAL"
            : "NEUTRAL",
      });

      kpiHighlights.push({
        metric: "총 조회수",
        value: this.formatNumber(totalViews),
        change: null,
        status: totalViews > 0 ? "POSITIVE" : "NEUTRAL",
      });

      kpiHighlights.push({
        metric: "콘텐츠 수",
        value: `${totalContents}건`,
        change: null,
        status: "NEUTRAL",
      });

      kpiHighlights.push({
        metric: "긍정 반응률",
        value: `${positiveRate}%`,
        change: null,
        status:
          positiveRate > 60
            ? "POSITIVE"
            : positiveRate < 40
              ? "NEGATIVE"
              : "NEUTRAL",
      });

      kpiHighlights.push({
        metric: "부정 반응률",
        value: `${negativeRate}%`,
        change: null,
        status:
          negativeRate > 30
            ? "NEGATIVE"
            : negativeRate < 15
              ? "POSITIVE"
              : "NEUTRAL",
      });

      if (activeCampaigns.length > 0) {
        kpiHighlights.push({
          metric: "활성 캠페인",
          value: `${activeCampaigns.length}건`,
          change: null,
          status: "NEUTRAL",
        });

        kpiHighlights.push({
          metric: "캠페인 총 예산",
          value: this.formatCurrency(totalCampaignBudget),
          change: null,
          status: "NEUTRAL",
        });
      }

      // 5. Extract critical alerts from insights
      const criticalAlerts = insights
        .filter((i: any) => i.severity === "CRITICAL")
        .map(
          (i: any) => `[치명] ${i.title}: ${this.truncate(i.narrative, 80)}`,
        );

      const highAlerts = insights
        .filter((i: any) => i.severity === "HIGH" && i.category === "RISK")
        .slice(0, 3)
        .map((i: any) => `[높음] ${i.title}`);

      const allAlerts = [...criticalAlerts, ...highAlerts];

      // 6. Strategic recommendations from OPPORTUNITY insights
      const strategicRecommendations =
        this.deriveStrategicRecommendations(insights);

      // 7. Growth indicators
      const growthIndicators = this.extractGrowthIndicators(insights, {
        subscriberChange,
        positiveRate,
        totalContents,
        channels: channels.data.length,
      });

      // 8. Competitive position (from intent gap + trend data)
      const competitivePosition = this.assessCompetitivePosition(insights);

      // 9. Strategic overview narrative
      const strategicOverview = this.buildStrategicOverview({
        totalSubscribers,
        totalViews,
        totalContents,
        channelCount: channels.data.length,
        positiveRate,
        negativeRate,
        activeCampaignCount: activeCampaigns.length,
        criticalInsightCount: criticalAlerts.length,
        opportunityCount: insights.filter(
          (i: any) => i.category === "OPPORTUNITY",
        ).length,
        subscriberChange,
      });

      // 10. Format period
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01 ~ ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      const result: ExecutiveSummary = {
        projectId,
        period,
        strategicOverview,
        kpiHighlights,
        criticalAlerts: allAlerts,
        strategicRecommendations,
        competitivePosition,
        growthIndicators,
        generatedAt: new Date(),
      };

      this.logger.info("Executive summary generated", {
        projectId,
        kpiCount: kpiHighlights.length,
        alertCount: allAlerts.length,
        recommendationCount: strategicRecommendations.length,
        requestId: trace.requestId,
      });

      return ok(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to generate executive summary", {
        projectId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "EXECUTIVE_SUMMARY_FAILED");
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildStrategicOverview(data: {
    totalSubscribers: number;
    totalViews: number;
    totalContents: number;
    channelCount: number;
    positiveRate: number;
    negativeRate: number;
    activeCampaignCount: number;
    criticalInsightCount: number;
    opportunityCount: number;
    subscriberChange: number | null;
  }): string {
    const parts: string[] = [];

    // Audience overview
    parts.push(
      `${data.channelCount}개 채널에서 총 ${this.formatNumber(data.totalSubscribers)}명의 구독자와 ` +
        `${this.formatNumber(data.totalViews)}회의 조회수를 기록하고 있으며, ` +
        `${data.totalContents}건의 콘텐츠가 운영 중입니다.`,
    );

    // Sentiment health
    if (data.negativeRate > 30) {
      parts.push(
        `고객 반응 분석에서 부정 비율이 ${data.negativeRate}%로 주의가 필요한 수준이며, ` +
          `즉각적인 커뮤니케이션 전략 조정이 권장됩니다.`,
      );
    } else if (data.positiveRate > 60) {
      parts.push(
        `고객 반응은 긍정 비율 ${data.positiveRate}%로 양호한 수준을 유지하고 있습니다.`,
      );
    }

    // Opportunity / risk balance
    if (data.criticalInsightCount > 0) {
      parts.push(
        `${data.criticalInsightCount}건의 치명적 위험 요인이 감지되어 경영진의 관심이 필요합니다.`,
      );
    } else if (data.opportunityCount > 0) {
      parts.push(
        `${data.opportunityCount}건의 성장 기회가 식별되었으며, 전략적 우선순위에 따른 실행이 권장됩니다.`,
      );
    }

    return parts.join(" ");
  }

  private deriveStrategicRecommendations(
    insights: GeneratedInsight[],
  ): string[] {
    const recommendations: string[] = [];

    // From CRITICAL/HIGH risk insights
    const criticalRisks = insights.filter(
      (i: any) =>
        (i.severity === "CRITICAL" || i.severity === "HIGH") &&
        i.category === "RISK",
    );
    if (criticalRisks.length > 0) {
      recommendations.push(
        `위기 대응: ${criticalRisks.length}건의 고위험 신호에 대한 태스크포스 구성 및 즉각 대응을 권장합니다.`,
      );
    }

    // From OPPORTUNITY insights
    const opportunities = insights.filter(
      (i: any) => i.category === "OPPORTUNITY",
    );
    const intentOpps = opportunities.filter((i: any) =>
      i.sourceModules.includes("SEARCH_INTENT"),
    );
    const faqOpps = opportunities.filter((i: any) =>
      i.sourceModules.includes("FAQ_ENGINE"),
    );
    const aeoOpps = opportunities.filter((i: any) =>
      i.sourceModules.includes("GEO_AEO"),
    );

    if (intentOpps.length > 0) {
      recommendations.push(
        `콘텐츠 확장: 블루오션 키워드 ${intentOpps.length}건을 활용한 신규 콘텐츠 전략을 수립하여 검색 점유율을 확대하세요.`,
      );
    }

    if (faqOpps.length > 0) {
      recommendations.push(
        `고객 소통 강화: 미답변 FAQ를 기반으로 자주 묻는 질문 콘텐츠를 제작하여 고객 만족도를 개선하세요.`,
      );
    }

    if (aeoOpps.length > 0) {
      recommendations.push(
        `AI 검색 최적화: AI 검색 엔진 노출이 낮은 키워드에 대해 구조화된 콘텐츠로 AEO 전략을 강화하세요.`,
      );
    }

    // From PERFORMANCE insights
    const performanceInsights = insights.filter(
      (i: any) =>
        i.category === "PERFORMANCE" &&
        (i.severity === "HIGH" || i.severity === "MEDIUM"),
    );
    if (performanceInsights.length > 0) {
      recommendations.push(
        `캠페인 최적화: 참여율이 낮은 캠페인의 크리에이터 구성과 콘텐츠 전략을 재검토하세요.`,
      );
    }

    // From TREND_CHANGE insights
    const risingTrends = insights.filter(
      (i: any) => i.category === "TREND_CHANGE",
    );
    if (risingTrends.length > 0) {
      recommendations.push(
        `트렌드 대응: 상승 트렌드 키워드를 중심으로 시의성 있는 콘텐츠를 제작하여 선점 효과를 확보하세요.`,
      );
    }

    return recommendations.slice(0, 5);
  }

  private extractGrowthIndicators(
    insights: GeneratedInsight[],
    metrics: {
      subscriberChange: number | null;
      positiveRate: number;
      totalContents: number;
      channels: number;
    },
  ): string[] {
    const indicators: string[] = [];

    if (metrics.subscriberChange !== null && metrics.subscriberChange > 0) {
      indicators.push(
        `구독자 수 ${Math.round(metrics.subscriberChange * 100) / 100}% 증가 추세`,
      );
    }

    if (metrics.positiveRate > 70) {
      indicators.push(
        `긍정 반응률 ${metrics.positiveRate}%로 브랜드 호감도 양호`,
      );
    }

    const risingTrends = insights.filter(
      (i: any) =>
        i.category === "TREND_CHANGE" &&
        i.sourceModules.includes("TREND_ENGINE"),
    );
    if (risingTrends.length > 0) {
      indicators.push(`${risingTrends.length}개의 상승 트렌드 키워드 확인`);
    }

    const intentOpps = insights.filter(
      (i: any) =>
        i.category === "OPPORTUNITY" &&
        i.sourceModules.includes("SEARCH_INTENT"),
    );
    if (intentOpps.length > 0) {
      indicators.push(`블루오션 키워드 기회 ${intentOpps.length}건 식별`);
    }

    const highAeo = insights.filter(
      (i: any) =>
        i.category === "KEY_FINDING" && i.sourceModules.includes("GEO_AEO"),
    );
    if (highAeo.length > 0) {
      indicators.push(`AI 검색 상위 노출 키워드 보유`);
    }

    if (metrics.channels > 1) {
      indicators.push(`${metrics.channels}개 채널 다각화 운영 중`);
    }

    return indicators;
  }

  private assessCompetitivePosition(
    insights: GeneratedInsight[],
  ): string | null {
    const intentGaps = insights.filter(
      (i: any) =>
        i.category === "OPPORTUNITY" &&
        i.sourceModules.includes("SEARCH_INTENT"),
    );
    const aeoStrength = insights.filter(
      (i: any) =>
        i.category === "KEY_FINDING" && i.sourceModules.includes("GEO_AEO"),
    );
    const risks = insights.filter((i: any) => i.category === "RISK");
    const trendChanges = insights.filter(
      (i: any) => i.category === "TREND_CHANGE",
    );

    if (
      intentGaps.length === 0 &&
      aeoStrength.length === 0 &&
      trendChanges.length === 0
    ) {
      return null;
    }

    const parts: string[] = [];

    if (intentGaps.length > 0) {
      parts.push(
        `경쟁이 낮은 키워드 ${intentGaps.length}건이 식별되어 선점 기회가 존재합니다`,
      );
    }

    if (aeoStrength.length > 0) {
      parts.push(`AI 검색 엔진에서 양호한 노출을 확보하고 있습니다`);
    } else {
      const aeoWeakness = insights.filter(
        (i: any) =>
          i.category === "OPPORTUNITY" && i.sourceModules.includes("GEO_AEO"),
      );
      if (aeoWeakness.length > 0) {
        parts.push(`AI 검색 노출에서 개선이 필요한 영역이 있습니다`);
      }
    }

    if (risks.length > 3) {
      parts.push(`다수의 위험 요인으로 방어적 전략이 필요합니다`);
    }

    return parts.length > 0 ? parts.join(". ") + "." : null;
  }

  private formatNumber(num: number): string {
    if (num >= 1_000_000) {
      return `${Math.round(num / 10_000) / 100}M`;
    }
    if (num >= 10_000) {
      return `${Math.round(num / 1_000) / 10}만`;
    }
    return num.toLocaleString();
  }

  private formatCurrency(amount: number): string {
    if (amount >= 1_000_000) {
      return `${Math.round(amount / 10_000)}만원`;
    }
    return `${amount.toLocaleString()}원`;
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + "...";
  }
}
