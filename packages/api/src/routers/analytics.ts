import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  verifyChannelAccess,
  verifyProjectAccess,
  unwrapResult,
} from "./_helpers";

export const analyticsRouter = router({
  /** 채널 개요 (메트릭 + 트렌드 + 상위 콘텐츠) */
  channelOverview: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyChannelAccess(ctx.db, ctx.userId, input.channelId);
      const result = await ctx.services.channelAnalysis.getChannelOverview(
        input.channelId,
      );
      return unwrapResult(result);
    }),

  /** 채널 비교 */
  compareChannels: protectedProcedure
    .input(
      z.object({
        channelIds: z.array(z.string()).min(1).max(20),
        from: z.string().transform((s) => new Date(s)),
        to: z.string().transform((s) => new Date(s)),
      }),
    )
    .query(async ({ ctx, input }) => {
      // 모든 채널 접근 검증
      await Promise.all(
        input.channelIds.map((id) =>
          verifyChannelAccess(ctx.db, ctx.userId, id),
        ),
      );
      const result = await ctx.services.channelAnalysis.compareChannels(
        input.channelIds,
        { from: input.from, to: input.to },
      );
      return unwrapResult(result);
    }),

  /** 채널 스냅샷 히스토리 */
  channelSnapshots: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        days: z.number().min(1).max(365).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyChannelAccess(ctx.db, ctx.userId, input.channelId);

      const from = new Date();
      from.setDate(from.getDate() - input.days);

      return ctx.db.channelSnapshot.findMany({
        where: {
          channelId: input.channelId,
          date: { gte: from },
        },
        orderBy: { date: "asc" },
      });
    }),

  /** 프로젝트 대시보드 요약 */
  dashboardSummary: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const channels = await ctx.db.channel.findMany({
        where: { projectId: input.projectId, deletedAt: null },
        include: {
          snapshots: { orderBy: { date: "desc" }, take: 1 },
          _count: { select: { contents: true } },
        },
      });

      const channelIds = channels.map((c: any) => c.id);

      const [totalContents, totalComments, recentContents] = await Promise.all([
        ctx.db.content.count({ where: { channelId: { in: channelIds } } }),
        ctx.db.comment.count({
          where: { content: { channelId: { in: channelIds } } },
        }),
        ctx.db.content.findMany({
          where: { channelId: { in: channelIds } },
          orderBy: { publishedAt: "desc" },
          take: 5,
          include: { channel: { select: { name: true, platform: true } } },
        }),
      ]);

      const totalSubscribers = channels.reduce(
        (sum: number, ch: any) => sum + ch.subscriberCount,
        0,
      );

      return {
        channels: channels.map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          platform: ch.platform,
          subscriberCount: ch.subscriberCount,
          contentCount: ch._count.contents,
          lastSnapshot: ch.snapshots[0] ?? null,
        })),
        totals: {
          channelCount: channels.length,
          totalSubscribers,
          totalContents,
          totalComments,
        },
        recentContents,
      };
    }),
});
