import type {
  ChannelInfo,
  ContentInfo,
  DateRange,
  SocialPlatform,
} from "@x2/types";
import type { AnalyticsData, FetchOptions, SocialProvider } from "./types";
import {
  AuthenticationError,
  ChannelNotFoundError,
  PlatformApiError,
  RateLimitError,
} from "./errors";
import { getRateLimiter } from "./rate-limiter";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

/**
 * YouTube Data API v3를 사용하는 SocialProvider 구현체.
 */
export class YouTubeProvider implements SocialProvider {
  readonly platform: SocialPlatform = "youtube";

  private get apiKey(): string {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key || key === "your-youtube-api-key") {
      throw new AuthenticationError("youtube", "YOUTUBE_API_KEY is not set");
    }
    return key;
  }

  private get rateLimiter() {
    return getRateLimiter("youtube");
  }

  // ── parseChannelUrl ────────────────────────────────

  /**
   * YouTube 채널 URL에서 채널 식별자를 추출한다.
   *
   * 지원 형식:
   * - https://www.youtube.com/channel/UCxxxxxx
   * - https://www.youtube.com/@handle
   * - https://youtube.com/@handle
   */
  parseChannelUrl(url: string): string | null {
    try {
      const u = new URL(url);
      if (!u.hostname.includes("youtube.com")) return null;

      // /channel/UCxxxxx
      const channelMatch = u.pathname.match(/^\/channel\/(UC[\w-]+)/);
      if (channelMatch) return channelMatch[1] ?? null;

      // /@handle
      const handleMatch = u.pathname.match(/^\/@([\w.-]+)/);
      if (handleMatch) return `@${handleMatch[1]}`;

      return null;
    } catch {
      return null;
    }
  }

  // ── getChannelInfo ─────────────────────────────────

  /**
   * YouTube Data API v3 channels.list로 채널 정보를 가져온다.
   */
  async getChannelInfo(channelId: string): Promise<ChannelInfo> {
    // channels.list는 quota 1 unit
    await this.rateLimiter.acquire(1);

    const isHandle = channelId.startsWith("@");
    const params = new URLSearchParams({
      part: "snippet,statistics",
      key: this.apiKey,
    });
    if (isHandle) {
      params.set("forHandle", channelId.slice(1));
    } else {
      params.set("id", channelId);
    }

    const data = await this.fetchApi<YouTubeListResponse>(
      `${YOUTUBE_API_BASE}/channels?${params}`,
    );

    const item = data.items?.[0];
    if (!item) {
      throw new ChannelNotFoundError("youtube", channelId);
    }

    return {
      platform: "youtube",
      platformChannelId: item.id,
      name: item.snippet.title,
      url: `https://www.youtube.com/channel/${item.id}`,
      thumbnailUrl: item.snippet.thumbnails?.default?.url ?? null,
      subscriberCount: item.statistics?.subscriberCount
        ? Number(item.statistics.subscriberCount)
        : null,
      contentCount: item.statistics?.videoCount
        ? Number(item.statistics.videoCount)
        : null,
    };
  }

  // ── getContents ────────────────────────────────────

  /**
   * 채널의 최신 동영상 목록을 가져온다.
   *
   * 1) search.list로 videoId 목록을 조회 (quota 100)
   * 2) videos.list로 통계 정보를 조회 (quota 1)
   */
  async getContents(
    channelId: string,
    options?: FetchOptions,
  ): Promise<ContentInfo[]> {
    const resolvedId = await this.resolveChannelId(channelId);
    const maxResults = options?.limit ?? 20;

    // search.list: quota 100 units
    await this.rateLimiter.acquire(100);

    const searchParams = new URLSearchParams({
      part: "snippet",
      channelId: resolvedId,
      type: "video",
      order: "date",
      maxResults: String(maxResults),
      key: this.apiKey,
    });
    if (options?.cursor) {
      searchParams.set("pageToken", options.cursor);
    }

    const searchData = await this.fetchApi<YouTubeSearchResponse>(
      `${YOUTUBE_API_BASE}/search?${searchParams}`,
    );

    const videoIds = searchData.items
      ?.map((item) => item.id?.videoId)
      .filter((id): id is string => !!id);

    if (!videoIds || videoIds.length === 0) return [];

    // videos.list: quota 1 unit
    await this.rateLimiter.acquire(1);

    const videoParams = new URLSearchParams({
      part: "snippet,statistics",
      id: videoIds.join(","),
      key: this.apiKey,
    });

    const videoData = await this.fetchApi<YouTubeVideoListResponse>(
      `${YOUTUBE_API_BASE}/videos?${videoParams}`,
    );

    return (videoData.items ?? []).map((v) => ({
      platform: "youtube" as const,
      platformContentId: v.id,
      title: v.snippet.title,
      description: v.snippet.description ?? null,
      publishedAt: new Date(v.snippet.publishedAt),
      thumbnailUrl: v.snippet.thumbnails?.default?.url ?? null,
      viewCount: Number(v.statistics?.viewCount ?? 0),
      likeCount: Number(v.statistics?.likeCount ?? 0),
      commentCount: Number(v.statistics?.commentCount ?? 0),
    }));
  }

  // ── getAnalytics ───────────────────────────────────

  /**
   * 지정 기간 내 동영상을 조회하고 통계를 집계한다.
   */
  async getAnalytics(
    channelId: string,
    period: DateRange,
  ): Promise<AnalyticsData> {
    const resolvedId = await this.resolveChannelId(channelId);

    // search.list with date filter: quota 100
    await this.rateLimiter.acquire(100);

    const searchParams = new URLSearchParams({
      part: "snippet",
      channelId: resolvedId,
      type: "video",
      order: "date",
      publishedAfter: period.from.toISOString(),
      publishedBefore: period.to.toISOString(),
      maxResults: "50",
      key: this.apiKey,
    });

    const searchData = await this.fetchApi<YouTubeSearchResponse>(
      `${YOUTUBE_API_BASE}/search?${searchParams}`,
    );

    const videoIds = searchData.items
      ?.map((item) => item.id?.videoId)
      .filter((id): id is string => !!id);

    if (!videoIds || videoIds.length === 0) {
      return {
        period,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        subscriberChange: 0,
        topContents: [],
      };
    }

    // videos.list: quota 1
    await this.rateLimiter.acquire(1);

    const videoParams = new URLSearchParams({
      part: "snippet,statistics",
      id: videoIds.join(","),
      key: this.apiKey,
    });

    const videoData = await this.fetchApi<YouTubeVideoListResponse>(
      `${YOUTUBE_API_BASE}/videos?${videoParams}`,
    );

    const contents: ContentInfo[] = (videoData.items ?? []).map((v) => ({
      platform: "youtube" as const,
      platformContentId: v.id,
      title: v.snippet.title,
      description: v.snippet.description ?? null,
      publishedAt: new Date(v.snippet.publishedAt),
      thumbnailUrl: v.snippet.thumbnails?.default?.url ?? null,
      viewCount: Number(v.statistics?.viewCount ?? 0),
      likeCount: Number(v.statistics?.likeCount ?? 0),
      commentCount: Number(v.statistics?.commentCount ?? 0),
    }));

    const totalViews = contents.reduce((sum, c) => sum + c.viewCount, 0);
    const totalLikes = contents.reduce((sum, c) => sum + c.likeCount, 0);
    const totalComments = contents.reduce((sum, c) => sum + c.commentCount, 0);

    // 조회수 기준 상위 콘텐츠
    const topContents = [...contents]
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 10);

    return {
      period,
      totalViews,
      totalLikes,
      totalComments,
      subscriberChange: 0, // Data API로는 구독자 변화를 추적할 수 없음
      topContents,
    };
  }

  // ── 내부 헬퍼 ──────────────────────────────────────

  /**
   * 핸들(@xxx)이면 실제 채널 ID(UCxxx)로 변환한다.
   */
  private async resolveChannelId(channelId: string): Promise<string> {
    if (!channelId.startsWith("@")) return channelId;

    const info = await this.getChannelInfo(channelId);
    return info.platformChannelId;
  }

  /**
   * YouTube API에 GET 요청을 보내고 에러를 적절히 변환한다.
   */
  private async fetchApi<T>(url: string): Promise<T> {
    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text().catch(() => "");

      if (res.status === 403 && body.includes("quotaExceeded")) {
        throw new RateLimitError(
          "youtube",
          24 * 60 * 60 * 1000, // 일일 쿼터이므로 24시간
          "YouTube API daily quota exceeded",
        );
      }
      if (res.status === 401) {
        throw new AuthenticationError("youtube", "Invalid YouTube API key");
      }
      if (res.status === 404) {
        throw new ChannelNotFoundError("youtube", url);
      }

      throw new PlatformApiError(
        "youtube",
        res.status,
        `YouTube API error: ${res.status} ${body}`,
      );
    }

    return res.json() as Promise<T>;
  }
}

// ── YouTube API 응답 타입 (내부용) ──────────────────

type YouTubeThumbnail = { url: string; width?: number; height?: number };

type YouTubeListResponse = {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      description?: string;
      thumbnails?: { default?: YouTubeThumbnail };
    };
    statistics?: {
      subscriberCount?: string;
      videoCount?: string;
      viewCount?: string;
    };
  }>;
};

type YouTubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet: {
      title: string;
      publishedAt: string;
    };
  }>;
  nextPageToken?: string;
};

type YouTubeVideoListResponse = {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      description?: string;
      publishedAt: string;
      thumbnails?: { default?: YouTubeThumbnail };
    };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }>;
};
