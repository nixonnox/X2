import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { verifyProjectAccess } from "./_helpers";

export const competitorRouter = router({
  /** 프로젝트의 경쟁 채널 목록 */
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);
      return ctx.db.competitorChannel.findMany({
        where: { projectId: input.projectId },
        orderBy: { subscriberCount: "desc" },
      });
    }),

  /** 경쟁 채널 추가 */
  add: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        platform: z.string(),
        platformChannelId: z.string(),
        name: z.string(),
        url: z.string().url(),
        thumbnailUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const existing = await ctx.db.competitorChannel.findFirst({
        where: {
          projectId: input.projectId,
          platform: input.platform as any,
          platformChannelId: input.platformChannelId,
        },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "이미 등록된 경쟁 채널입니다.",
        });
      }

      return ctx.db.competitorChannel.create({
        data: {
          projectId: input.projectId,
          platform: input.platform as any,
          platformChannelId: input.platformChannelId,
          name: input.name,
          url: input.url,
          thumbnailUrl: input.thumbnailUrl,
        },
      });
    }),

  /** 경쟁 채널 삭제 */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const competitor = await ctx.db.competitorChannel.findUnique({
        where: { id: input.id },
        select: { projectId: true },
      });
      if (!competitor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "경쟁 채널을 찾을 수 없습니다.",
        });
      }
      await verifyProjectAccess(ctx.db, ctx.userId, competitor.projectId);
      await ctx.db.competitorChannel.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /** 내 채널 vs 경쟁 채널 비교 */
  compare: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const [ownChannels, competitors] = await Promise.all([
        ctx.db.channel.findMany({
          where: { projectId: input.projectId, deletedAt: null },
          select: {
            id: true,
            name: true,
            platform: true,
            subscriberCount: true,
            contentCount: true,
            thumbnailUrl: true,
          },
        }),
        ctx.db.competitorChannel.findMany({
          where: { projectId: input.projectId },
          select: {
            id: true,
            name: true,
            platform: true,
            subscriberCount: true,
            contentCount: true,
            engagementRate: true,
            thumbnailUrl: true,
          },
        }),
      ]);

      return { ownChannels, competitors };
    }),
});
