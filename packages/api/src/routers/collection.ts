import { randomUUID } from "node:crypto";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  verifyWorkspaceAccess,
  verifyChannelAccess,
  unwrapResult,
} from "./_helpers";

export const collectionRouter = router({
  /** 워크스페이스 전체 수집 트리거 */
  triggerWorkspace: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        jobType: z
          .enum(["CHANNEL_SYNC", "CONTENT_SYNC", "COMMENT_SYNC", "FULL_SYNC"])
          .default("CONTENT_SYNC"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyWorkspaceAccess(ctx.db, ctx.userId, input.workspaceId);
      const result = await ctx.services.collectionRunner.runWorkspaceCollection(
        input.workspaceId,
        input.jobType,
        {
          requestId: randomUUID(),
          userId: ctx.userId,
          workspaceId: input.workspaceId,
          source: "trpc",
        },
      );
      return unwrapResult(result);
    }),

  /** 단일 채널 수집 트리거 */
  triggerChannel: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        types: z
          .array(z.enum(["channel_info", "contents", "comments", "analytics"]))
          .default(["channel_info", "contents"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyChannelAccess(ctx.db, ctx.userId, input.channelId);
      const result = await ctx.services.collectionRunner.runSingleChannel(
        input.channelId,
        input.types,
        { requestId: randomUUID(), userId: ctx.userId, source: "trpc" },
      );
      return unwrapResult(result);
    }),

  /** 플랫폼 건강 상태 */
  healthStatus: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.collectionRunner.getHealthStatus();
  }),

  /** 최근 수집 로그 */
  recentLogs: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        platform: z.string().optional(),
        status: z.enum(["success", "partial", "failed"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyWorkspaceAccess(ctx.db, ctx.userId, input.workspaceId);
      return ctx.services.collectionRunner.getRecentLogs();
    }),
});
