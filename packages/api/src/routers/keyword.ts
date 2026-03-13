import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { verifyProjectAccess } from "./_helpers";

export const keywordRouter = router({
  /** 프로젝트의 키워드 목록 */
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);
      return ctx.db.keyword.findMany({
        where: { projectId: input.projectId },
        include: {
          metrics: { orderBy: { date: "desc" }, take: 7 },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  /** 키워드 추가 */
  add: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        keyword: z.string().min(1).max(100),
        category: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const existing = await ctx.db.keyword.findFirst({
        where: { projectId: input.projectId, keyword: input.keyword },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "이미 등록된 키워드입니다.",
        });
      }

      return ctx.db.keyword.create({
        data: {
          projectId: input.projectId,
          keyword: input.keyword,
          category: input.category,
        },
      });
    }),

  /** 키워드 삭제 */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const keyword = await ctx.db.keyword.findUnique({
        where: { id: input.id },
        select: { projectId: true },
      });
      if (!keyword) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "키워드를 찾을 수 없습니다.",
        });
      }
      await verifyProjectAccess(ctx.db, ctx.userId, keyword.projectId);
      await ctx.db.keyword.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /** 키워드 트렌드 데이터 */
  trends: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        days: z.number().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const from = new Date();
      from.setDate(from.getDate() - input.days);

      const keywords = await ctx.db.keyword.findMany({
        where: { projectId: input.projectId, status: "ACTIVE" },
        include: {
          metrics: {
            where: { date: { gte: from } },
            orderBy: { date: "asc" },
          },
        },
      });

      return keywords.map((kw: any) => ({
        id: kw.id,
        keyword: kw.keyword,
        category: kw.category,
        metrics: kw.metrics,
      }));
    }),
});
