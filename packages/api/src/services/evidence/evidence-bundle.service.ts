import type { Repositories } from "../../repositories";
import {
  type ServiceResult,
  type TraceContext,
  type Logger,
  ok,
  err,
} from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BundleType =
  | "SENTIMENT_OVERVIEW"
  | "FAQ_SUMMARY"
  | "RISK_SUMMARY"
  | "INTENT_GAP"
  | "TREND_OVERVIEW"
  | "COMPETITIVE_POSITION"
  | "CAMPAIGN_PERFORMANCE"
  | "FULL_PROJECT";

export type EvidenceBundleInput = {
  projectId: string;
  bundleType: BundleType;
  dateRange?: { from: Date; to: Date };
  maxItemsPerCategory?: number; // default 5
};

export type EvidenceBundleItem = {
  category: string; // e.g., "sentiment_chart", "top_negative_comments", "faq_list"
  label: string;
  dataSourceType: string;
  entityIds: string[];
  displayType:
    | "TABLE"
    | "LINE_CHART"
    | "BAR_CHART"
    | "PIE_CHART"
    | "QUOTE_LIST"
    | "KPI_CARD"
    | "HEATMAP";
  summary: string; // Human-readable description of what this evidence shows
  data?: unknown; // Pre-resolved summary data for quick access
};

export type EvidenceBundle = {
  id: string;
  bundleType: BundleType;
  projectId: string;
  title: string;
  description: string;
  items: EvidenceBundleItem[];
  metadata: {
    totalDataPoints: number;
    dateRange: { from: Date; to: Date } | null;
    generatedAt: Date;
    dataCompleteness: Record<string, boolean>;
  };
};

// ---------------------------------------------------------------------------
// Bundle title / description mapping
// ---------------------------------------------------------------------------

const BUNDLE_META: Record<BundleType, { title: string; description: string }> =
  {
    SENTIMENT_OVERVIEW: {
      title: "감성 분석 개요",
      description:
        "댓글 감성 분포, 부정 주요 주제, 토픽 분석 결과를 포함합니다.",
    },
    FAQ_SUMMARY: {
      title: "FAQ 요약",
      description: "미답변 FAQ, 질문 유형 분포, 주요 질문 목록을 포함합니다.",
    },
    RISK_SUMMARY: {
      title: "리스크 요약",
      description: "활성 리스크 신호, 심각도별 분류, 샘플 텍스트를 포함합니다.",
    },
    INTENT_GAP: {
      title: "검색 의도 갭 분석",
      description: "블루오션 키워드, 갭 분포, 기회 목록을 포함합니다.",
    },
    TREND_OVERVIEW: {
      title: "트렌드 개요",
      description: "상승/하락 키워드, 검색량 변화 추이를 포함합니다.",
    },
    COMPETITIVE_POSITION: {
      title: "경쟁 포지션 분석",
      description: "채널 통계 비교, 상대적 성과를 포함합니다.",
    },
    CAMPAIGN_PERFORMANCE: {
      title: "캠페인 성과",
      description: "캠페인 지표, ROI 분석 결과를 포함합니다.",
    },
    FULL_PROJECT: {
      title: "프로젝트 전체 분석",
      description: "모든 분석 모듈의 핵심 데이터를 통합한 종합 번들입니다.",
    },
  };

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class EvidenceBundleService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Create a structured evidence bundle based on bundleType.
   */
  async createBundle(
    input: EvidenceBundleInput,
    trace: TraceContext,
  ): Promise<ServiceResult<EvidenceBundle>> {
    try {
      const { projectId, bundleType, dateRange } = input;
      const maxItems = input.maxItemsPerCategory ?? 5;

      const items: EvidenceBundleItem[] = [];
      const dataCompleteness: Record<string, boolean> = {};

      // Collect items based on bundleType
      if (
        bundleType === "SENTIMENT_OVERVIEW" ||
        bundleType === "FULL_PROJECT"
      ) {
        const sentimentItems = await this.buildSentimentBundle(
          projectId,
          maxItems,
        );
        items.push(...sentimentItems);
        dataCompleteness["sentiment"] = sentimentItems.length > 0;
      }

      if (bundleType === "FAQ_SUMMARY" || bundleType === "FULL_PROJECT") {
        const faqItems = await this.buildFAQBundle(projectId, maxItems);
        items.push(...faqItems);
        dataCompleteness["faq"] = faqItems.length > 0;
      }

      if (bundleType === "RISK_SUMMARY" || bundleType === "FULL_PROJECT") {
        const riskItems = await this.buildRiskBundle(projectId, maxItems);
        items.push(...riskItems);
        dataCompleteness["risk"] = riskItems.length > 0;
      }

      if (bundleType === "INTENT_GAP" || bundleType === "FULL_PROJECT") {
        const intentItems = await this.buildIntentBundle(projectId, maxItems);
        items.push(...intentItems);
        dataCompleteness["intent"] = intentItems.length > 0;
      }

      if (bundleType === "TREND_OVERVIEW" || bundleType === "FULL_PROJECT") {
        const trendItems = await this.buildTrendBundle(
          projectId,
          dateRange,
          maxItems,
        );
        items.push(...trendItems);
        dataCompleteness["trend"] = trendItems.length > 0;
      }

      if (
        bundleType === "COMPETITIVE_POSITION" ||
        bundleType === "FULL_PROJECT"
      ) {
        const competitiveItems = await this.buildCompetitiveBundle(
          projectId,
          maxItems,
        );
        items.push(...competitiveItems);
        dataCompleteness["competitive"] = competitiveItems.length > 0;
      }

      if (
        bundleType === "CAMPAIGN_PERFORMANCE" ||
        bundleType === "FULL_PROJECT"
      ) {
        const campaignItems = await this.buildCampaignBundle(
          projectId,
          maxItems,
        );
        items.push(...campaignItems);
        dataCompleteness["campaign"] = campaignItems.length > 0;
      }

      const meta = BUNDLE_META[bundleType];
      const totalDataPoints = items.reduce(
        (sum, item) => sum + item.entityIds.length,
        0,
      );

      const bundle: EvidenceBundle = {
        id: crypto.randomUUID(),
        bundleType,
        projectId,
        title: meta.title,
        description: meta.description,
        items,
        metadata: {
          totalDataPoints,
          dateRange: dateRange ?? null,
          generatedAt: new Date(),
          dataCompleteness,
        },
      };

      this.logger.info("Evidence bundle created", {
        bundleId: bundle.id,
        bundleType,
        projectId,
        itemCount: items.length,
        totalDataPoints,
        requestId: trace.requestId,
      });

      return ok(bundle);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to create evidence bundle", {
        projectId: input.projectId,
        bundleType: input.bundleType,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "BUNDLE_CREATION_FAILED");
    }
  }

  // ---------------------------------------------------------------------------
  // Private builders
  // ---------------------------------------------------------------------------

  private async buildSentimentBundle(
    projectId: string,
    maxItems: number,
  ): Promise<EvidenceBundleItem[]> {
    const items: EvidenceBundleItem[] = [];

    // 1. Sentiment distribution chart
    const sentimentDistribution =
      await this.repositories.comment.countBySentiment(projectId);
    const totalComments = sentimentDistribution.reduce(
      (sum: number, s: any) => sum + s.count,
      0,
    );

    if (totalComments > 0) {
      const negativeCount =
        sentimentDistribution.find((s: any) => s.sentiment === "NEGATIVE")
          ?.count ?? 0;
      const negativePercent = Math.round((negativeCount / totalComments) * 100);

      items.push({
        category: "sentiment_distribution",
        label: "감성 분포",
        dataSourceType: "COMMENT_ANALYSIS",
        entityIds: [],
        displayType: "PIE_CHART",
        summary: `전체 댓글 ${totalComments}건 중 부정 비율은 ${negativePercent}%입니다.`,
        data: sentimentDistribution,
      });
    }

    // 2. Top negative comments
    const analysesResult =
      await this.repositories.comment.findAnalysisByFilters(projectId);
    const negativeAnalyses = analysesResult.data
      .filter((a: any) => a.sentiment === "NEGATIVE")
      .slice(0, maxItems);

    if (negativeAnalyses.length > 0) {
      // Extract topic breakdown from negative comments
      const topicCounts: Record<string, number> = {};
      for (const a of negativeAnalyses) {
        if (a.topics && Array.isArray(a.topics)) {
          for (const topic of a.topics as string[]) {
            topicCounts[topic] = (topicCounts[topic] ?? 0) + 1;
          }
        }
      }

      const topTopics = Object.entries(topicCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([topic]: any) => topic);

      const topicSummary =
        topTopics.length > 0
          ? `주요 불만 주제는 ${topTopics.map((t: any) => `'${t}'`).join(", ")}입니다.`
          : "";

      items.push({
        category: "top_negative_comments",
        label: "주요 부정 댓글",
        dataSourceType: "COMMENT_ANALYSIS",
        entityIds: negativeAnalyses.map((a: any) => a.id ?? "").filter(Boolean),
        displayType: "QUOTE_LIST",
        summary: `부정 댓글 상위 ${negativeAnalyses.length}건을 추출했습니다. ${topicSummary}`,
        data: negativeAnalyses,
      });
    }

    // 3. Topic breakdown
    const allTopicCounts: Record<string, number> = {};
    for (const a of analysesResult.data) {
      if (a.topics && Array.isArray(a.topics)) {
        for (const topic of a.topics as string[]) {
          allTopicCounts[topic] = (allTopicCounts[topic] ?? 0) + 1;
        }
      }
    }

    const sortedTopics = Object.entries(allTopicCounts)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, maxItems);

    if (sortedTopics.length > 0) {
      items.push({
        category: "topic_breakdown",
        label: "토픽 분석",
        dataSourceType: "COMMENT_ANALYSIS",
        entityIds: [],
        displayType: "BAR_CHART",
        summary: `댓글에서 가장 많이 언급된 토픽은 '${sortedTopics[0]![0]}'(${sortedTopics[0]![1]}건)입니다.`,
        data: sortedTopics.map(([topic, count]: any) => ({ topic, count })),
      });
    }

    return items;
  }

  private async buildFAQBundle(
    projectId: string,
    maxItems: number,
  ): Promise<EvidenceBundleItem[]> {
    const items: EvidenceBundleItem[] = [];

    // 1. Unanswered FAQs
    const unanswered =
      await this.repositories.faqCandidate.findUnanswered(projectId);
    const topUnanswered = unanswered.slice(0, maxItems);

    if (topUnanswered.length > 0) {
      const topQuestion = topUnanswered[0]!.question;
      items.push({
        category: "unanswered_faqs",
        label: "미답변 FAQ",
        dataSourceType: "FAQ_CANDIDATE",
        entityIds: topUnanswered.map((f: any) => f.id),
        displayType: "TABLE",
        summary: `미답변 FAQ ${unanswered.length}건 중 '${topQuestion}' 관련 질문이 가장 많습니다.`,
        data: topUnanswered,
      });
    }

    // 2. All FAQs for distribution analysis
    const allFaqsResult =
      await this.repositories.faqCandidate.findByProject(projectId);
    const allFaqs = allFaqsResult.data;
    if (allFaqs.length > 0) {
      const questionCount = allFaqs.filter(
        (f: any) => (f as any).isQuestion === true,
      ).length;
      const answeredCount = allFaqs.length - unanswered.length;

      items.push({
        category: "faq_distribution",
        label: "FAQ 현황",
        dataSourceType: "FAQ_CANDIDATE",
        entityIds: [],
        displayType: "KPI_CARD",
        summary: `전체 FAQ ${allFaqs.length}건 중 답변 완료 ${answeredCount}건, 미답변 ${unanswered.length}건입니다.`,
        data: {
          total: allFaqs.length,
          answered: answeredCount,
          unanswered: unanswered.length,
          questionTypeCount: questionCount,
        },
      });
    }

    return items;
  }

  private async buildRiskBundle(
    projectId: string,
    maxItems: number,
  ): Promise<EvidenceBundleItem[]> {
    const items: EvidenceBundleItem[] = [];

    const activeRisks =
      await this.repositories.riskSignal.findActive(projectId);

    if (activeRisks.length > 0) {
      // 1. Risk by severity
      const severityCounts: Record<string, number> = {};
      for (const risk of activeRisks) {
        const severity = risk.severity ?? "UNKNOWN";
        severityCounts[severity] = (severityCounts[severity] ?? 0) + 1;
      }

      const criticalCount = severityCounts["CRITICAL"] ?? 0;
      const highCount = severityCounts["HIGH"] ?? 0;

      items.push({
        category: "risk_by_severity",
        label: "심각도별 리스크",
        dataSourceType: "RISK_SIGNAL",
        entityIds: activeRisks.map((r: any) => r.id),
        displayType: "BAR_CHART",
        summary: `활성 리스크 ${activeRisks.length}건 — CRITICAL ${criticalCount}건, HIGH ${highCount}건입니다.`,
        data: severityCounts,
      });

      // 2. Top risk signals with sample texts
      const topRisks = activeRisks.slice(0, maxItems);
      items.push({
        category: "top_risk_signals",
        label: "주요 리스크 신호",
        dataSourceType: "RISK_SIGNAL",
        entityIds: topRisks.map((r: any) => r.id),
        displayType: "TABLE",
        summary: `상위 리스크: "${topRisks[0]!.title}" — ${topRisks[0]!.description ?? "상세 내용 없음"}`,
        data: topRisks,
      });
    }

    return items;
  }

  private async buildIntentBundle(
    projectId: string,
    maxItems: number,
  ): Promise<EvidenceBundleItem[]> {
    const items: EvidenceBundleItem[] = [];

    const gapOpportunities =
      await this.repositories.intent.findGapOpportunities(projectId);

    if (gapOpportunities.length > 0) {
      const topGaps = gapOpportunities.slice(0, maxItems);

      // 1. Blue ocean keyword opportunities
      items.push({
        category: "blue_ocean_keywords",
        label: "블루오션 키워드",
        dataSourceType: "INTENT_RESULT",
        entityIds: topGaps.map((g: any) => g.id),
        displayType: "TABLE",
        summary: `블루오션 키워드 ${gapOpportunities.length}건 발견 — 최고 기회: "${topGaps[0]!.keyword}" (갭 스코어 ${topGaps[0]!.gapScore})`,
        data: topGaps,
      });

      // 2. Gap score distribution
      const scoreRanges = {
        high: gapOpportunities.filter((g: any) => g.gapScore >= 70).length,
        medium: gapOpportunities.filter(
          (g: any) => g.gapScore >= 40 && g.gapScore < 70,
        ).length,
        low: gapOpportunities.filter((g: any) => g.gapScore < 40).length,
      };

      items.push({
        category: "gap_distribution",
        label: "갭 스코어 분포",
        dataSourceType: "INTENT_RESULT",
        entityIds: [],
        displayType: "PIE_CHART",
        summary: `높은 기회(70+) ${scoreRanges.high}건, 중간(40-69) ${scoreRanges.medium}건, 낮음(40 미만) ${scoreRanges.low}건입니다.`,
        data: scoreRanges,
      });
    }

    return items;
  }

  private async buildTrendBundle(
    projectId: string,
    dateRange?: { from: Date; to: Date },
    maxItems?: number,
  ): Promise<EvidenceBundleItem[]> {
    const items: EvidenceBundleItem[] = [];
    const limit = maxItems ?? 5;

    const trends = dateRange
      ? await this.repositories.trendAnalytics.findByProject(
          projectId,
          dateRange,
        )
      : await this.repositories.trendAnalytics.findLatest(projectId, limit * 3);

    if (trends.length > 0) {
      const rising = trends.filter(
        (t: any) => (t as any).searchTrend === "RISING",
      );
      const declining = trends.filter(
        (t: any) => (t as any).searchTrend === "DECLINING",
      );

      // 1. Rising keywords
      if (rising.length > 0) {
        const topRising = rising.slice(0, limit);
        items.push({
          category: "rising_keywords",
          label: "상승 키워드",
          dataSourceType: "KEYWORD_METRIC",
          entityIds: topRising.map((t: any) => t.id),
          displayType: "LINE_CHART",
          summary: `상승 추세 키워드 ${rising.length}건 — 대표 키워드: "${topRising[0]!.keyword}"`,
          data: topRising,
        });
      }

      // 2. Declining keywords
      if (declining.length > 0) {
        const topDeclining = declining.slice(0, limit);
        items.push({
          category: "declining_keywords",
          label: "하락 키워드",
          dataSourceType: "KEYWORD_METRIC",
          entityIds: topDeclining.map((t: any) => t.id),
          displayType: "LINE_CHART",
          summary: `하락 추세 키워드 ${declining.length}건 — 주의 필요: "${topDeclining[0]!.keyword}"`,
          data: topDeclining,
        });
      }

      // 3. Volume change overview
      const totalVolume = trends.reduce(
        (sum: number, t: any) => sum + ((t as any).avgSearchVolume ?? 0),
        0,
      );

      items.push({
        category: "volume_overview",
        label: "검색량 변화",
        dataSourceType: "KEYWORD_METRIC",
        entityIds: [],
        displayType: "KPI_CARD",
        summary: `추적 키워드 ${trends.length}건, 상승 ${rising.length}건, 하락 ${declining.length}건, 총 평균 검색량 ${totalVolume}`,
        data: {
          totalKeywords: trends.length,
          rising: rising.length,
          declining: declining.length,
          stable: trends.length - rising.length - declining.length,
          totalAvgVolume: totalVolume,
        },
      });
    }

    return items;
  }

  private async buildCompetitiveBundle(
    projectId: string,
    maxItems: number,
  ): Promise<EvidenceBundleItem[]> {
    const items: EvidenceBundleItem[] = [];

    const channelsResult =
      await this.repositories.channel.findByProject(projectId);
    const channels = channelsResult.data;

    if (channels.length > 0) {
      const channelStats = [];
      for (const channel of channels.slice(0, maxItems)) {
        const snapshots = await this.repositories.channel.findSnapshots(
          channel.id,
        );
        const latest = snapshots[0]; // most recent
        channelStats.push({
          channelId: channel.id,
          name: (channel as any).name ?? channel.id,
          platform: (channel as any).platform ?? "UNKNOWN",
          latestSnapshot: latest ?? null,
        });
      }

      items.push({
        category: "channel_comparison",
        label: "채널 성과 비교",
        dataSourceType: "CHANNEL_SNAPSHOT",
        entityIds: channels.slice(0, maxItems).map((c: any) => c.id),
        displayType: "BAR_CHART",
        summary: `프로젝트 내 채널 ${channels.length}개의 최신 성과를 비교합니다.`,
        data: channelStats,
      });
    }

    return items;
  }

  private async buildCampaignBundle(
    projectId: string,
    maxItems: number,
  ): Promise<EvidenceBundleItem[]> {
    const items: EvidenceBundleItem[] = [];

    const campaignResult =
      await this.repositories.campaign.findByProject(projectId);
    const campaigns = campaignResult.data ?? [];

    if (campaigns.length > 0) {
      const topCampaigns = campaigns.slice(0, maxItems);

      // 1. Campaign metrics overview
      items.push({
        category: "campaign_metrics",
        label: "캠페인 성과",
        dataSourceType: "CAMPAIGN_METRIC",
        entityIds: topCampaigns.map((c: any) => c.id),
        displayType: "TABLE",
        summary: `진행 중인 캠페인 ${campaigns.length}건의 성과 지표입니다.`,
        data: topCampaigns,
      });

      // 2. Campaign status distribution
      const statusCounts: Record<string, number> = {};
      for (const c of campaigns) {
        const status = (c as any).status ?? "UNKNOWN";
        statusCounts[status] = (statusCounts[status] ?? 0) + 1;
      }

      items.push({
        category: "campaign_status",
        label: "캠페인 상태 분포",
        dataSourceType: "CAMPAIGN_METRIC",
        entityIds: [],
        displayType: "PIE_CHART",
        summary: `캠페인 상태: ${Object.entries(statusCounts)
          .map(([s, c]: any) => `${s} ${c}건`)
          .join(", ")}`,
        data: statusCounts,
      });
    }

    return items;
  }
}
