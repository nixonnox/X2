import type { Repositories } from "../../repositories";
import type { DateRange } from "../../repositories/base.repository";
import { type ServiceResult, type Logger, ok, err } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UsageIncrements = {
  apiCalls?: number;
  aiTokensUsed?: number;
  channelSyncs?: number;
  reportsGenerated?: number;
  exportsCreated?: number;
};

export type UsageMetric = {
  id: string;
  workspaceId: string;
  date: Date;
  apiCalls: number;
  aiTokensUsed: number;
  channelSyncs: number;
  reportsGenerated: number;
  exportsCreated: number;
  createdAt: Date;
  updatedAt: Date;
};

export type UsageStatus = {
  workspaceId: string;
  today: UsagePeriodStatus;
  thisMonth: UsagePeriodStatus;
  warnings: UsageWarning[];
};

export type UsagePeriodStatus = {
  apiCalls: { used: number; limit: number; percent: number };
  aiTokens: { used: number; limit: number; percent: number };
  channelSyncs: { used: number; limit: number; percent: number };
  reports: { used: number; limit: number; percent: number };
};

export type UsageWarning = {
  metric: string;
  period: "daily" | "monthly";
  usedPercent: number;
  message: string;
};

const WARNING_THRESHOLD = 80; // Warn at 80% usage

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class UsageService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Record usage increment (called by various services).
   */
  async recordUsage(
    workspaceId: string,
    increments: UsageIncrements,
  ): Promise<ServiceResult<void>> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Upsert today's UsageMetric with increments
      await this.repositories.usage.upsertDailyUsage(workspaceId, today, {
        apiCallCount: increments.apiCalls ?? 0,
        aiTokensUsed: increments.aiTokensUsed ?? 0,
        channelCount: increments.channelSyncs ?? 0,
        reportCount: increments.reportsGenerated ?? 0,
        exportCount: increments.exportsCreated ?? 0,
      });

      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to record usage", {
        workspaceId,
        error: message,
      });
      return err(message, "USAGE_RECORD_FAILED");
    }
  }

  /**
   * Get current usage vs limits.
   */
  async getUsageStatus(
    workspaceId: string,
  ): Promise<ServiceResult<UsageStatus>> {
    try {
      // 1. Get today's usage
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayUsage =
        await this.repositories.usage.getTodayUsage(workspaceId);

      // 2. Get this month's cumulative usage
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59,
      );
      const monthlyUsages = await this.repositories.usage.findDailyUsage(
        workspaceId,
        { from: monthStart, to: monthEnd },
      );

      const monthlyCumulative = monthlyUsages.reduce(
        (
          acc: {
            apiCalls: number;
            aiTokensUsed: number;
            channelSyncs: number;
            reportsGenerated: number;
            exportsCreated: number;
          },
          u: any,
        ) => ({
          apiCalls: acc.apiCalls + u.apiCalls,
          aiTokensUsed: acc.aiTokensUsed + u.aiTokensUsed,
          channelSyncs: acc.channelSyncs + u.channelSyncs,
          reportsGenerated: acc.reportsGenerated + u.reportsGenerated,
          exportsCreated: acc.exportsCreated + u.exportsCreated,
        }),
        {
          apiCalls: 0,
          aiTokensUsed: 0,
          channelSyncs: 0,
          reportsGenerated: 0,
          exportsCreated: 0,
        },
      );

      // 3. Get workspace limits
      const workspace = await this.repositories.workspace.findById(workspaceId);
      if (!workspace) {
        return err("Workspace not found", "WORKSPACE_NOT_FOUND");
      }

      const dailyTokenLimit = workspace.maxAiTokensPerDay ?? 10_000;
      const monthlyReportLimit = workspace.maxReportsPerMonth ?? 5;
      // Use reasonable defaults for limits not stored on workspace
      const dailyApiLimit = 10_000;
      const dailySyncLimit = 100;

      // 4. Calculate percentages
      const todayApiCalls = todayUsage?.apiCallCount ?? 0;
      const todayTokens = todayUsage?.aiTokensUsed ?? 0;
      const todaySyncs = todayUsage?.channelCount ?? 0;
      const todayReports = todayUsage?.reportCount ?? 0;

      const calcPercent = (used: number, limit: number) =>
        limit > 0 ? Math.round((used / limit) * 10000) / 100 : 0;

      const todayStatus: UsagePeriodStatus = {
        apiCalls: {
          used: todayApiCalls,
          limit: dailyApiLimit,
          percent: calcPercent(todayApiCalls, dailyApiLimit),
        },
        aiTokens: {
          used: todayTokens,
          limit: dailyTokenLimit,
          percent: calcPercent(todayTokens, dailyTokenLimit),
        },
        channelSyncs: {
          used: todaySyncs,
          limit: dailySyncLimit,
          percent: calcPercent(todaySyncs, dailySyncLimit),
        },
        reports: {
          used: todayReports,
          limit: monthlyReportLimit,
          percent: calcPercent(todayReports, monthlyReportLimit),
        },
      };

      const monthStatus: UsagePeriodStatus = {
        apiCalls: {
          used: monthlyCumulative.apiCalls,
          limit: dailyApiLimit * 30,
          percent: calcPercent(monthlyCumulative.apiCalls, dailyApiLimit * 30),
        },
        aiTokens: {
          used: monthlyCumulative.aiTokensUsed,
          limit: dailyTokenLimit * 30,
          percent: calcPercent(
            monthlyCumulative.aiTokensUsed,
            dailyTokenLimit * 30,
          ),
        },
        channelSyncs: {
          used: monthlyCumulative.channelSyncs,
          limit: dailySyncLimit * 30,
          percent: calcPercent(
            monthlyCumulative.channelSyncs,
            dailySyncLimit * 30,
          ),
        },
        reports: {
          used: monthlyCumulative.reportsGenerated,
          limit: monthlyReportLimit,
          percent: calcPercent(
            monthlyCumulative.reportsGenerated,
            monthlyReportLimit,
          ),
        },
      };

      // 5. Flag warnings at 80% threshold
      const warnings: UsageWarning[] = [];

      if (todayStatus.aiTokens.percent >= WARNING_THRESHOLD) {
        warnings.push({
          metric: "aiTokens",
          period: "daily",
          usedPercent: todayStatus.aiTokens.percent,
          message: `AI token usage is at ${todayStatus.aiTokens.percent}% of daily limit.`,
        });
      }

      if (todayStatus.apiCalls.percent >= WARNING_THRESHOLD) {
        warnings.push({
          metric: "apiCalls",
          period: "daily",
          usedPercent: todayStatus.apiCalls.percent,
          message: `API call usage is at ${todayStatus.apiCalls.percent}% of daily limit.`,
        });
      }

      if (monthStatus.reports.percent >= WARNING_THRESHOLD) {
        warnings.push({
          metric: "reports",
          period: "monthly",
          usedPercent: monthStatus.reports.percent,
          message: `Report generation is at ${monthStatus.reports.percent}% of monthly limit.`,
        });
      }

      return ok({
        workspaceId,
        today: todayStatus,
        thisMonth: monthStatus,
        warnings,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get usage status", {
        workspaceId,
        error: message,
      });
      return err(message, "USAGE_STATUS_FAILED");
    }
  }

  /**
   * Get usage history for period.
   */
  async getUsageHistory(
    workspaceId: string,
    dateRange: DateRange,
  ): Promise<ServiceResult<UsageMetric[]>> {
    try {
      const usages = await this.repositories.usage.findDailyUsage(
        workspaceId,
        dateRange,
      );

      return ok(usages as unknown as UsageMetric[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get usage history", {
        workspaceId,
        error: message,
      });
      return err(message, "USAGE_HISTORY_FAILED");
    }
  }
}
