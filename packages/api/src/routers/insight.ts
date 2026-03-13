import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { verifyProjectAccess } from "./_helpers";

export const insightRouter = router({
  /** 프로젝트의 액션 아이템 목록 */
  listActions: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        status: z
          .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "DISMISSED"])
          .optional(),
        priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const where: any = { report: { projectId: input.projectId } };
      if (input.status) where.status = input.status;
      if (input.priority) where.priority = input.priority;

      const [items, total] = await Promise.all([
        ctx.db.insightAction.findMany({
          where,
          include: {
            report: { select: { id: true, title: true, type: true } },
          },
          orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.insightAction.count({ where }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /** 액션 상태 업데이트 */
  updateAction: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "DISMISSED"]),
        outcome: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const action = await ctx.db.insightAction.findUnique({
        where: { id: input.id },
        include: { report: { select: { projectId: true } } },
      });
      if (!action) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "액션을 찾을 수 없습니다.",
        });
      }
      if (!action.report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "연결된 리포트를 찾을 수 없습니다.",
        });
      }
      await verifyProjectAccess(ctx.db, ctx.userId, action.report.projectId);

      return ctx.db.insightAction.update({
        where: { id: input.id },
        data: {
          status: input.status,
          outcome: input.outcome,
          completedAt: input.status === "COMPLETED" ? new Date() : undefined,
        },
      });
    }),

  /** FAQ 후보 목록 */
  listFAQ: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const where = { projectId: input.projectId };
      const [items, total] = await Promise.all([
        ctx.db.fAQCandidate.findMany({
          where,
          orderBy: { mentionCount: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.fAQCandidate.count({ where }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /** 리스크 시그널 목록 */
  listRiskSignals: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const where: any = { projectId: input.projectId };
      if (input.severity) where.severity = input.severity;

      const [items, total] = await Promise.all([
        ctx.db.riskSignal.findMany({
          where,
          orderBy: { detectedAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.riskSignal.count({ where }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),
});
