import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { verifyProjectAccess, unwrapResult } from "./_helpers";
import type { MentionFilters } from "../services/listening/listening-analysis.service";

export const listeningRouter = router({
  /** 소셜 멘션 피드 */
  getMentionFeed: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        filters: z
          .object({
            platform: z.string().optional(),
            keyword: z.string().optional(),
            sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]).optional(),
            dateRange: z
              .object({
                from: z.string(),
                to: z.string(),
              })
              .optional(),
            pagination: z
              .object({
                page: z.number().default(1),
                pageSize: z.number().default(20),
              })
              .optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      // dateRange 문자열 → Date 변환
      const filters: MentionFilters | undefined = input.filters
        ? {
            ...input.filters,
            dateRange: input.filters.dateRange
              ? {
                  from: new Date(input.filters.dateRange.from),
                  to: new Date(input.filters.dateRange.to),
                }
              : undefined,
          }
        : undefined;

      const result = await ctx.services.listeningAnalysis.getMentionFeed(
        input.projectId,
        filters,
      );
      return unwrapResult(result);
    }),

  /** 키워드 성과 조회 */
  getKeywordPerformance: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        dateRange: z
          .object({
            from: z.string(),
            to: z.string(),
          })
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const dateRange = input.dateRange
        ? {
            from: new Date(input.dateRange.from),
            to: new Date(input.dateRange.to),
          }
        : undefined;

      const result = await ctx.services.listeningAnalysis.getKeywordPerformance(
        input.projectId,
        dateRange as any,
      );
      return unwrapResult(result);
    }),
});
