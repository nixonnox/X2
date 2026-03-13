import type { Repositories } from "../../repositories";
import type { DateRange } from "../../repositories/base.repository";
import { type ServiceResult, type Logger, ok, err } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MetricComparison = {
  metric: string;
  ownedAvg: number;
  competitorAvg: number;
  gap: number; // positive = owned leads, negative = competitor leads
  gapPercent: number;
};

export type ChannelGapEntry = {
  channelId: string;
  channelName: string;
  platform: string;
  channelType: "OWNED" | "COMPETITOR";
  subscriberCount: number;
  avgEngagement: number;
  contentFrequency: number;
  totalViews: bigint;
};

export type CompetitiveGapAnalysis = {
  projectId: string;
  dateRange: DateRange;
  ownedChannels: ChannelGapEntry[];
  competitorChannels: ChannelGapEntry[];
  gaps: MetricComparison[];
  strengths: string[];
  weaknesses: string[];
};

export type CompetitorSuggestion = {
  platformChannelId: string;
  platform: string;
  name: string;
  url: string;
  reason: string;
  similarityScore: number;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CompetitorService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Analyze competitive gaps between owned and competitor channels.
   */
  async analyzeCompetitiveGaps(
    projectId: string,
    dateRange: DateRange,
  ): Promise<ServiceResult<CompetitiveGapAnalysis>> {
    try {
      // 1. Find owned channels in project
      const ownedResult = await this.repositories.channel.findByProject(
        projectId,
        { channelType: "OWNED" },
      );
      const ownedChannels = ownedResult.data;

      // 2. Find competitor channels in project
      const competitorResult = await this.repositories.channel.findByProject(
        projectId,
        { channelType: "COMPETITOR" },
      );
      const competitorChannels = competitorResult.data;

      if (ownedChannels.length === 0) {
        return err("No owned channels found in project", "NO_OWNED_CHANNELS");
      }

      if (competitorChannels.length === 0) {
        return err(
          "No competitor channels found in project",
          "NO_COMPETITOR_CHANNELS",
        );
      }

      const rangeDays = Math.max(
        1,
        Math.ceil(
          (dateRange.to.getTime() - dateRange.from.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );

      // 3. Build gap entries for owned channels
      const ownedEntries = await this.buildChannelEntries(
        ownedChannels,
        dateRange,
        rangeDays,
        "OWNED",
      );

      // 4. Build gap entries for competitor channels
      const competitorEntries = await this.buildChannelEntries(
        competitorChannels,
        dateRange,
        rangeDays,
        "COMPETITOR",
      );

      // 5. Compare metrics
      const ownedAvgSubscribers = this.average(
        ownedEntries.map((e) => e.subscriberCount),
      );
      const compAvgSubscribers = this.average(
        competitorEntries.map((e) => e.subscriberCount),
      );

      const ownedAvgEngagement = this.average(
        ownedEntries.map((e) => e.avgEngagement),
      );
      const compAvgEngagement = this.average(
        competitorEntries.map((e) => e.avgEngagement),
      );

      const ownedAvgFrequency = this.average(
        ownedEntries.map((e) => e.contentFrequency),
      );
      const compAvgFrequency = this.average(
        competitorEntries.map((e) => e.contentFrequency),
      );

      const gaps: MetricComparison[] = [
        this.buildGap("subscribers", ownedAvgSubscribers, compAvgSubscribers),
        this.buildGap("engagement", ownedAvgEngagement, compAvgEngagement),
        this.buildGap("contentFrequency", ownedAvgFrequency, compAvgFrequency),
      ];

      // 6. Identify strengths and weaknesses
      const strengths: string[] = [];
      const weaknesses: string[] = [];

      for (const gap of gaps) {
        if (gap.gap > 0) {
          strengths.push(
            `Owned channels lead in ${gap.metric} by ${Math.abs(gap.gapPercent).toFixed(1)}%`,
          );
        } else if (gap.gap < 0) {
          weaknesses.push(
            `Competitor channels lead in ${gap.metric} by ${Math.abs(gap.gapPercent).toFixed(1)}%`,
          );
        }
      }

      // TODO: [CROSS-SERVICE] ActionRecommendationService -- Feed gaps to generate actionable recommendations

      this.logger.info("Competitive gap analysis completed", {
        projectId,
        ownedCount: ownedEntries.length,
        competitorCount: competitorEntries.length,
        strengths: strengths.length,
        weaknesses: weaknesses.length,
      });

      return ok({
        projectId,
        dateRange,
        ownedChannels: ownedEntries,
        competitorChannels: competitorEntries,
        gaps,
        strengths,
        weaknesses,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to analyze competitive gaps", {
        projectId,
        error: message,
      });
      return err(message, "COMPETITIVE_GAP_ANALYSIS_FAILED");
    }
  }

  /**
   * Suggest potential competitor channels based on content overlap.
   */
  async suggestCompetitors(
    projectId: string,
  ): Promise<ServiceResult<CompetitorSuggestion[]>> {
    // TODO: [INTEGRATION] @x2/ai -- Requires content similarity analysis (Phase R-5)
    // Implementation plan:
    // 1. Fetch owned channel content topics/keywords
    // 2. Use AI to find similar channels on each platform
    // 3. Score by content overlap and audience similarity
    // 4. Return ranked suggestions

    this.logger.warn("suggestCompetitors not yet implemented", { projectId });
    return ok([]);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async buildChannelEntries(
    channels: Array<{
      id: string;
      name: string;
      platform: string;
      subscriberCount: number;
    }>,
    dateRange: DateRange,
    rangeDays: number,
    channelType: "OWNED" | "COMPETITOR",
  ): Promise<ChannelGapEntry[]> {
    // N+1 방지: 모든 채널의 스냅샷과 콘텐츠 수를 병렬로 사전 조회
    const channelIds = channels.map((c) => c.id);

    const [allSnapshots, allContentCounts] = await Promise.all([
      Promise.all(
        channelIds.map((id) =>
          this.repositories.channel
            .findSnapshots(id, dateRange)
            .then((s) => [id, s] as const),
        ),
      ),
      Promise.all(
        channelIds.map((id) =>
          this.repositories.content
            .findByChannel(
              id,
              { page: 1, pageSize: 1 },
              { publishedAfter: dateRange.from, publishedBefore: dateRange.to },
            )
            .then((r) => [id, r.total] as const),
        ),
      ),
    ]);

    const snapshotMap = new Map(allSnapshots);
    const contentCountMap = new Map(allContentCounts);

    return channels.map((channel) => {
      const snapshots = snapshotMap.get(channel.id) ?? [];
      const contentCount = contentCountMap.get(channel.id) ?? 0;

      const avgEngagement =
        snapshots.length > 0
          ? snapshots.reduce((sum, s) => sum + s.avgEngagement, 0) /
            snapshots.length
          : 0;

      const totalViews = snapshots.reduce(
        (sum, s) => sum + s.totalViews,
        BigInt(0),
      );

      return {
        channelId: channel.id,
        channelName: channel.name,
        platform: channel.platform,
        channelType,
        subscriberCount: channel.subscriberCount,
        avgEngagement: Math.round(avgEngagement * 10000) / 10000,
        contentFrequency: Math.round((contentCount / rangeDays) * 100) / 100,
        totalViews,
      };
    });
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private buildGap(
    metric: string,
    ownedAvg: number,
    competitorAvg: number,
  ): MetricComparison {
    const gap = ownedAvg - competitorAvg;
    const gapPercent =
      competitorAvg !== 0
        ? (gap / competitorAvg) * 100
        : ownedAvg > 0
          ? 100
          : 0;

    return {
      metric,
      ownedAvg: Math.round(ownedAvg * 100) / 100,
      competitorAvg: Math.round(competitorAvg * 100) / 100,
      gap: Math.round(gap * 100) / 100,
      gapPercent: Math.round(gapPercent * 100) / 100,
    };
  }
}
