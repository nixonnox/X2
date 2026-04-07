import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { verifyProjectAccess, verifyChannelAccess } from "./_helpers";
import { YouTubeProvider, fetchInstagramPublicProfile } from "@x2/social";

const youtube = new YouTubeProvider();

// URL에서 platformChannelId 추출 (register용)
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

// 플랫폼 코드 → DB SocialPlatform enum 매핑
function toPlatformEnum(
  code: string,
): "YOUTUBE" | "INSTAGRAM" | "TIKTOK" | "X" | "NAVER_BLOG" {
  const map: Record<
    string,
    "YOUTUBE" | "INSTAGRAM" | "TIKTOK" | "X" | "NAVER_BLOG"
  > = {
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

  /** 채널 URL로 채널 추가 (플랫폼 자동 감지) */
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
      const hostname = url.hostname.replace("www.", "");

      // 플랫폼 자동 감지
      let platform: "YOUTUBE" | "INSTAGRAM" | "TIKTOK" | "X" | "NAVER_BLOG" =
        "NAVER_BLOG";
      let platformChannelId =
        url.pathname.replace(/^\//, "").replace(/\/$/, "") || hostname;
      let channelName = platformChannelId;

      if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
        platform = "YOUTUBE";
        if (url.pathname.startsWith("/channel/")) {
          platformChannelId =
            url.pathname.split("/channel/")[1]?.split("/")[0] ?? "";
        } else if (url.pathname.startsWith("/@")) {
          platformChannelId = url.pathname.split("/")[1] ?? "";
        }
        channelName = platformChannelId;

        // YouTube API로 채널 정보 조회 시도
        try {
          const info = await youtube.getChannelInfo(platformChannelId);
          platformChannelId = info.platformChannelId;
          channelName = info.name;

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
        } catch {
          // API 실패 시 기본 정보로 등록
        }
      } else if (hostname.includes("instagram.com")) {
        platform = "INSTAGRAM";
        platformChannelId =
          url.pathname.replace(/^\//, "").replace(/\/$/, "").split("/")[0] ??
          "";
        channelName = `@${platformChannelId}`;
      } else if (hostname.includes("tiktok.com")) {
        platform = "TIKTOK";
        platformChannelId =
          url.pathname.replace(/^\//, "").replace(/\/$/, "").split("/")[0] ??
          "";
        channelName = platformChannelId;
      } else if (
        hostname.includes("x.com") ||
        hostname.includes("twitter.com")
      ) {
        platform = "X";
        platformChannelId =
          url.pathname.replace(/^\//, "").replace(/\/$/, "").split("/")[0] ??
          "";
        channelName = `@${platformChannelId}`;
      }

      if (!platformChannelId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "채널 ID를 URL에서 추출할 수 없습니다.",
        });
      }

      // 중복 확인
      const existing = await ctx.db.channel.findFirst({
        where: {
          projectId: input.projectId,
          platform,
          platformChannelId,
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
          platform,
          platformChannelId,
          name: channelName,
          url: input.url,
          lastSyncedAt: new Date(),
        },
      });
    }),

  /** 모든 플랫폼 채널 등록 (사용자 입력 신뢰, 풍부한 폼 지원) */
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
        // P0-7: 클라이언트(브라우저, 주거용 IP)에서 미리 fetch한 메트릭.
        // Vercel iad1 IP가 Instagram에서 429로 차단되는 문제를 우회한다.
        metrics: z
          .object({
            platformChannelId: z.string().optional(),
            username: z.string().optional(),
            fullName: z.string().optional(),
            profilePicUrl: z.string().optional(),
            followersCount: z.number().int().nonnegative().optional(),
            mediaCount: z.number().int().nonnegative().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const normalizedUrl = input.url.startsWith("http")
        ? input.url
        : `https://${input.url}`;

      const platform = toPlatformEnum(input.platformCode);
      const initialPlatformChannelId =
        input.metrics?.platformChannelId ?? extractChannelId(normalizedUrl);

      const channelTypeMap = {
        owned: "OWNED",
        competitor: "COMPETITOR",
        monitoring: "MONITORING",
      } as const;

      // P0-7: 메트릭은 클라이언트 fetch 우선, 없으면 서버사이드 fallback.
      // 서버사이드는 Vercel IP 차단으로 자주 실패하지만 무해하게 null 반환.
      let profile: {
        platformChannelId?: string;
        username?: string;
        fullName?: string;
        profilePicUrl?: string;
        followersCount?: number;
        mediaCount?: number;
      } | null = input.metrics ?? null;

      if (!profile && platform === "INSTAGRAM") {
        try {
          const fetched = await fetchInstagramPublicProfile(
            initialPlatformChannelId,
          );
          if (fetched) profile = fetched;
        } catch (err) {
          console.warn(
            "[channel.register] instagram public fetch failed:",
            err instanceof Error ? err.message : err,
          );
        }
      }

      const finalPlatformChannelId =
        profile?.platformChannelId || initialPlatformChannelId;
      const finalName =
        profile?.fullName || profile?.username || input.name;
      const finalThumb = profile?.profilePicUrl || null;
      const finalSubs = profile?.followersCount ?? 0;
      const finalContent = profile?.mediaCount ?? 0;
      const hasRealMetrics = Boolean(
        profile && (profile.followersCount || profile.mediaCount),
      );

      // P0-7: soft-delete 행 재활성화 지원.
      // Channel 모델의 @@unique([projectId, platform, platformChannelId]) 는
      // deletedAt 을 무시하므로, 같은 url 또는 같은 (platform, platformChannelId)
      // 를 가진 soft-deleted 행이 있으면 P2002 가 터진다. 그 행을 살려서 재사용한다.
      const existingByUrl = await ctx.db.channel.findFirst({
        where: { projectId: input.projectId, url: normalizedUrl },
      });
      const existingByKey = await ctx.db.channel.findUnique({
        where: {
          projectId_platform_platformChannelId: {
            projectId: input.projectId,
            platform,
            platformChannelId: finalPlatformChannelId,
          },
        },
      });
      const existing = existingByUrl ?? existingByKey;

      if (existing) {
        if (existing.deletedAt === null) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "이미 등록된 채널입니다.",
          });
        }
        // soft-deleted → 재활성화 + 메트릭 갱신
        const revived = await ctx.db.channel.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            status: "ACTIVE",
            name: finalName,
            url: normalizedUrl,
            platformChannelId: finalPlatformChannelId,
            channelType: channelTypeMap[input.channelType],
            ...(finalThumb ? { thumbnailUrl: finalThumb } : {}),
            ...(hasRealMetrics
              ? {
                  subscriberCount: finalSubs,
                  contentCount: finalContent,
                  lastSyncedAt: new Date(),
                }
              : {}),
          },
        });
        return { success: true, channel: revived };
      }

      // 신규 생성
      const channel = await ctx.db.channel.create({
        data: {
          projectId: input.projectId,
          platform,
          platformChannelId: finalPlatformChannelId,
          name: finalName,
          url: normalizedUrl,
          thumbnailUrl: finalThumb,
          subscriberCount: finalSubs,
          contentCount: finalContent,
          channelType: channelTypeMap[input.channelType],
          connectionType: "BASIC",
          status: "ACTIVE",
          ...(hasRealMetrics ? { lastSyncedAt: new Date() } : {}),
        },
      });

      return { success: true, channel };
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
