import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { verifyWorkspaceAccess } from "./_helpers";

export const automationRouter = router({
  /** 워크스페이스의 자동화 규칙 목록 */
  listRules: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyWorkspaceAccess(ctx.db, ctx.userId, input.workspaceId);

      // 자동화 기능 활성화 여부 확인
      const workspace = await ctx.db.workspace.findUnique({
        where: { id: input.workspaceId },
        select: { automationEnabled: true },
      });
      if (!workspace?.automationEnabled) {
        return { items: [], automationEnabled: false };
      }

      const items = await ctx.db.automationRule.findMany({
        where: { workspaceId: input.workspaceId },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { executions: true } },
        },
      });

      return { items, automationEnabled: true };
    }),

  /** 자동화 규칙 상세 (실행 기록 포함) */
  getRule: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // 먼저 접근 권한 검증
      const ruleCheck = await ctx.db.automationRule.findUnique({
        where: { id: input.id },
        select: { workspaceId: true },
      });
      if (!ruleCheck) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "자동화 규칙을 찾을 수 없습니다.",
        });
      }
      await verifyWorkspaceAccess(ctx.db, ctx.userId, ruleCheck.workspaceId);

      // 권한 확인 후 전체 데이터 조회
      return ctx.db.automationRule.findUnique({
        where: { id: input.id },
        include: {
          executions: {
            orderBy: { createdAt: "desc" },
            take: 20,
            include: {
              deliveries: true,
            },
          },
        },
      });
    }),

  /** 자동화 규칙 생성 */
  createRule: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        triggerType: z.enum([
          "SCHEDULED_CRON",
          "RISK_SPIKE",
          "SENTIMENT_SPIKE",
          "FAQ_SURGE",
          "KEYWORD_TREND_CHANGE",
          "CAMPAIGN_ANOMALY",
          "GEO_SCORE_CHANGE",
          "COLLECTION_FAILURE",
          "REPORT_READY",
          "ACTION_CREATED",
          "COLLECTION_COMPLETE",
          "ANALYSIS_COMPLETE",
          "CAMPAIGN_ENDED",
        ]),
        triggerCondition: z.record(
          z.string(),
          z.union([z.string(), z.number(), z.boolean()]),
        ),
        cronExpr: z.string().max(100).optional(),
        actionType: z.enum([
          "GENERATE_REPORT",
          "DELIVER_REPORT",
          "SEND_ALERT",
          "CREATE_ACTION",
          "ESCALATE_RISK",
          "UPDATE_FAQ_QUEUE",
          "RECOMMEND_GEO_FIX",
          "CAMPAIGN_FOLLOWUP",
          "NOTIFY_TEAM",
          "PAUSE_COLLECTION",
        ]),
        actionConfig: z.record(
          z.string(),
          z.union([z.string(), z.number(), z.boolean()]),
        ),
        cooldownMinutes: z.number().min(1).default(60),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyWorkspaceAccess(ctx.db, ctx.userId, input.workspaceId);

      // 자동화 기능 활성화 확인
      const workspace = await ctx.db.workspace.findUnique({
        where: { id: input.workspaceId },
        select: { automationEnabled: true, maxAutomationRulesPerMonth: true },
      });
      if (!workspace?.automationEnabled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "이 워크스페이스에서는 자동화 기능이 비활성화되어 있습니다.",
        });
      }

      return ctx.db.automationRule.create({
        data: {
          workspaceId: input.workspaceId,
          name: input.name,
          description: input.description,
          triggerType: input.triggerType,
          triggerCondition: input.triggerCondition,
          cronExpr: input.cronExpr,
          actionType: input.actionType,
          actionConfig: input.actionConfig,
          cooldownMinutes: input.cooldownMinutes,
        },
      });
    }),

  /** 규칙 활성화/비활성화 토글 */
  toggleRule: protectedProcedure
    .input(z.object({ id: z.string(), isEnabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.db.automationRule.findUnique({
        where: { id: input.id },
        select: { workspaceId: true },
      });
      if (!rule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "자동화 규칙을 찾을 수 없습니다.",
        });
      }
      await verifyWorkspaceAccess(ctx.db, ctx.userId, rule.workspaceId);

      return ctx.db.automationRule.update({
        where: { id: input.id },
        data: { isEnabled: input.isEnabled },
      });
    }),

  /** 규칙 삭제 */
  deleteRule: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.db.automationRule.findUnique({
        where: { id: input.id },
        select: { workspaceId: true },
      });
      if (!rule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "자동화 규칙을 찾을 수 없습니다.",
        });
      }
      await verifyWorkspaceAccess(ctx.db, ctx.userId, rule.workspaceId);
      await ctx.db.automationRule.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
