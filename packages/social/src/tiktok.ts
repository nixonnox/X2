import type { ChannelInfo, ContentInfo, DateRange } from "@x2/types";
import type { AnalyticsData, FetchOptions, SocialProvider } from "./types";
import {
  AuthenticationError,
  ChannelNotFoundError,
  PlatformApiError,
  RateLimitError,
} from "./errors";

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

/**
 * TikTok Display API / Research API를 사용하는 Provider 구현.
 *
 * 환경변수 `TIKTOK_ACCESS_TOKEN`이 설정되어 있으면 API를 호출하고,
 * 없으면 기본 정보만 반환한다.
 */
export class TikTokProvider implements SocialProvider {
  readonly platform = "tiktok" as const;

  private get accessToken(): string | undefined {
    return process.env.TIKTOK_ACCESS_TOKEN;
  }

  // ---------------------------------------------------------------------------
  // parseChannelUrl
  // ---------------------------------------------------------------------------

  parseChannelUrl(url: string): string | null {
    try {
      const u = new URL(url);
      if (!u.hostname.includes("tiktok.com")) return null;

      // /@username or /@username/video/xxx
      const match = u.pathname.match(/^\/@([\w.]+)/);
      if (match) return match[1] ?? null;

      return null;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // getChannelInfo
  // ---------------------------------------------------------------------------

  async getChannelInfo(username: string): Promise<ChannelInfo> {
    const token = this.accessToken;

    if (!token) {
      return {
        platform: "tiktok",
        platformChannelId: username,
        name: username,
        url: `https://www.tiktok.com/@${username}`,
        thumbnailUrl: null,
        subscriberCount: null,
        contentCount: null,
      };
    }

    const res = await fetch(`${TIKTOK_API_BASE}/user/info/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: [
          "display_name",
          "avatar_url",
          "follower_count",
          "video_count",
          "likes_count",
        ],
      }),
    });

    this.handleHttpError(res, username);

    type TikTokUserResponse = {
      data?: {
        user?: {
          display_name?: string;
          avatar_url?: string | null;
          follower_count?: number | null;
          video_count?: number | null;
        };
      };
    };
    const data = (await res.json()) as TikTokUserResponse;
    const user = data?.data?.user;

    if (!user) {
      throw new ChannelNotFoundError("tiktok", username);
    }

    return {
      platform: "tiktok",
      platformChannelId: username,
      name: user.display_name ?? username,
      url: `https://www.tiktok.com/@${username}`,
      thumbnailUrl: user.avatar_url ?? null,
      subscriberCount: user.follower_count ?? null,
      contentCount: user.video_count ?? null,
    };
  }

  // ---------------------------------------------------------------------------
  // getContents
  // ---------------------------------------------------------------------------

  async getContents(
    username: string,
    options?: FetchOptions,
  ): Promise<ContentInfo[]> {
    const token = this.accessToken;
    if (!token) return [];

    const limit = options?.limit ?? 20;

    const body: Record<string, unknown> = {
      fields: [
        "id",
        "title",
        "video_description",
        "create_time",
        "cover_image_url",
        "view_count",
        "like_count",
        "comment_count",
        "share_count",
      ],
      max_count: limit,
    };

    if (options?.cursor) {
      body.cursor = options.cursor;
    }

    const res = await fetch(`${TIKTOK_API_BASE}/video/list/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    this.handleHttpError(res, username);

    const data = (await res.json()) as { data?: { videos?: unknown[] } };
    const videos: unknown[] = data?.data?.videos ?? [];

    return videos.map((v: any) => ({
      platform: "tiktok" as const,
      platformContentId: String(v.id),
      title: v.title ?? v.video_description ?? "",
      description: v.video_description ?? "",
      publishedAt: v.create_time ? new Date(v.create_time * 1000) : new Date(),
      thumbnailUrl: v.cover_image_url ?? null,
      viewCount: v.view_count ?? 0,
      likeCount: v.like_count ?? 0,
      commentCount: v.comment_count ?? 0,
    }));
  }

  // ---------------------------------------------------------------------------
  // getAnalytics
  // ---------------------------------------------------------------------------

  async getAnalytics(
    username: string,
    period: DateRange,
  ): Promise<AnalyticsData> {
    const allContents = await this.getContents(username, { limit: 100 });

    const start = new Date(period.from);
    const end = new Date(period.to);

    const filtered = allContents.filter((c) => {
      const pub = new Date(c.publishedAt);
      return pub >= start && pub <= end;
    });

    const totalViews = filtered.reduce((s, c) => s + (c.viewCount ?? 0), 0);
    const totalLikes = filtered.reduce((s, c) => s + (c.likeCount ?? 0), 0);
    const totalComments = filtered.reduce(
      (s, c) => s + (c.commentCount ?? 0),
      0,
    );

    // 조회수 기준 상위 콘텐츠
    const topContents = [...filtered]
      .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
      .slice(0, 10);

    return {
      period,
      totalViews,
      totalLikes,
      totalComments,
      subscriberChange: 0, // TikTok API에서 기간별 팔로워 변화를 제공하지 않음
      topContents,
    };
  }

  // ---------------------------------------------------------------------------
  // HTTP error handling
  // ---------------------------------------------------------------------------

  private handleHttpError(res: Response, channelId: string): void {
    if (res.ok) return;

    const status = res.status;

    if (status === 401) {
      throw new AuthenticationError(
        "tiktok",
        "Invalid or expired access token",
      );
    }

    if (status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const retryMs = retryAfter ? Number(retryAfter) * 1000 : 60_000;
      throw new RateLimitError("tiktok", retryMs);
    }

    if (status === 404) {
      throw new ChannelNotFoundError("tiktok", channelId);
    }

    throw new PlatformApiError("tiktok", status, `TikTok API error: ${status}`);
  }
}
