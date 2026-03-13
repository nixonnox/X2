import type { Repositories } from "../../repositories";
import type {
  DateRange,
  PaginatedResult,
} from "../../repositories/base.repository";
import { type ServiceResult, type Logger, ok, err } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SnapshotInput = {
  subscriberCount: number;
  contentCount: number;
  totalViews: bigint;
  avgEngagement: number;
  avgViewsPerContent?: number;
  followerGrowth?: number;
  followerGrowthRate?: number;
  estimatedReach?: number;
  rawMetrics?: Record<string, unknown>;
};

export type TrendSummary = {
  subscriberGrowth: number;
  subscriberGrowthRate: number;
  engagementTrend: "RISING" | "STABLE" | "DECLINING";
  avgEngagement30d: number;
  viewsTrend: "RISING" | "STABLE" | "DECLINING";
};

export type TopContent = {
  id: string;
  title: string;
  url: string;
  viewCount: bigint;
  engagementRate: number;
  publishedAt: Date | null;
};

export type ChannelOverview = {
  channel: {
    id: string;
    name: string;
    platform: string;
    url: string;
    thumbnailUrl: string | null;
    subscriberCount: number;
    contentCount: number;
    channelType: string;
    lastSyncedAt: Date | null;
  };
  trend: TrendSummary;
  topContent: TopContent[];
  snapshotCount: number;
};

export type ChannelComparisonEntry = {
  channelId: string;
  channelName: string;
  platform: string;
  avgSubscribers: number;
  avgEngagement: number;
  totalViews: bigint;
  contentFrequency: number; // contents per day in range
  subscriberGrowth: number;
};

export type ChannelComparison = {
  dateRange: DateRange;
  channels: ChannelComparisonEntry[];
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ChannelAnalysisService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Get channel with latest metrics and trend summary.
   */
  async getChannelOverview(
    channelId: string,
  ): Promise<ServiceResult<ChannelOverview>> {
    try {
      // 1. Fetch channel
      const channel = await this.repositories.channel.findById(channelId);
      if (!channel) {
        return err("Channel not found", "CHANNEL_NOT_FOUND");
      }

      // 2. Fetch latest 30-day snapshots
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const snapshots = await this.repositories.channel.findSnapshots(
        channelId,
        { from: thirtyDaysAgo, to: now },
      );

      // 3. Calculate trends
      const trend = this.calculateTrend(snapshots);

      // 4. Fetch top 5 performing content
      const topContentRaw = await this.repositories.content.findTopPerforming(
        channelId,
        5,
      );
      const topContent: TopContent[] = topContentRaw.map((c) => ({
        id: c.id,
        title: c.title,
        url: c.url,
        viewCount: c.viewCount,
        engagementRate: c.engagementRate,
        publishedAt: c.publishedAt,
      }));

      // 5. Return assembled overview
      return ok({
        channel: {
          id: channel.id,
          name: channel.name,
          platform: channel.platform,
          url: channel.url,
          thumbnailUrl: channel.thumbnailUrl,
          subscriberCount: channel.subscriberCount,
          contentCount: channel.contentCount,
          channelType: channel.channelType,
          lastSyncedAt: channel.lastSyncedAt,
        },
        trend,
        topContent,
        snapshotCount: snapshots.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get channel overview", {
        channelId,
        error: message,
      });
      return err(message, "CHANNEL_OVERVIEW_FAILED");
    }
  }

  /**
   * Compare multiple channels' performance within a date range.
   */
  async compareChannels(
    channelIds: string[],
    dateRange: DateRange,
  ): Promise<ServiceResult<ChannelComparison>> {
    try {
      if (channelIds.length === 0) {
        return err("At least one channel ID is required", "INVALID_INPUT");
      }

      if (channelIds.length > 20) {
        return err("Cannot compare more than 20 channels", "INVALID_INPUT");
      }

      const rangeDays = Math.max(
        1,
        Math.ceil(
          (dateRange.to.getTime() - dateRange.from.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );

      // N+1 방지: 모든 채널 데이터를 병렬로 사전 조회
      const [allChannels, allSnapshots, allContentCounts] = await Promise.all([
        Promise.all(
          channelIds.map((id) =>
            this.repositories.channel
              .findById(id)
              .then((c) => [id, c] as const),
          ),
        ),
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
                {
                  publishedAfter: dateRange.from,
                  publishedBefore: dateRange.to,
                },
              )
              .then((r) => [id, r.total] as const),
          ),
        ),
      ]);

      const channelMap = new Map(allChannels);
      const snapshotMap = new Map(allSnapshots);
      const contentCountMap = new Map(allContentCounts);

      const entries: ChannelComparisonEntry[] = [];

      for (const channelId of channelIds) {
        const channel = channelMap.get(channelId);
        if (!channel) {
          this.logger.warn("Channel not found during comparison, skipping", {
            channelId,
          });
          continue;
        }

        const snapshots = snapshotMap.get(channelId) ?? [];
        const contentCount = contentCountMap.get(channelId) ?? 0;

        const avgSubscribers =
          snapshots.length > 0
            ? snapshots.reduce((sum, s) => sum + s.subscriberCount, 0) /
              snapshots.length
            : channel.subscriberCount;

        const avgEngagement =
          snapshots.length > 0
            ? snapshots.reduce((sum, s) => sum + s.avgEngagement, 0) /
              snapshots.length
            : 0;

        const totalViews = snapshots.reduce(
          (sum, s) => sum + s.totalViews,
          BigInt(0),
        );

        const contentFrequency = contentCount / rangeDays;

        const subscriberGrowth =
          snapshots.length >= 2
            ? snapshots[snapshots.length - 1]!.subscriberCount -
              snapshots[0]!.subscriberCount
            : 0;

        entries.push({
          channelId,
          channelName: channel.name,
          platform: channel.platform,
          avgSubscribers: Math.round(avgSubscribers),
          avgEngagement,
          totalViews,
          contentFrequency: Math.round(contentFrequency * 100) / 100,
          subscriberGrowth,
        });
      }

      return ok({
        dateRange,
        channels: entries,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to compare channels", {
        channelIds,
        error: message,
      });
      return err(message, "CHANNEL_COMPARISON_FAILED");
    }
  }

  /**
   * Record a daily channel snapshot (called by collection pipeline).
   */
  async recordSnapshot(
    channelId: string,
    metrics: SnapshotInput,
  ): Promise<ServiceResult<void>> {
    try {
      // 1. Validate channel exists
      const channel = await this.repositories.channel.findById(channelId);
      if (!channel) {
        return err("Channel not found", "CHANNEL_NOT_FOUND");
      }

      // 2. Upsert today's snapshot
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.repositories.channel.upsertSnapshot(channelId, today, {
        subscriberCount: metrics.subscriberCount,
        contentCount: metrics.contentCount,
        totalViews: metrics.totalViews,
        avgEngagement: metrics.avgEngagement,
        avgViewsPerContent: metrics.avgViewsPerContent,
        followerGrowth: metrics.followerGrowth,
        followerGrowthRate: metrics.followerGrowthRate,
        estimatedReach: metrics.estimatedReach,
        rawMetrics: metrics.rawMetrics ?? null,
      });

      // 3. Log success
      this.logger.info("Channel snapshot recorded", {
        channelId,
        date: today.toISOString(),
        subscriberCount: metrics.subscriberCount,
      });

      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to record channel snapshot", {
        channelId,
        error: message,
      });
      return err(message, "SNAPSHOT_RECORD_FAILED");
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private calculateTrend(
    snapshots: Array<{
      subscriberCount: number;
      avgEngagement: number;
      totalViews: bigint;
    }>,
  ): TrendSummary {
    if (snapshots.length < 2) {
      return {
        subscriberGrowth: 0,
        subscriberGrowthRate: 0,
        engagementTrend: "STABLE",
        avgEngagement30d: snapshots[0]?.avgEngagement ?? 0,
        viewsTrend: "STABLE",
      };
    }

    const first = snapshots[0]!;
    const last = snapshots[snapshots.length - 1]!;

    const subscriberGrowth = last.subscriberCount - first.subscriberCount;
    const subscriberGrowthRate =
      first.subscriberCount > 0
        ? (subscriberGrowth / first.subscriberCount) * 100
        : 0;

    const avgEngagement30d =
      snapshots.reduce((sum, s) => sum + s.avgEngagement, 0) / snapshots.length;

    // Calculate engagement trend (compare first half vs second half)
    const mid = Math.floor(snapshots.length / 2);
    const firstHalfEngagement =
      snapshots.slice(0, mid).reduce((sum, s) => sum + s.avgEngagement, 0) /
      mid;
    const secondHalfEngagement =
      snapshots.slice(mid).reduce((sum, s) => sum + s.avgEngagement, 0) /
      (snapshots.length - mid);

    const engagementChange = secondHalfEngagement - firstHalfEngagement;
    const engagementTrend: TrendSummary["engagementTrend"] =
      engagementChange > 0.01
        ? "RISING"
        : engagementChange < -0.01
          ? "DECLINING"
          : "STABLE";

    // Calculate views trend
    const firstHalfViews =
      snapshots
        .slice(0, mid)
        .reduce((sum, s) => sum + Number(s.totalViews), 0) / mid;
    const secondHalfViews =
      snapshots.slice(mid).reduce((sum, s) => sum + Number(s.totalViews), 0) /
      (snapshots.length - mid);

    const viewsChange =
      firstHalfViews > 0
        ? (secondHalfViews - firstHalfViews) / firstHalfViews
        : 0;
    const viewsTrend: TrendSummary["viewsTrend"] =
      viewsChange > 0.05
        ? "RISING"
        : viewsChange < -0.05
          ? "DECLINING"
          : "STABLE";

    return {
      subscriberGrowth,
      subscriberGrowthRate: Math.round(subscriberGrowthRate * 100) / 100,
      engagementTrend,
      avgEngagement30d: Math.round(avgEngagement30d * 10000) / 10000,
      viewsTrend,
    };
  }
}
