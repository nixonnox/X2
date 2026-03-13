import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { verifyChannelAccess, verifyProjectAccess } from "./_helpers";

export const commentRouter = router({
  /** 콘텐츠의 댓글 목록 (분석 포함) */
  listByContent: protectedProcedure
    .input(
      z.object({
        contentId: z.string(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        sentiment: z
          .enum(["POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // 콘텐츠 → 채널 → 프로젝트 접근 검증
      const content = await ctx.db.content.findUnique({
        where: { id: input.contentId },
        select: { channelId: true },
      });
      if (!content) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "콘텐츠를 찾을 수 없습니다.",
        });
      }
      await verifyChannelAccess(ctx.db, ctx.userId, content.channelId);

      const where: any = { contentId: input.contentId };
      if (input.sentiment) {
        where.analysis = { sentiment: input.sentiment };
      }

      const [items, total] = await Promise.all([
        ctx.db.comment.findMany({
          where,
          include: { analysis: true },
          orderBy: { publishedAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.comment.count({ where }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /** 프로젝트 전체 댓글 (최신순) */
  listByProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        sentiment: z
          .enum(["POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"])
          .optional(),
        isRisk: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      // 단일 쿼리로 프로젝트 소속 콘텐츠 ID 조회 (N+1 방지)
      const contentIds = (
        await ctx.db.content.findMany({
          where: {
            channel: { projectId: input.projectId, deletedAt: null },
          },
          select: { id: true },
        })
      ).map((c: any) => c.id);

      const where: any = { contentId: { in: contentIds } };
      if (input.sentiment || input.isRisk !== undefined) {
        where.analysis = {};
        if (input.sentiment) where.analysis.sentiment = input.sentiment;
        if (input.isRisk !== undefined) where.analysis.isRisk = input.isRisk;
      }

      const [items, total] = await Promise.all([
        ctx.db.comment.findMany({
          where,
          include: {
            analysis: true,
            content: { select: { id: true, title: true, channelId: true } },
          },
          orderBy: { publishedAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.comment.count({ where }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /** 댓글 감성 분포 통계 */
  sentimentStats: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const contentIds = (
        await ctx.db.content.findMany({
          where: {
            channel: { projectId: input.projectId, deletedAt: null },
          },
          select: { id: true },
        })
      ).map((c: any) => c.id);

      const stats = await ctx.db.commentAnalysis.groupBy({
        by: ["sentiment"],
        where: { comment: { contentId: { in: contentIds } } },
        _count: true,
      });

      return stats.map((s: any) => ({
        sentiment: s.sentiment,
        count: s._count,
      }));
    }),
});
