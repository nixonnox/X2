import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const notificationRouter = router({
  /** 내 알림 목록 */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(50).default(20),
        unreadOnly: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.userId };
      if (input.unreadOnly) where.isRead = false;

      const [items, total, unreadCount] = await Promise.all([
        ctx.db.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.notification.count({ where }),
        ctx.db.notification.count({
          where: { userId: ctx.userId, isRead: false },
        }),
      ]);

      return {
        items,
        total,
        unreadCount,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  /** 알림 읽음 처리 */
  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.notification.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { isRead: true, readAt: new Date() },
      });
      return { success: true };
    }),

  /** 전체 읽음 처리 */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.notification.updateMany({
      where: { userId: ctx.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }),

  /** 읽지 않은 알림 개수 */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.notification.count({
      where: { userId: ctx.userId, isRead: false },
    });
  }),
});
