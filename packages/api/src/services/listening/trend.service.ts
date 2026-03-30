import type { Repositories } from "../../repositories";
import type { DateRange } from "../../repositories/base.repository";
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

export type TrendKeywordAnalytics = {
  id: string;
  projectId: string;
  keyword: string;
  locale: string;
  period: string;
  avgSearchVolume: number | null;
  peakSearchVolume: number | null;
  searchTrend: "RISING" | "STABLE" | "DECLINING";
  seasonalityScore: number | null;
  socialContentCount: number;
  socialAvgViews: number | null;
  socialAvgEngagement: number | null;
  gapScore: number | null;
  relatedKeywords: unknown;
  topContents: unknown;
  createdAt: Date;
};

export type TrendOverview = {
  projectId: string;
  dateRange: DateRange;
  risingKeywords: TrendKeywordEntry[];
  decliningKeywords: TrendKeywordEntry[];
  stableKeywords: TrendKeywordEntry[];
  totalKeywordsTracked: number;
  volumeChange: {
    totalCurrentPeriod: number;
    totalPreviousPeriod: number;
    changePercent: number;
  };
};

export type TrendKeywordEntry = {
  keyword: string;
  searchTrend: "RISING" | "STABLE" | "DECLINING";
  avgSearchVolume: number | null;
  socialContentCount: number;
  gapScore: number | null;
  changeRate: number;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class TrendService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Generate daily trend analytics for a project.
   * Aggregates keyword metrics and social mention data for a specific date.
   */
  async generateDailyTrend(
    projectId: string,
    date: Date,
    trace: TraceContext,
  ): Promise<ServiceResult<TrendKeywordAnalytics>> {
    try {
      // 1. Get active keywords for the project
      const keywords = await this.repositories.keyword.findByProject(
        projectId,
        "ACTIVE" as any,
      );

      if (keywords.length === 0) {
        return err("No active keywords found in project", "NO_ACTIVE_KEYWORDS");
      }

      // Format period (monthly)
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      const analyticsRecords: TrendKeywordAnalytics[] = [];

      for (const keyword of keywords) {
        // 2. Aggregate keyword metrics for the date
        const dateRange: DateRange = {
          from: new Date(date.getFullYear(), date.getMonth(), 1),
          to: new Date(date.getFullYear(), date.getMonth() + 1, 0),
        };

        const metrics = await this.repositories.keyword.findMetrics(
          keyword.id,
          dateRange,
        );

        const avgSearchVolume =
          metrics.length > 0
            ? Math.round(
                metrics.reduce(
                  (sum: number, m: { volume: number }) => sum + m.volume,
                  0,
                ) / metrics.length,
              )
            : null;

        const peakSearchVolume =
          metrics.length > 0
            ? Math.max(...metrics.map((m: { volume: number }) => m.volume))
            : null;

        // 3. Aggregate mention counts by keyword
        const mentionResult = await this.repositories.mention.findByProject(
          projectId,
          undefined,
          { keyword: keyword.keyword, dateRange },
        );
        const mentionStats = {
          totalMentions: mentionResult.total,
          avgEngagement:
            mentionResult.data.length > 0
              ? mentionResult.data.reduce(
                  (sum: number, m: any) => sum + (m.engagementCount ?? 0),
                  0,
                ) / mentionResult.data.length
              : 0,
        };

        // Calculate trend direction
        let searchTrend: "RISING" | "STABLE" | "DECLINING" = "STABLE";
        if (metrics.length >= 2) {
          const mid = Math.floor(metrics.length / 2);
          const firstHalf =
            metrics
              .slice(0, mid)
              .reduce(
                (sum: number, m: { volume: number }) => sum + m.volume,
                0,
              ) / mid;
          const secondHalf =
            metrics
              .slice(mid)
              .reduce(
                (sum: number, m: { volume: number }) => sum + m.volume,
                0,
              ) /
            (metrics.length - mid);
          const change =
            firstHalf > 0 ? (secondHalf - firstHalf) / firstHalf : 0;
          searchTrend =
            change > 0.1 ? "RISING" : change < -0.1 ? "DECLINING" : "STABLE";
        }

        // Calculate gap score (search volume vs social coverage)
        let gapScore: number | null = null;
        if (avgSearchVolume !== null && avgSearchVolume > 0) {
          const socialCoverage =
            mentionStats.totalMentions > 0
              ? mentionStats.totalMentions / avgSearchVolume
              : 0;
          // Gap score: higher = more opportunity (high search volume, low social coverage)
          gapScore = Math.round((1 - Math.min(socialCoverage, 1)) * 100) / 100;
        }

        // 4. Upsert TrendKeywordAnalytics record
        const record = await this.repositories.trendAnalytics.upsert(
          projectId,
          keyword.keyword,
          "ko",
          period,
          {
            avgSearchVolume,
            peakSearchVolume,
            searchTrend,
            seasonalityScore: null, // TODO: [INTEGRATION] @x2/ai -- Calculate seasonality from historical data
            socialContentCount: mentionStats.totalMentions,
            socialAvgViews: null, // TODO: Aggregate from mention view counts
            socialAvgEngagement: mentionStats.avgEngagement || null,
            gapScore,
            relatedKeywords:
              metrics.length > 0
                ? (metrics[metrics.length - 1]?.relatedTerms ?? undefined)
                : undefined,
            topContents: undefined, // TODO: Fetch top performing content for keyword
          },
        );

        analyticsRecords.push(record as TrendKeywordAnalytics);
      }

      // 5. Log results
      this.logger.info("Trend analytics generated", {
        projectId,
        date: date.toISOString(),
        keywordCount: analyticsRecords.length,
        period,
        requestId: trace.requestId,
      });

      // Return the first record as representative (caller typically gets all via getTrendOverview)
      if (analyticsRecords.length > 0) {
        return ok(analyticsRecords[0]!);
      }

      return err("No analytics records generated", "NO_RECORDS_GENERATED");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to generate daily trend", {
        projectId,
        date: date.toISOString(),
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "TREND_GENERATION_FAILED");
    }
  }

  /**
   * Get trend overview for a project within a date range.
   */
  async getTrendOverview(
    projectId: string,
    dateRange: DateRange,
  ): Promise<ServiceResult<TrendOverview>> {
    try {
      // Fetch trend analytics records for the date range
      const records = await this.repositories.trendAnalytics.findByProject(
        projectId,
        dateRange,
      );

      if (records.length === 0) {
        return ok({
          projectId,
          dateRange,
          risingKeywords: [],
          decliningKeywords: [],
          stableKeywords: [],
          totalKeywordsTracked: 0,
          volumeChange: {
            totalCurrentPeriod: 0,
            totalPreviousPeriod: 0,
            changePercent: 0,
          },
        });
      }

      // Group by keyword (latest record per keyword)
      const latestByKeyword = new Map<string, (typeof records)[number]>();
      for (const record of records) {
        const existing = latestByKeyword.get(record.keyword);
        if (!existing || record.createdAt > existing.createdAt) {
          latestByKeyword.set(record.keyword, record);
        }
      }

      const risingKeywords: TrendKeywordEntry[] = [];
      const decliningKeywords: TrendKeywordEntry[] = [];
      const stableKeywords: TrendKeywordEntry[] = [];

      for (const [keyword, record] of latestByKeyword) {
        const entry: TrendKeywordEntry = {
          keyword,
          searchTrend: record.searchTrend as "RISING" | "STABLE" | "DECLINING",
          avgSearchVolume: record.avgSearchVolume,
          socialContentCount: record.socialContentCount,
          gapScore: record.gapScore,
          changeRate: 0, // Calculated below if previous period data exists
        };

        // Calculate change rate from keyword metrics
        const allKeywords =
          await this.repositories.keyword.findByProject(projectId);
        const keywordObj = allKeywords.find((k) => k.keyword === keyword);
        if (keywordObj) {
          const metrics = await this.repositories.keyword.findMetrics(
            keywordObj.id,
            dateRange,
          );
          if (metrics.length >= 2) {
            const first = metrics[0]!.volume;
            const last = metrics[metrics.length - 1]!.volume;
            entry.changeRate =
              first > 0
                ? Math.round(((last - first) / first) * 10000) / 100
                : 0;
          }
        }

        switch (entry.searchTrend) {
          case "RISING":
            risingKeywords.push(entry);
            break;
          case "DECLINING":
            decliningKeywords.push(entry);
            break;
          default:
            stableKeywords.push(entry);
        }
      }

      // Sort by change rate
      risingKeywords.sort((a, b) => b.changeRate - a.changeRate);
      decliningKeywords.sort((a, b) => a.changeRate - b.changeRate);

      // Calculate volume change
      const totalCurrentVolume = [...latestByKeyword.values()].reduce(
        (sum, r) => sum + (r.avgSearchVolume ?? 0),
        0,
      );

      // TODO: Compare with previous period volume for accurate changePercent
      const volumeChange = {
        totalCurrentPeriod: totalCurrentVolume,
        totalPreviousPeriod: 0,
        changePercent: 0,
      };

      return ok({
        projectId,
        dateRange,
        risingKeywords,
        decliningKeywords,
        stableKeywords,
        totalKeywordsTracked: latestByKeyword.size,
        volumeChange,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get trend overview", {
        projectId,
        error: message,
      });
      return err(message, "TREND_OVERVIEW_FAILED");
    }
  }
}
