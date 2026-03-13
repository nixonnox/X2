import type {
  PrismaClient,
  UsageMetric,
  Subscription,
  Prisma,
} from "@prisma/client";
import { BaseRepository, type DateRange } from "./base.repository";

/**
 * Repository for UsageMetric and Subscription models.
 * Handles daily usage tracking and subscription management for billing.
 */
export class UsageRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Find daily usage metrics for a workspace within a date range.
   */
  async findDailyUsage(
    workspaceId: string,
    dateRange: DateRange,
  ): Promise<UsageMetric[]> {
    return this.prisma.usageMetric.findMany({
      where: {
        workspaceId,
        date: { gte: dateRange.from, lte: dateRange.to },
      },
      orderBy: { date: "asc" },
    });
  }

  /**
   * Upsert daily usage with incremental values (adds to existing counts).
   */
  async upsertDailyUsage(
    workspaceId: string,
    date: Date,
    increments: {
      channelCount?: number;
      contentCount?: number;
      commentCount?: number;
      apiCallCount?: number;
      aiTokensUsed?: number;
      aiCostUsd?: number;
      reportCount?: number;
      exportCount?: number;
    },
  ) {
    return this.prisma.usageMetric.upsert({
      where: { workspaceId_date: { workspaceId, date } },
      create: {
        date,
        workspace: { connect: { id: workspaceId } },
        channelCount: increments.channelCount ?? 0,
        contentCount: increments.contentCount ?? 0,
        commentCount: increments.commentCount ?? 0,
        apiCallCount: increments.apiCallCount ?? 0,
        aiTokensUsed: increments.aiTokensUsed ?? 0,
        aiCostUsd: increments.aiCostUsd ?? 0,
        reportCount: increments.reportCount ?? 0,
        exportCount: increments.exportCount ?? 0,
      },
      update: {
        ...(increments.channelCount !== undefined && {
          channelCount: { increment: increments.channelCount },
        }),
        ...(increments.contentCount !== undefined && {
          contentCount: { increment: increments.contentCount },
        }),
        ...(increments.commentCount !== undefined && {
          commentCount: { increment: increments.commentCount },
        }),
        ...(increments.apiCallCount !== undefined && {
          apiCallCount: { increment: increments.apiCallCount },
        }),
        ...(increments.aiTokensUsed !== undefined && {
          aiTokensUsed: { increment: increments.aiTokensUsed },
        }),
        ...(increments.aiCostUsd !== undefined && {
          aiCostUsd: { increment: increments.aiCostUsd },
        }),
        ...(increments.reportCount !== undefined && {
          reportCount: { increment: increments.reportCount },
        }),
        ...(increments.exportCount !== undefined && {
          exportCount: { increment: increments.exportCount },
        }),
      },
    });
  }

  /**
   * Get today's usage for real-time limit checking.
   */
  async getTodayUsage(workspaceId: string): Promise<UsageMetric | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.usageMetric.findUnique({
      where: { workspaceId_date: { workspaceId, date: today } },
    });
  }

  /**
   * Find the active subscription for a workspace.
   */
  async findSubscription(workspaceId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findFirst({
      where: { workspaceId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Update subscription details (e.g., after Stripe webhook).
   */
  async updateSubscription(
    workspaceId: string,
    data: Prisma.SubscriptionUpdateInput,
  ) {
    const subscription = await this.findSubscription(workspaceId);
    if (!subscription) {
      throw new Error(
        `No active subscription found for workspace ${workspaceId}`,
      );
    }
    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data,
    });
  }
}
