import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const usageRouter = router({
  /** 현재 사용량 vs 한도 (오늘 + 이번 달) */
  status: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59,
      );

      const [todayUsage, monthlyUsages, workspace] = await Promise.all([
        ctx.db.usageMetric.findFirst({
          where: { workspaceId: input.workspaceId, date: today },
        }),
        ctx.db.usageMetric.findMany({
          where: {
            workspaceId: input.workspaceId,
            date: { gte: monthStart, lte: monthEnd },
          },
        }),
        ctx.db.workspace.findUnique({
          where: { id: input.workspaceId },
          select: {
            maxAiTokensPerDay: true,
            maxReportsPerMonth: true,
            maxChannels: true,
            maxContentsPerMonth: true,
            maxCommentsPerMonth: true,
            canExportData: true,
            canAccessApi: true,
            plan: true,
          },
        }),
      ]);

      // Cumulative monthly
      const monthly = monthlyUsages.reduce(
        (acc, u) => ({
          apiCalls: acc.apiCalls + u.apiCallCount,
          aiTokens: acc.aiTokens + u.aiTokensUsed,
          channels: acc.channels + u.channelCount,
          contents: acc.contents + u.contentCount,
          comments: acc.comments + u.commentCount,
          reports: acc.reports + u.reportCount,
          exports: acc.exports + u.exportCount,
          aiCost: acc.aiCost + u.aiCostUsd,
        }),
        {
          apiCalls: 0,
          aiTokens: 0,
          channels: 0,
          contents: 0,
          comments: 0,
          reports: 0,
          exports: 0,
          aiCost: 0,
        },
      );

      const dailyApiLimit = 10_000;
      const dailyTokenLimit = workspace?.maxAiTokensPerDay ?? 5_000;
      const monthlyReportLimit = workspace?.maxReportsPerMonth ?? 3;
      const monthlyContentLimit = workspace?.maxContentsPerMonth ?? 500;
      const monthlyCommentLimit = workspace?.maxCommentsPerMonth ?? 1_000;
      const maxChannels = workspace?.maxChannels ?? 3;

      const pct = (used: number, limit: number) =>
        limit > 0 ? Math.round((used / limit) * 100) : 0;

      return {
        plan: workspace?.plan ?? "FREE",
        canExportData: workspace?.canExportData ?? false,
        canAccessApi: workspace?.canAccessApi ?? false,
        today: {
          apiCalls: {
            used: todayUsage?.apiCallCount ?? 0,
            limit: dailyApiLimit,
            percent: pct(todayUsage?.apiCallCount ?? 0, dailyApiLimit),
          },
          aiTokens: {
            used: todayUsage?.aiTokensUsed ?? 0,
            limit: dailyTokenLimit,
            percent: pct(todayUsage?.aiTokensUsed ?? 0, dailyTokenLimit),
          },
        },
        thisMonth: {
          apiCalls: {
            used: monthly.apiCalls,
            limit: dailyApiLimit * 30,
            percent: pct(monthly.apiCalls, dailyApiLimit * 30),
          },
          aiTokens: {
            used: monthly.aiTokens,
            limit: dailyTokenLimit * 30,
            percent: pct(monthly.aiTokens, dailyTokenLimit * 30),
          },
          contents: {
            used: monthly.contents,
            limit: monthlyContentLimit,
            percent: pct(monthly.contents, monthlyContentLimit),
          },
          comments: {
            used: monthly.comments,
            limit: monthlyCommentLimit,
            percent: pct(monthly.comments, monthlyCommentLimit),
          },
          reports: {
            used: monthly.reports,
            limit: monthlyReportLimit,
            percent: pct(monthly.reports, monthlyReportLimit),
          },
          exports: { used: monthly.exports },
          channels: {
            used: monthly.channels,
            limit: maxChannels,
            percent: pct(monthly.channels, maxChannels),
          },
          aiCost: Math.round(monthly.aiCost * 100) / 100,
        },
      };
    }),

  /** 일별 사용 내역 (최근 N일) */
  history: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        days: z.number().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const from = new Date();
      from.setDate(from.getDate() - input.days);
      from.setHours(0, 0, 0, 0);

      const metrics = await ctx.db.usageMetric.findMany({
        where: {
          workspaceId: input.workspaceId,
          date: { gte: from },
        },
        orderBy: { date: "asc" },
        select: {
          date: true,
          apiCallCount: true,
          aiTokensUsed: true,
          aiCostUsd: true,
          channelCount: true,
          contentCount: true,
          commentCount: true,
          reportCount: true,
          exportCount: true,
        },
      });

      return {
        days: metrics.map((m) => ({
          date: m.date.toISOString().split("T")[0],
          apiCalls: m.apiCallCount,
          aiTokens: m.aiTokensUsed,
          aiCost: Math.round(m.aiCostUsd * 100) / 100,
          channels: m.channelCount,
          contents: m.contentCount,
          comments: m.commentCount,
          reports: m.reportCount,
          exports: m.exportCount,
        })),
      };
    }),
});
