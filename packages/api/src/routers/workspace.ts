import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { verifyWorkspaceAccess } from "./_helpers";

export const workspaceRouter = router({
  /** 현재 사용자의 워크스페이스 목록 */
  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.workspaceMember.findMany({
      where: { userId: ctx.userId },
      include: {
        workspace: {
          include: {
            _count: { select: { members: true, projects: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });
    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
      memberCount: m.workspace._count.members,
      projectCount: m.workspace._count.projects,
    }));
  }),

  /** 워크스페이스 상세 조회 */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyWorkspaceAccess(ctx.db, ctx.userId, input.id);
      const workspace = await ctx.db.workspace.findUnique({
        where: { id: input.id },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          projects: { orderBy: { createdAt: "desc" } },
          _count: { select: { members: true, projects: true } },
        },
      });
      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "워크스페이스를 찾을 수 없습니다.",
        });
      }
      return workspace;
    }),

  /** 워크스페이스 생성 */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        slug: z
          .string()
          .min(1)
          .max(50)
          .regex(/^[a-z0-9-]+$/),
        industryType: z
          .enum([
            "BEAUTY",
            "FOOD_BEVERAGE",
            "FASHION",
            "TECH_SAAS",
            "TRAVEL",
            "FINANCE",
            "GAMING",
            "EDUCATION",
            "HEALTHCARE",
            "OTHER",
          ])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // slug 중복 확인
      const existing = await ctx.db.workspace.findUnique({
        where: { slug: input.slug },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "이미 사용 중인 슬러그입니다.",
        });
      }

      return ctx.db.workspace.create({
        data: {
          name: input.name,
          slug: input.slug,
          industryType: input.industryType,
          members: {
            create: { userId: ctx.userId, role: "OWNER" },
          },
        },
        include: { members: true },
      });
    }),

  /** 워크스페이스 수정 */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        industryType: z
          .enum([
            "BEAUTY",
            "FOOD_BEVERAGE",
            "FASHION",
            "TECH_SAAS",
            "TRAVEL",
            "FINANCE",
            "GAMING",
            "EDUCATION",
            "HEALTHCARE",
            "OTHER",
          ])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyWorkspaceAccess(ctx.db, ctx.userId, input.id);
      return ctx.db.workspace.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.industryType && { industryType: input.industryType }),
        },
      });
    }),

  /** 멤버 초대 */
  inviteMember: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        email: z.string().email(),
        role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyWorkspaceAccess(ctx.db, ctx.userId, input.workspaceId);

      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
      });
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "해당 이메일의 사용자를 찾을 수 없습니다.",
        });
      }

      const existing = await ctx.db.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: input.workspaceId,
          },
        },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "이미 멤버입니다." });
      }

      return ctx.db.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: input.workspaceId,
          role: input.role,
        },
      });
    }),
});
