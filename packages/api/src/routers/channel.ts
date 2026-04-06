import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { verifyProjectAccess, verifyChannelAccess } from "./_helpers";
import { YouTubeProvider } from "@x2/social";

const youtube = new YouTubeProvider();

// URL에서 platformChannelId 추출
function extractChannelId(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const path = u.pathname.replace(/\/$/, "");
    const segments = path.split("/").filter(Boolean);
    const last = segments[segments.length - 1] ?? "";
    return last || u.hostname;
  } catch {
    return url;
  }
}

// 플랫폼 문자열 → DB enum 매핑
function toPlatformEnum(code: string): string {
  const map: Record<string, string> = {
    youtube: "YOUTUBE",
    instagram: "INSTAGRAM",
    tiktok: "TIKTOK",
    x: "X",
    naver_blog: "NAVER_BLOG",
  };
  return map[code] ?? "YOUTUBE";
}

export const channelRouter = router({
  /** 프로젝트의 채널 목록 조회 */
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);
      return ctx.db.channel.findMany({
        where: { projectId: input.projectId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
    }),

  /** 채널 상세 조회 (스냅샷 포함) */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyChannelAccess(ctx.db, ctx.userId, input.id);
      const channel = await ctx.db.channel.findUnique({
        where: { id: input.id },
        include: {
          project: { include: { workspace: true } },
          snapshots: {
            orderBy: { date: "desc" },
            take: 30,
          },
        },
      });
      if (!channel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "채널을 찾을 수 없습니다.",
        });
      }
      return channel;
    }),

  /** 모든 플랫폼 채널 등록 (DB 직접 저장) */
  register: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        url: z.string(),
        name: z.string().min(1),
        platformCode: z.string(),
        channelType: z
          .enum(["owned", "competitor", "monitoring"])
          .default("owned"),
        country: z.string().default("KR"),
        category: z.string().default("기타"),
        tags: z.array(z.string()).default([]),
        analysisMode: z.string().default("url_basic"),
        customPlatformName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const normalizedUrl = input.url.startsWith("http")
        ? input.url
        : `https://${input.url}`;

      const platform = toPlatformEnum(input.platformCode) as any;
      const platformChannelId = extractChannelId(normalizedUrl);

      // 중복 확인
      const existing = await ctx.db.channel.findFirst({
        where: {
          projectId: input.projectId,
          url: normalizedUrl,
          deletedAt: null,
        },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "이미 등록된 채널 URL입니다.",
        });
      }

      const channelTypeMap: Record<string, any> = {
        owned: "OWNED",
        competitor: "COMPETITOR",
        monitoring: "MONITORING",
      };

      const channel = await ctx.db.channel.create({
        data: {
          projectId: input.projectId,
          platform,
          platformChannelId,
          name: input.name,
          url: normalizedUrl,
          channelType: channelTypeMap[input.channelType] ?? "OWNED",
          connectionType: "BASIC",
          status: "ACTIVE",
        },
      });

      return { success: true, channel };
    }),

  /** YouTube 채널 API 연동 등록 */
  add: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        url: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const url = new URL(input.url);
      let channelId: string | null = null;
      if (url.pathname.startsWith("/channel/")) {
        channelId = url.pathname.split("/channel/")[1]?.split("/")[0] ?? null;
      } else if (url.pathname.startsWith("/@")) {
        channelId = url.pathname.split("/")[1] ?? null;
      }
      if (!channelId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "유효한 YouTube 채널 URL이 아닙니다.",
        });
      }

      const info = await youtube.getChannelInfo(channelId);

      const existing = await ctx.db.channel.findFirst({
        where: {
          projectId: input.projectId,
          platform: "YOUTUBE",
          platformChannelId: info.platformChannelId,
        },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "이미 등록된 채널입니다.",
        });
      }

      return ctx.db.channel.create({
        data: {
          projectId: input.projectId,
          platform: "YOUTUBE",
          platformChannelId: info.platformChannelId,
          name: info.name,
          url: info.url,
          thumbnailUrl: info.thumbnailUrl,
          subscriberCount: info.subscriberCount ?? 0,
          contentCount: info.contentCount ?? 0,
          lastSyncedAt: new Date(),
        },
      });
    }),

  /** 채널 삭제 (soft delete) */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyChannelAccess(ctx.db, ctx.userId, input.id);
      await ctx.db.channel.update({
        where: { id: input.id },
        data: { deletedAt: new Date(), status: "PAUSED" },
      });
      return { success: true };
    }),
});
