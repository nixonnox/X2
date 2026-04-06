/**
 * Channel Sync Service — 소셜 플랫폼 데이터 수집 오케스트레이터
 *
 * In-memory store 기반으로 동작:
 * 1. channelService에서 채널 조회
 * 2. 플랫폼 API로 실제 데이터 수집
 * 3. channelService의 snapshot/content store에 저장
 */

import { channelService } from "./channel-service";
import type {
  PlatformCode,
  ChannelSnapshot,
  ChannelContent,
  ContentType,
} from "./types";
import type { ChannelInfo, ContentInfo } from "@x2/types";

// ── Types ──

export type SyncResult = {
  success: boolean;
  channelId: string;
  snapshotCreated: boolean;
  contentsUpdated: number;
  error?: string;
};

export type SyncAllResult = {
  total: number;
  succeeded: number;
  failed: number;
  results: SyncResult[];
};

// ── 플랫폼 코드 → SocialProvider 플랫폼 매핑 ──

type SocialPlatform = "youtube" | "instagram" | "tiktok" | "x";

const SUPPORTED_PLATFORMS: Record<string, SocialPlatform> = {
  youtube: "youtube",
  instagram: "instagram",
  tiktok: "tiktok",
  x: "x",
};

function toContentType(platform: SocialPlatform): ContentType {
  switch (platform) {
    case "youtube":
      return "video";
    case "instagram":
      return "reel";
    case "tiktok":
      return "short";
    case "x":
      return "post";
  }
}

// ── 플랫폼별 API 키 확인 ──

function getApiKeyStatus(): Record<
  SocialPlatform,
  { configured: boolean; envVar: string }
> {
  return {
    youtube: {
      configured:
        !!process.env.YOUTUBE_API_KEY &&
        process.env.YOUTUBE_API_KEY !== "your-youtube-api-key",
      envVar: "YOUTUBE_API_KEY",
    },
    instagram: {
      configured:
        !!process.env.INSTAGRAM_ACCESS_TOKEN &&
        process.env.INSTAGRAM_ACCESS_TOKEN !== "your-instagram-access-token",
      envVar: "INSTAGRAM_ACCESS_TOKEN",
    },
    tiktok: {
      configured:
        !!process.env.TIKTOK_ACCESS_TOKEN &&
        process.env.TIKTOK_ACCESS_TOKEN !== "your-tiktok-access-token",
      envVar: "TIKTOK_ACCESS_TOKEN",
    },
    x: {
      configured:
        !!process.env.X_API_BEARER_TOKEN &&
        process.env.X_API_BEARER_TOKEN !== "your-x-bearer-token",
      envVar: "X_API_BEARER_TOKEN",
    },
  };
}

// ── URL에서 플랫폼 채널 ID 추출 ──

function extractPlatformChannelId(
  url: string,
  platform: SocialPlatform,
): string | null {
  try {
    const u = new URL(url);
    switch (platform) {
      case "youtube": {
        const channelMatch = u.pathname.match(/^\/channel\/(UC[\w-]+)/);
        if (channelMatch) return channelMatch[1] ?? null;
        const handleMatch = u.pathname.match(/^\/@([\w.-]+)/);
        if (handleMatch) return `@${handleMatch[1]}`;
        return null;
      }
      case "instagram": {
        const igMatch = u.pathname.match(/^\/([\w.]+)\/?$/);
        return igMatch ? (igMatch[1] ?? null) : null;
      }
      case "tiktok": {
        const ttMatch = u.pathname.match(/^\/@([\w.]+)/);
        return ttMatch ? (ttMatch[1] ?? null) : null;
      }
      case "x": {
        const xMatch = u.pathname.match(/^\/([\w]+)\/?$/);
        return xMatch ? (xMatch[1] ?? null) : null;
      }
    }
  } catch {
    // URL이 아닌 경우 그 자체가 ID일 수 있음
    return url;
  }
}

// ── 단일 채널 동기화 ──

export async function syncChannel(channelId: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    channelId,
    snapshotCreated: false,
    contentsUpdated: 0,
  };

  try {
    // 1. 인메모리 스토어에서 채널 조회
    const channel = channelService.getChannel(channelId);
    if (!channel) {
      result.error = "Channel not found";
      return result;
    }

    const socialPlatform = SUPPORTED_PLATFORMS[channel.platformCode];
    if (!socialPlatform) {
      result.error = `Unsupported platform for sync: ${channel.platformCode}. Supported: youtube, instagram, tiktok, x`;
      return result;
    }

    // 2. API 키 확인
    const apiStatus = getApiKeyStatus()[socialPlatform];
    if (!apiStatus.configured) {
      result.error = `API key not configured. Set ${apiStatus.envVar} in .env.local`;
      return result;
    }

    // 3. 상태를 syncing으로 변경
    channelService.updateChannel(channelId, { status: "syncing" });

    // 4. URL에서 플랫폼 채널 ID 추출
    const platformChannelId = extractPlatformChannelId(
      channel.url,
      socialPlatform,
    );
    if (!platformChannelId) {
      result.error = `Cannot extract channel ID from URL: ${channel.url}`;
      channelService.updateChannel(channelId, { status: "error" });
      return result;
    }

    // 5. 플랫폼 API로 데이터 수집
    const { createProvider } = (await import("@x2/social")) as {
      createProvider: (p: SocialPlatform) => {
        getChannelInfo: (id: string) => Promise<ChannelInfo>;
        getContents: (
          id: string,
          opts?: { limit?: number },
        ) => Promise<ContentInfo[]>;
      };
    };
    const provider = createProvider(socialPlatform);

    // 6. 채널 정보 수집
    const info: ChannelInfo = await provider.getChannelInfo(platformChannelId);

    channelService.updateChannel(channelId, {
      name: info.name,
      thumbnailUrl: info.thumbnailUrl,
    });

    // 7. 콘텐츠 수집
    const rawContents: ContentInfo[] = await provider.getContents(
      platformChannelId,
      { limit: 30 },
    );
    const defaultType = toContentType(socialPlatform);

    const contents: ChannelContent[] = rawContents.map(
      (c: ContentInfo, i: number) => ({
        id: `${channelId}-c${i}`,
        channelId,
        title: c.title,
        thumbnailUrl: c.thumbnailUrl,
        contentType: defaultType,
        publishedAt: c.publishedAt.toISOString().split("T")[0]!,
        viewsOrReach: c.viewCount,
        engagementRate:
          c.viewCount > 0
            ? +(((c.likeCount + c.commentCount) / c.viewCount) * 100).toFixed(1)
            : 0,
        commentsCount: c.commentCount,
      }),
    );

    channelService.setContents(channelId, contents);
    result.contentsUpdated = contents.length;

    // 8. 콘텐츠 타입 분포 계산
    const typeCounts: Record<string, number> = {};
    for (const c of contents) {
      const label =
        c.contentType.charAt(0).toUpperCase() + c.contentType.slice(1);
      typeCounts[label] = (typeCounts[label] ?? 0) + 1;
    }
    channelService.setContentTypeDist(
      channelId,
      Object.entries(typeCounts).map(([type, count]) => ({ type, count })),
    );

    // 9. 스냅샷 생성
    const totalViews = rawContents.reduce(
      (sum: number, c: ContentInfo) => sum + c.viewCount,
      0,
    );
    const avgEng =
      rawContents.length > 0
        ? rawContents.reduce((sum: number, c: ContentInfo) => {
            return (
              sum +
              (c.viewCount > 0
                ? ((c.likeCount + c.commentCount) / c.viewCount) * 100
                : 0)
            );
          }, 0) / rawContents.length
        : 0;

    const today = new Date().toISOString().split("T")[0]!;
    const audienceLabel =
      socialPlatform === "youtube" ? "Subscribers" : "Followers";

    const snapshot: ChannelSnapshot = {
      channelId,
      snapshotDate: today,
      audienceCount: info.subscriberCount ?? 0,
      audienceLabel,
      totalContents: info.contentCount ?? contents.length,
      totalViewsOrReach: totalViews,
      engagementRate: +avgEng.toFixed(1),
      growthRate30d: 0, // 이전 데이터 없으면 0
      uploads30d: contents.filter((c) => {
        const d = new Date(c.publishedAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return d >= thirtyDaysAgo;
      }).length,
    };

    // 이전 스냅샷과 비교하여 성장률 계산
    const prevSnapshot = channelService.getSnapshot(channelId);
    if (prevSnapshot && (prevSnapshot.audienceCount ?? 0) > 0) {
      snapshot.growthRate30d = +(
        (((snapshot.audienceCount ?? 0) - (prevSnapshot.audienceCount ?? 0)) /
          (prevSnapshot.audienceCount ?? 1)) *
        100
      ).toFixed(1);
    }

    channelService.setSnapshot(channelId, snapshot);
    result.snapshotCreated = true;

    // 10. 시리즈에 포인트 추가 (차트용)
    const monthLabel = new Date().toLocaleDateString("en", { month: "short" });
    channelService.addSnapshotSeries(channelId, {
      date: monthLabel,
      audienceCount: snapshot.audienceCount ?? 0,
      totalViewsOrReach: totalViews,
      engagementRate: snapshot.engagementRate ?? 0,
    });

    // 11. 상태 복원
    channelService.updateChannel(channelId, { status: "active" });
    result.success = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.error = message;

    try {
      channelService.updateChannel(channelId, { status: "error" });
    } catch {
      // 무시
    }
  }

  return result;
}

// ── 전체 채널 동기화 (Cron용) ──

export async function syncAllChannels(): Promise<SyncAllResult> {
  const channels = channelService.listChannels({ status: "active" });
  const results: SyncResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i]!;
    const r = await syncChannel(ch.id);
    results.push(r);
    if (r.success) succeeded++;
    else failed++;

    // Rate limit 방지: 채널 간 1초 대기
    if (i < channels.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { total: channels.length, succeeded, failed, results };
}

// ── API 키 상태 조회 (프론트엔드용) ──

export function getApiKeyStatusSummary() {
  return getApiKeyStatus();
}
