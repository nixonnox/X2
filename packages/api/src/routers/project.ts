import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { verifyWorkspaceAccess, verifyProjectAccess } from "./_helpers";

export const projectRouter = router({
  /** 워크스페이스의 프로젝트 목록 */
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyWorkspaceAccess(ctx.db, ctx.userId, input.workspaceId);
      return ctx.db.project.findMany({
        where: { workspaceId: input.workspaceId },
        include: {
          _count: {
            select: { channels: true, keywords: true, campaigns: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  /** 프로젝트 상세 조회 */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.id);
      const project = await ctx.db.project.findUnique({
        where: { id: input.id },
        include: {
          workspace: true,
          channels: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
          },
          _count: {
            select: {
              channels: true,
              keywords: true,
              insightReports: true,
              campaigns: true,
            },
          },
        },
      });
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "프로젝트를 찾을 수 없습니다.",
        });
      }
      return project;
    }),

  /** 프로젝트 생성 */
  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyWorkspaceAccess(ctx.db, ctx.userId, input.workspaceId);
      return ctx.db.project.create({
        data: {
          workspaceId: input.workspaceId,
          name: input.name,
          description: input.description,
        },
      });
    }),

  /** 프로젝트 수정 */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.id);
      return ctx.db.project.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
        },
      });
    }),

  /** 프로젝트 삭제 */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.id);
      await ctx.db.project.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
