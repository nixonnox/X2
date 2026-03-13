import type { Repositories } from "../../repositories";
import { type ServiceResult, type Logger, ok, err } from "../types";
import type { GeneratedInsight } from "./insight-generation.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InsightSummary = {
  projectId: string;
  period: string;
  headline: string;
  keyFindings: string[];
  opportunities: string[];
  risks: string[];
  recommendedActions: string[];
  dataSourceCount: number;
  insightCount: number;
  generatedAt: Date;
};

export type SummaryContext = "DASHBOARD" | "EMAIL" | "REPORT_INTRO" | "SLACK";

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class InsightSummaryService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Generate a context-appropriate summary from already-generated insights.
   */
  generateSummary(
    insights: GeneratedInsight[],
    projectId: string,
    context: SummaryContext,
  ): ServiceResult<InsightSummary> {
    try {
      if (insights.length === 0) {
        return ok({
          projectId,
          period: this.formatCurrentPeriod(),
          headline: "분석 데이터가 부족하여 인사이트를 생성할 수 없습니다.",
          keyFindings: [],
          opportunities: [],
          risks: [],
          recommendedActions: ["데이터 수집 파이프라인의 상태를 확인하세요."],
          dataSourceCount: 0,
          insightCount: 0,
          generatedAt: new Date(),
        });
      }

      // Categorize insights
      const keyFindings = insights.filter((i) => i.category === "KEY_FINDING");
      const opportunities = insights.filter(
        (i) => i.category === "OPPORTUNITY",
      );
      const risks = insights.filter(
        (i) =>
          i.category === "RISK" ||
          (i.category === "TREND_CHANGE" && i.severity !== "LOW"),
      );
      const performances = insights.filter((i) => i.category === "PERFORMANCE");
      const trendChanges = insights.filter(
        (i) => i.category === "TREND_CHANGE",
      );

      // Count unique data sources
      const uniqueSources = new Set<string>();
      for (const insight of insights) {
        for (const module of insight.sourceModules) {
          uniqueSources.add(module);
        }
      }

      // Generate headline from highest-severity insight
      const headline = this.generateHeadline(insights, context);

      // Generate context-appropriate content
      const summary = this.buildSummaryForContext(
        context,
        {
          keyFindings,
          opportunities,
          risks,
          performances,
          trendChanges,
        },
        insights,
      );

      const result: InsightSummary = {
        projectId,
        period: this.formatCurrentPeriod(),
        headline,
        keyFindings: summary.keyFindings,
        opportunities: summary.opportunities,
        risks: summary.risks,
        recommendedActions: summary.recommendedActions,
        dataSourceCount: uniqueSources.size,
        insightCount: insights.length,
        generatedAt: new Date(),
      };

      this.logger.info("Insight summary generated", {
        projectId,
        context,
        insightCount: insights.length,
        dataSourceCount: uniqueSources.size,
      });

      return ok(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to generate insight summary", {
        projectId,
        context,
        error: message,
      });
      return err(message, "INSIGHT_SUMMARY_FAILED");
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private generateHeadline(
    insights: GeneratedInsight[],
    context: SummaryContext,
  ): string {
    // Find highest-severity insight for the headline
    const top = insights[0]; // Already sorted by severity
    if (!top) return "분석 결과 요약";

    switch (context) {
      case "SLACK":
        // Ultra-brief
        return top.title;

      case "DASHBOARD":
        return `${top.title} 외 ${insights.length - 1}건의 인사이트`;

      case "EMAIL":
      case "REPORT_INTRO":
        // More descriptive
        const criticalCount = insights.filter(
          (i) => i.severity === "CRITICAL",
        ).length;
        const highCount = insights.filter((i) => i.severity === "HIGH").length;
        if (criticalCount > 0) {
          return `긴급 알림: ${criticalCount}건의 치명적 인사이트 발견 - ${top.title}`;
        }
        if (highCount > 0) {
          return `주요 발견: ${top.title} 외 ${highCount}건의 중요 인사이트`;
        }
        return `분석 완료: ${insights.length}건의 인사이트 - ${top.title}`;

      default:
        return top.title;
    }
  }

  private buildSummaryForContext(
    context: SummaryContext,
    categorized: {
      keyFindings: GeneratedInsight[];
      opportunities: GeneratedInsight[];
      risks: GeneratedInsight[];
      performances: GeneratedInsight[];
      trendChanges: GeneratedInsight[];
    },
    allInsights: GeneratedInsight[],
  ): {
    keyFindings: string[];
    opportunities: string[];
    risks: string[];
    recommendedActions: string[];
  } {
    switch (context) {
      case "DASHBOARD":
        return this.buildDashboardSummary(categorized);

      case "EMAIL":
        return this.buildEmailSummary(categorized, allInsights);

      case "REPORT_INTRO":
        return this.buildReportIntroSummary(categorized, allInsights);

      case "SLACK":
        return this.buildSlackSummary(categorized);

      default:
        return this.buildDashboardSummary(categorized);
    }
  }

  private buildDashboardSummary(categorized: {
    keyFindings: GeneratedInsight[];
    opportunities: GeneratedInsight[];
    risks: GeneratedInsight[];
    performances: GeneratedInsight[];
    trendChanges: GeneratedInsight[];
  }) {
    // Concise: 3-5 key points
    return {
      keyFindings: categorized.keyFindings.slice(0, 3).map((i) => i.title),
      opportunities: categorized.opportunities.slice(0, 3).map((i) => i.title),
      risks: categorized.risks.slice(0, 3).map((i) => i.title),
      recommendedActions: this.deriveActions(categorized, 3),
    };
  }

  private buildEmailSummary(
    categorized: {
      keyFindings: GeneratedInsight[];
      opportunities: GeneratedInsight[];
      risks: GeneratedInsight[];
      performances: GeneratedInsight[];
      trendChanges: GeneratedInsight[];
    },
    allInsights: GeneratedInsight[],
  ) {
    // More detailed, includes recommendations
    return {
      keyFindings: categorized.keyFindings
        .slice(0, 5)
        .map((i) => `${i.title}: ${this.truncate(i.narrative, 100)}`),
      opportunities: categorized.opportunities
        .slice(0, 5)
        .map((i) => `${i.title}: ${this.truncate(i.narrative, 100)}`),
      risks: categorized.risks
        .slice(0, 5)
        .map(
          (i) =>
            `[${i.severity}] ${i.title}: ${this.truncate(i.narrative, 80)}`,
        ),
      recommendedActions: this.deriveActions(categorized, 5),
    };
  }

  private buildReportIntroSummary(
    categorized: {
      keyFindings: GeneratedInsight[];
      opportunities: GeneratedInsight[];
      risks: GeneratedInsight[];
      performances: GeneratedInsight[];
      trendChanges: GeneratedInsight[];
    },
    allInsights: GeneratedInsight[],
  ) {
    // Narrative style for report opening
    const narrativeFindings = categorized.keyFindings
      .slice(0, 5)
      .map((i) => i.narrative);

    const narrativeOpportunities = categorized.opportunities
      .slice(0, 3)
      .map((i) => i.narrative);

    const narrativeRisks = categorized.risks
      .slice(0, 3)
      .map((i) => i.narrative);

    return {
      keyFindings: narrativeFindings,
      opportunities: narrativeOpportunities,
      risks: narrativeRisks,
      recommendedActions: this.deriveActions(categorized, 5),
    };
  }

  private buildSlackSummary(categorized: {
    keyFindings: GeneratedInsight[];
    opportunities: GeneratedInsight[];
    risks: GeneratedInsight[];
    performances: GeneratedInsight[];
    trendChanges: GeneratedInsight[];
  }) {
    // Ultra-brief: 2-3 lines, no emojis
    const lines: string[] = [];

    if (categorized.risks.length > 0) {
      lines.push(
        `위험 ${categorized.risks.length}건: ${categorized.risks[0]!.title}`,
      );
    }
    if (categorized.keyFindings.length > 0) {
      lines.push(
        `주요 발견 ${categorized.keyFindings.length}건: ${categorized.keyFindings[0]!.title}`,
      );
    }
    if (categorized.opportunities.length > 0) {
      lines.push(
        `기회 ${categorized.opportunities.length}건: ${categorized.opportunities[0]!.title}`,
      );
    }

    return {
      keyFindings: lines.slice(0, 2),
      opportunities:
        categorized.opportunities.length > 0
          ? [categorized.opportunities[0]!.title]
          : [],
      risks: categorized.risks.length > 0 ? [categorized.risks[0]!.title] : [],
      recommendedActions: this.deriveActions(categorized, 2),
    };
  }

  private deriveActions(
    categorized: {
      keyFindings: GeneratedInsight[];
      opportunities: GeneratedInsight[];
      risks: GeneratedInsight[];
      performances: GeneratedInsight[];
      trendChanges: GeneratedInsight[];
    },
    limit: number,
  ): string[] {
    const actions: string[] = [];

    // Critical risks get priority actions
    for (const risk of categorized.risks) {
      if (risk.severity === "CRITICAL") {
        actions.push(`[긴급] ${risk.title}에 대한 즉각적인 대응이 필요합니다.`);
      }
    }

    // High-severity risks
    for (const risk of categorized.risks) {
      if (risk.severity === "HIGH" && actions.length < limit) {
        actions.push(`${risk.title} 관련 모니터링을 강화하세요.`);
      }
    }

    // Opportunity-based actions
    for (const opp of categorized.opportunities) {
      if (actions.length >= limit) break;
      if (opp.sourceModules.includes("FAQ_ENGINE")) {
        actions.push(`미답변 FAQ를 기반으로 콘텐츠를 제작하세요.`);
      } else if (opp.sourceModules.includes("SEARCH_INTENT")) {
        actions.push(`블루오션 키워드를 타겟으로 한 콘텐츠 전략을 수립하세요.`);
      } else if (opp.sourceModules.includes("GEO_AEO")) {
        actions.push(`AI 검색 최적화(AEO)를 통해 노출을 개선하세요.`);
      }
    }

    // Performance improvements
    for (const perf of categorized.performances) {
      if (actions.length >= limit) break;
      if (perf.severity === "HIGH" || perf.severity === "MEDIUM") {
        actions.push(`캠페인 참여율 개선을 위한 콘텐츠 전략을 검토하세요.`);
      }
    }

    // Trend-based actions
    for (const trend of categorized.trendChanges) {
      if (actions.length >= limit) break;
      actions.push(`트렌드 변화에 맞춘 키워드 전략을 업데이트하세요.`);
    }

    // Deduplicate and limit
    return [...new Set(actions)].slice(0, limit);
  }

  private formatCurrentPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    // Current month range
    const firstDay = `${year}-${month}-01`;
    const lastDay = `${year}-${month}-${day}`;
    return `${firstDay} ~ ${lastDay}`;
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + "...";
  }
}
