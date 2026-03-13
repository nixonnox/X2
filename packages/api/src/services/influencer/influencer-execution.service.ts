import type { Repositories } from "../../repositories";
import type {
  DateRange,
  PaginatedResult,
} from "../../repositories/base.repository";
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

export type InfluencerProfile = {
  id: string;
  channelId: string;
  tierLevel: string;
  overallScore: number;
  engagementRate: number | null;
  avgViews: number | null;
  audienceQualityScore: number | null;
  categories: string[];
  country: string | null;
  language: string | null;
  contactEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InfluencerSearchInput = {
  query?: string;
  platform?: string;
  tier?: string;
  minFollowers?: number;
  categories?: string[];
  country?: string;
  pagination?: { page?: number; pageSize?: number };
};

export type InfluencerAnalytics = {
  profileId: string;
  channelName: string;
  platform: string;
  tier: string;
  subscriberCount: number;
  dateRange: DateRange;
  engagementRate: number;
  avgViews: number;
  audienceQualityScore: number | null;
  contentFrequency: number;
  viewGrowthRate: number;
  engagementTrend: "RISING" | "STABLE" | "DECLINING";
};

// Tier thresholds by subscriber count
const TIER_THRESHOLDS: { tier: string; min: number; max: number }[] = [
  { tier: "NANO", min: 0, max: 10_000 },
  { tier: "MICRO", min: 10_000, max: 100_000 },
  { tier: "MID", min: 100_000, max: 500_000 },
  { tier: "MACRO", min: 500_000, max: 1_000_000 },
  { tier: "MEGA", min: 1_000_000, max: Infinity },
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class InfluencerExecutionService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Sync influencer profile from channel data.
   */
  async syncProfile(
    channelId: string,
    trace: TraceContext,
  ): Promise<ServiceResult<InfluencerProfile>> {
    try {
      // 1. Fetch channel with latest snapshot
      const channel = await this.repositories.channel.findById(channelId);
      if (!channel) {
        return err("Channel not found", "CHANNEL_NOT_FOUND");
      }

      // 2. Calculate tier (NANO/MICRO/MID/MACRO/MEGA based on subscribers)
      const subscriberCount = channel.subscriberCount;
      const tier = this.calculateTier(subscriberCount);

      // Get latest snapshots for engagement calculation
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const snapshots = await this.repositories.channel.findSnapshots(
        channelId,
        { from: thirtyDaysAgo, to: now },
      );

      const avgEngagement =
        snapshots.length > 0
          ? snapshots.reduce((sum, s) => sum + s.avgEngagement, 0) /
            snapshots.length
          : 0;

      const avgViews =
        snapshots.length > 0
          ? snapshots.reduce((sum, s) => sum + (s.avgViewsPerContent ?? 0), 0) /
            snapshots.length
          : 0;

      // 3. Upsert InfluencerProfile
      const profile = await this.repositories.influencer.upsert(channelId, {
        tierLevel: tier as any,
        overallScore: this.calculateOverallScore(
          avgEngagement,
          subscriberCount,
          avgViews,
        ),
        engagementRate: avgEngagement,
        avgViews: Math.round(avgViews),
        categories: [],
        country: null,
        language: null,
      });

      // 4. Log
      this.logger.info("Influencer profile synced", {
        channelId,
        profileId: profile.id,
        tier,
        subscriberCount,
        requestId: trace.requestId,
      });

      return ok(profile as unknown as InfluencerProfile);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to sync influencer profile", {
        channelId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "INFLUENCER_SYNC_FAILED");
    }
  }

  /**
   * Search influencers by criteria.
   */
  async searchInfluencers(
    filters: InfluencerSearchInput,
  ): Promise<ServiceResult<PaginatedResult<InfluencerProfile>>> {
    try {
      const result = await this.repositories.influencer.search(
        filters.query ?? "",
        {
          platform: filters.platform as any,
          tier: filters.tier as any,
          minFollowers: filters.minFollowers,
          categories: filters.categories,
          country: filters.country,
        },
        filters.pagination,
      );

      return ok(result as unknown as PaginatedResult<InfluencerProfile>);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to search influencers", {
        filters,
        error: message,
      });
      return err(message, "INFLUENCER_SEARCH_FAILED");
    }
  }

  /**
   * Get influencer analytics (engagement rate, audience quality).
   */
  async getInfluencerAnalytics(
    profileId: string,
    dateRange: DateRange,
  ): Promise<ServiceResult<InfluencerAnalytics>> {
    try {
      // 1. Fetch profile with channel
      const profile = await this.repositories.influencer.findById(profileId);
      if (!profile) {
        return err("Influencer profile not found", "PROFILE_NOT_FOUND");
      }

      const channelId = profile.channelId;
      const channel = await this.repositories.channel.findById(channelId);
      if (!channel) {
        return err("Linked channel not found", "CHANNEL_NOT_FOUND");
      }

      // 2. Fetch snapshots within date range
      const snapshots = await this.repositories.channel.findSnapshots(
        channelId,
        dateRange,
      );

      // 3. Calculate analytics
      const avgEngagement =
        snapshots.length > 0
          ? snapshots.reduce((sum, s) => sum + s.avgEngagement, 0) /
            snapshots.length
          : (profile.engagementRate ?? 0);

      const avgViews =
        snapshots.length > 0
          ? snapshots.reduce((sum, s) => sum + (s.avgViewsPerContent ?? 0), 0) /
            snapshots.length
          : (profile.avgViews ?? 0);

      // Content frequency
      const rangeDays = Math.max(
        1,
        Math.ceil(
          (dateRange.to.getTime() - dateRange.from.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      const contentResult = await this.repositories.content.findByChannel(
        channelId,
        { page: 1, pageSize: 1 },
        {
          publishedAfter: dateRange.from,
          publishedBefore: dateRange.to,
        },
      );
      const contentCount = contentResult.total;
      const contentFrequency = contentCount / rangeDays;

      // View growth rate
      let viewGrowthRate = 0;
      if (snapshots.length >= 2) {
        const firstViews = Number(snapshots[0]!.totalViews);
        const lastViews = Number(snapshots[snapshots.length - 1]!.totalViews);
        viewGrowthRate =
          firstViews > 0 ? ((lastViews - firstViews) / firstViews) * 100 : 0;
      }

      // Engagement trend
      let engagementTrend: "RISING" | "STABLE" | "DECLINING" = "STABLE";
      if (snapshots.length >= 4) {
        const mid = Math.floor(snapshots.length / 2);
        const firstHalf =
          snapshots.slice(0, mid).reduce((s, v) => s + v.avgEngagement, 0) /
          mid;
        const secondHalf =
          snapshots.slice(mid).reduce((s, v) => s + v.avgEngagement, 0) /
          (snapshots.length - mid);
        const diff = secondHalf - firstHalf;
        engagementTrend =
          diff > 0.005 ? "RISING" : diff < -0.005 ? "DECLINING" : "STABLE";
      }

      return ok({
        profileId,
        channelName: channel.name,
        platform: channel.platform,
        tier: profile.tierLevel,
        subscriberCount: channel.subscriberCount,
        dateRange,
        engagementRate: Math.round(avgEngagement * 10000) / 10000,
        avgViews: Math.round(avgViews),
        audienceQualityScore: profile.audienceQualityScore,
        contentFrequency: Math.round(contentFrequency * 100) / 100,
        viewGrowthRate: Math.round(viewGrowthRate * 100) / 100,
        engagementTrend,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get influencer analytics", {
        profileId,
        error: message,
      });
      return err(message, "INFLUENCER_ANALYTICS_FAILED");
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private calculateTier(subscriberCount: number): string {
    for (const threshold of TIER_THRESHOLDS) {
      if (subscriberCount >= threshold.min && subscriberCount < threshold.max) {
        return threshold.tier;
      }
    }
    return "NANO";
  }

  private calculateOverallScore(
    engagementRate: number,
    subscriberCount: number,
    avgViews: number,
  ): number {
    // Weighted score: engagement (40%), reach (30%), views (30%)
    const engagementScore = Math.min(engagementRate * 10, 100) * 0.4;
    const reachScore =
      Math.min(Math.log10(subscriberCount + 1) * 10, 100) * 0.3;
    const viewScore = Math.min(Math.log10(avgViews + 1) * 10, 100) * 0.3;

    return Math.round((engagementScore + reachScore + viewScore) * 100) / 100;
  }
}
