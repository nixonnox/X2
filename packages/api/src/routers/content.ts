import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { verifyChannelAccess, verifyProjectAccess } from "./_helpers";

export const contentRouter = router({
  /** 채널의 콘텐츠 목록 (페이지네이션) */
  listByChannel: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        sortBy: z
          .enum(["publishedAt", "viewCount", "engagementRate", "commentCount"])
          .default("publishedAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyChannelAccess(ctx.db, ctx.userId, input.channelId);

      const where = { channelId: input.channelId };
      const [items, total] = await Promise.all([
        ctx.db.content.findMany({
          where,
          orderBy: { [input.sortBy]: input.sortOrder },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.content.count({ where }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /** 프로젝트의 전체 콘텐츠 (모든 채널) */
  listByProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const channels = await ctx.db.channel.findMany({
        where: { projectId: input.projectId, deletedAt: null },
        select: { id: true },
      });
      const channelIds = channels.map((c: any) => c.id);

      const where = { channelId: { in: channelIds } };
      const [items, total] = await Promise.all([
        ctx.db.content.findMany({
          where,
          include: {
            channel: { select: { id: true, name: true, platform: true } },
          },
          orderBy: { publishedAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.content.count({ where }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /** 콘텐츠 상세 조회 */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // 먼저 접근 권한 검증 (최소 데이터만 조회)
      const contentCheck = await ctx.db.content.findUnique({
        where: { id: input.id },
        select: { channel: { select: { projectId: true } } },
      });
      if (!contentCheck) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "콘텐츠를 찾을 수 없습니다.",
        });
      }
      await verifyProjectAccess(
        ctx.db,
        ctx.userId,
        contentCheck.channel.projectId,
      );

      // 권한 확인 후 전체 데이터 조회
      return ctx.db.content.findUnique({
        where: { id: input.id },
        include: {
          channel: {
            select: { id: true, name: true, platform: true, projectId: true },
          },
          metrics: { orderBy: { date: "desc" }, take: 30 },
          _count: { select: { comments: true } },
        },
      });
    }),

  /** 채널 상위 콘텐츠 (성과 기준) */
  topPerforming: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyChannelAccess(ctx.db, ctx.userId, input.channelId);
      return ctx.db.content.findMany({
        where: { channelId: input.channelId },
        orderBy: { viewCount: "desc" },
        take: input.limit,
      });
    }),
});
