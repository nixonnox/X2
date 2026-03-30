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

export type MetricInput = {
  totalReach: number;
  totalImpressions: number;
  totalEngagements: number;
  totalClicks: number;
  totalConversions: number;
  spend: number;
};

export type MeasurementInput = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  conversions: number;
  reach: number;
  impressions: number;
};

export type RoiCalculation = {
  id: string;
  campaignId: string;
  totalSpend: number;
  totalRevenue: number;
  roi: number;
  roas: number;
  cpm: number;
  cpv: number;
  cpe: number;
  totalReach: number;
  totalEngagements: number;
  totalConversions: number;
  aiSummary: string | null;
  calculatedAt: Date;
};

export type PerformanceDashboard = {
  campaignId: string;
  campaignName: string;
  status: string;
  dateRange: { start: Date | null; end: Date | null };
  summary: {
    totalReach: number;
    totalImpressions: number;
    totalEngagements: number;
    totalClicks: number;
    totalConversions: number;
    totalSpend: number;
    engagementRate: number;
    clickThroughRate: number;
    conversionRate: number;
  };
  latestRoi: RoiCalculation | null;
  creatorPerformance: CreatorPerformance[];
};

export type CreatorPerformance = {
  creatorId: string;
  channelName: string;
  platform: string;
  contentCount: number;
  totalViews: number;
  totalEngagements: number;
  engagementRate: number;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CampaignPerformanceService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Record daily campaign metrics.
   */
  async recordDailyMetrics(
    campaignId: string,
    date: Date,
    metrics: MetricInput,
    trace: TraceContext,
  ): Promise<ServiceResult<void>> {
    try {
      // Validate campaign exists
      const campaign = await this.repositories.campaign.findById(campaignId);
      if (!campaign) {
        return err("Campaign not found", "CAMPAIGN_NOT_FOUND");
      }

      // Normalize date to midnight
      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);

      await this.repositories.campaign.upsertDailyMetric(
        campaignId,
        normalizedDate,
        {
          totalReach: metrics.totalReach,
          totalEngagement: metrics.totalEngagements,
          totalNewFollowers: 0,
          spentBudget: metrics.spend,
        },
      );

      this.logger.info("Campaign daily metrics recorded", {
        campaignId,
        date: normalizedDate.toISOString(),
        requestId: trace.requestId,
      });

      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to record campaign metrics", {
        campaignId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "CAMPAIGN_METRICS_FAILED");
    }
  }

  /**
   * Record post measurement.
   */
  async recordPostMeasurement(
    contentId: string,
    date: Date,
    measurement: MeasurementInput,
  ): Promise<ServiceResult<void>> {
    try {
      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);

      await this.repositories.campaign.upsertPostMeasurement(
        contentId,
        normalizedDate,
        {
          viewCount: measurement.views,
          likeCount: measurement.likes,
          commentCount: measurement.comments,
          shareCount: measurement.shares,
          engagementRate: 0,
        },
      );

      this.logger.info("Post measurement recorded", {
        contentId,
        date: normalizedDate.toISOString(),
      });

      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to record post measurement", {
        contentId,
        error: message,
      });
      return err(message, "POST_MEASUREMENT_FAILED");
    }
  }

  /**
   * Calculate ROI for campaign.
   */
  async calculateRoi(
    campaignId: string,
    trace: TraceContext,
  ): Promise<ServiceResult<RoiCalculation>> {
    try {
      // 1. Fetch campaign with all content + measurements
      const campaign = await this.repositories.campaign.findById(campaignId);
      if (!campaign) {
        return err("Campaign not found", "CAMPAIGN_NOT_FOUND");
      }

      // 2. Aggregate total reach, engagement, conversions from creators' content
      let totalReach = 0;
      let totalImpressions = 0;
      let totalEngagements = 0;
      let totalClicks = 0;
      let totalConversions = 0;
      let totalViews = 0;

      const creators = campaign.creators ?? [];
      for (const creator of creators) {
        const contents = (creator as any).contents ?? [];
        for (const content of contents) {
          // Sum up all post measurements if available
          // Content may have aggregated metrics directly
          totalViews += Number(content.views ?? 0);
          totalEngagements +=
            Number(content.likes ?? 0) +
            Number(content.comments ?? 0) +
            Number(content.shares ?? 0);
          totalClicks += Number(content.clicks ?? 0);
          totalConversions += Number(content.conversions ?? 0);
          totalReach += Number(content.reach ?? 0);
          totalImpressions += Number(content.impressions ?? 0);
        }
      }

      // 3. Calculate ROI, ROAS, CPM, CPV, CPE
      const totalSpend = Number(campaign.totalBudget ?? 0);
      const totalRevenue = totalConversions * 50; // TODO: Use actual conversion value from config

      const roi =
        totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;
      const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
      const cpm =
        totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
      const cpv = totalViews > 0 ? totalSpend / totalViews : 0;
      const cpe = totalEngagements > 0 ? totalSpend / totalEngagements : 0;

      // 4. TODO: Compare with industry benchmarks (VerticalPack)

      // 5. TODO: [INTEGRATION] @x2/ai — Generate AI summary
      // Expected: aiClient.generateCampaignSummary({ roi, roas, ... }) -> string
      const aiSummary: string | null = null;

      // 6. Create RoiCalculation record
      const roiRecord = await this.repositories.campaign.createRoiCalculation(
        campaignId,
        {
          totalCost: totalSpend,
          roi: Math.round(roi * 100) / 100,
          roas: Math.round(roas * 100) / 100,
          cpm: Math.round(cpm * 100) / 100,
          cpv: Math.round(cpv * 100) / 100,
          cpe: Math.round(cpe * 100) / 100,
          totalReach,
          totalEngagement: totalEngagements,
          conversions: totalConversions,
          aiSummary,
        },
      );

      // 7. Log
      this.logger.info("ROI calculated", {
        campaignId,
        roi: Math.round(roi * 100) / 100,
        roas: Math.round(roas * 100) / 100,
        totalSpend,
        totalRevenue,
        requestId: trace.requestId,
      });

      return ok(roiRecord as unknown as RoiCalculation);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to calculate ROI", {
        campaignId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "ROI_CALCULATION_FAILED");
    }
  }

  /**
   * Get campaign performance dashboard.
   */
  async getPerformanceDashboard(
    campaignId: string,
  ): Promise<ServiceResult<PerformanceDashboard>> {
    try {
      const campaign = await this.repositories.campaign.findById(campaignId);
      if (!campaign) {
        return err("Campaign not found", "CAMPAIGN_NOT_FOUND");
      }

      // Aggregate metrics from creators
      let totalReach = 0;
      let totalImpressions = 0;
      let totalEngagements = 0;
      let totalClicks = 0;
      let totalConversions = 0;
      const totalSpend = Number(campaign.totalBudget ?? 0);

      const creatorPerformance: CreatorPerformance[] = [];
      const creators = campaign.creators ?? [];

      for (const creator of creators) {
        const contents = (creator as any).contents ?? [];
        let creatorViews = 0;
        let creatorEngagements = 0;

        for (const content of contents) {
          const views = Number(content.views ?? 0);
          const engagements =
            Number(content.likes ?? 0) +
            Number(content.comments ?? 0) +
            Number(content.shares ?? 0);

          creatorViews += views;
          creatorEngagements += engagements;
          totalReach += Number(content.reach ?? 0);
          totalImpressions += Number(content.impressions ?? 0);
          totalEngagements += engagements;
          totalClicks += Number(content.clicks ?? 0);
          totalConversions += Number(content.conversions ?? 0);
        }

        const channel = (creator as any).channel;
        creatorPerformance.push({
          creatorId: creator.id,
          channelName: channel?.name ?? "Unknown",
          platform: channel?.platform ?? "UNKNOWN",
          contentCount: contents.length,
          totalViews: creatorViews,
          totalEngagements: creatorEngagements,
          engagementRate:
            creatorViews > 0
              ? Math.round((creatorEngagements / creatorViews) * 10000) / 100
              : 0,
        });
      }

      // Calculate rates
      const engagementRate =
        totalImpressions > 0
          ? Math.round((totalEngagements / totalImpressions) * 10000) / 100
          : 0;
      const clickThroughRate =
        totalImpressions > 0
          ? Math.round((totalClicks / totalImpressions) * 10000) / 100
          : 0;
      const conversionRate =
        totalClicks > 0
          ? Math.round((totalConversions / totalClicks) * 10000) / 100
          : 0;

      // Get latest ROI
      const latestRoi =
        await this.repositories.campaign.findLatestRoi(campaignId);

      return ok({
        campaignId,
        campaignName: campaign.name,
        status: campaign.status,
        dateRange: {
          start: campaign.startDate,
          end: campaign.endDate,
        },
        summary: {
          totalReach,
          totalImpressions,
          totalEngagements,
          totalClicks,
          totalConversions,
          totalSpend,
          engagementRate,
          clickThroughRate,
          conversionRate,
        },
        latestRoi: latestRoi as unknown as RoiCalculation | null,
        creatorPerformance,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get performance dashboard", {
        campaignId,
        error: message,
      });
      return err(message, "PERFORMANCE_DASHBOARD_FAILED");
    }
  }
}
