import { randomUUID } from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import { verifyProjectAccess } from "./_helpers";

export const reportRouter = router({
  /** 프로젝트의 리포트 목록 */
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(50).default(10),
        type: z.string().optional(),
        status: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const where: any = { projectId: input.projectId };
      if (input.type) where.type = input.type;
      if (input.status) where.status = input.status;

      const [items, total] = await Promise.all([
        ctx.db.insightReport.findMany({
          where,
          include: {
            user: { select: { id: true, name: true } },
            _count: { select: { actions: true, sections: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.insightReport.count({ where }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /** 리포트 상세 조회 */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // 먼저 접근 권한 검증
      const reportCheck = await ctx.db.insightReport.findUnique({
        where: { id: input.id },
        select: { projectId: true },
      });
      if (!reportCheck) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "리포트를 찾을 수 없습니다.",
        });
      }
      await verifyProjectAccess(ctx.db, ctx.userId, reportCheck.projectId);

      // 권한 확인 후 전체 데이터 조회
      return ctx.db.insightReport.findUnique({
        where: { id: input.id },
        include: {
          user: { select: { id: true, name: true } },
          actions: { orderBy: { priority: "asc" } },
          sections: { orderBy: { createdAt: "asc" } },
          project: { select: { id: true, name: true, workspaceId: true } },
        },
      });
    }),

  /** 공유 리포트 조회 (토큰 기반, 인증 불필요) */
  getShared: publicProcedure
    .input(z.object({ shareToken: z.string().min(36).max(36) }))
    .query(async ({ ctx, input }) => {
      const report = await ctx.db.insightReport.findUnique({
        where: { shareToken: input.shareToken },
        include: {
          sections: { orderBy: { createdAt: "asc" } },
          project: { select: { name: true } },
        },
      });
      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "리포트를 찾을 수 없습니다.",
        });
      }
      // 공유 토큰 만료 검사: 생성 후 30일 초과 시 만료 처리
      const tokenAge = Date.now() - new Date(report.updatedAt).getTime();
      const MAX_TOKEN_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
      if (tokenAge > MAX_TOKEN_AGE_MS) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "공유 링크가 만료되었습니다.",
        });
      }
      // PUBLISHED 상태만 공유 허용
      if (report.status !== "PUBLISHED") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "리포트를 찾을 수 없습니다.",
        });
      }
      return report;
    }),

  /** 리포트 생성 */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        type: z.enum([
          "SHORT_TERM",
          "MID_TERM",
          "LONG_TERM",
          "WEEKLY_REPORT",
          "MONTHLY_REPORT",
          "CAMPAIGN_REPORT",
          "COMPETITOR_REPORT",
          "INTENT_REPORT",
          "AEO_REPORT",
          "FAQ_EXTRACTION",
          "RISK_REPORT",
          "FAQ_REPORT",
        ]),
        title: z.string().min(1).max(200),
        summary: z.string().max(1000).default(""),
        period: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);
      return ctx.db.insightReport.create({
        data: {
          projectId: input.projectId,
          type: input.type,
          title: input.title,
          summary: input.summary,
          content: {},
          period: input.period,
          generatedBy: ctx.userId,
          status: "DRAFT",
        },
      });
    }),

  /** 리포트 상태 변경 */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.insightReport.findUnique({
        where: { id: input.id },
        select: { projectId: true },
      });
      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "리포트를 찾을 수 없습니다.",
        });
      }
      await verifyProjectAccess(ctx.db, ctx.userId, report.projectId);
      return ctx.db.insightReport.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  /** 공유 토큰 생성 */
  generateShareToken: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.insightReport.findUnique({
        where: { id: input.id },
        select: { projectId: true },
      });
      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "리포트를 찾을 수 없습니다.",
        });
      }
      await verifyProjectAccess(ctx.db, ctx.userId, report.projectId);

      const token = randomUUID();
      await ctx.db.insightReport.update({
        where: { id: input.id },
        data: { shareToken: token },
      });
      return { shareToken: token };
    }),
});
