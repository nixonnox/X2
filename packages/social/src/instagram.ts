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

const GRAPH_API_BASE = "https://graph.instagram.com/v21.0";
const PLATFORM: SocialPlatform = "instagram";

/**
 * Instagram Graph API를 이용한 데이터 수집 Provider.
 *
 * 환경변수 `INSTAGRAM_ACCESS_TOKEN`이 설정되어 있으면 Graph API를 호출하고,
 * 없으면 기본 정보만 반환한다.
 */
export class InstagramProvider implements SocialProvider {
  readonly platform: SocialPlatform = PLATFORM;

  private get accessToken(): string | undefined {
    return process.env.INSTAGRAM_ACCESS_TOKEN;
  }

  // ---------------------------------------------------------------------------
  // parseChannelUrl
  // ---------------------------------------------------------------------------

  parseChannelUrl(url: string): string | null {
    try {
      const u = new URL(url);
      if (
        !u.hostname.includes("instagram.com") &&
        !u.hostname.includes("instagr.am")
      ) {
        return null;
      }

      const pathname = u.pathname.replace(/\/+$/, "");

      // Skip post / reel / story / IGTV URLs
      if (/^\/(p|reel|reels|stories|tv)\//i.test(pathname)) {
        return null;
      }

      // Match /{username} (top-level path segment only)
      const match = pathname.match(/^\/([\w][\w.]{0,28}[\w])$/);
      if (match) return match[1] ?? null;

      // Single-char usernames
      const singleChar = pathname.match(/^\/([\w])$/);
      if (singleChar) return singleChar[1] ?? null;

      return null;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // getChannelInfo
  // ---------------------------------------------------------------------------

  async getChannelInfo(usernameOrId: string): Promise<ChannelInfo> {
    const token = this.accessToken;

    if (!token) {
      return {
        platform: PLATFORM,
        platformChannelId: usernameOrId,
        name: usernameOrId,
        url: `https://www.instagram.com/${usernameOrId}`,
        thumbnailUrl: null,
        subscriberCount: null,
        contentCount: null,
      };
    }

    const userId = await this.resolveUserId(usernameOrId, token);

    const params = new URLSearchParams({
      fields:
        "id,username,name,profile_picture_url,followers_count,media_count",
      access_token: token,
    });

    const res = await fetch(`${GRAPH_API_BASE}/${userId}?${params}`);
    await this.handleApiError(res);

    const data = (await res.json()) as Record<string, unknown>;

    return {
      platform: PLATFORM,
      platformChannelId: String(data.id ?? userId),
      name: (data.name as string) ?? (data.username as string) ?? usernameOrId,
      url: `https://www.instagram.com/${(data.username as string) ?? usernameOrId}`,
      thumbnailUrl: (data.profile_picture_url as string) ?? null,
      subscriberCount:
        data.followers_count != null ? Number(data.followers_count) : null,
      contentCount: data.media_count != null ? Number(data.media_count) : null,
    };
  }

  // ---------------------------------------------------------------------------
  // getContents
  // ---------------------------------------------------------------------------

  async getContents(
    usernameOrId: string,
    options?: FetchOptions,
  ): Promise<ContentInfo[]> {
    const token = this.accessToken;
    if (!token) return [];

    const userId = await this.resolveUserId(usernameOrId, token);
    const limit = options?.limit ?? 25;

    const params = new URLSearchParams({
      fields:
        "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink",
      limit: String(limit),
      access_token: token,
    });

    if (options?.cursor) {
      params.set("after", options.cursor);
    }

    const res = await fetch(`${GRAPH_API_BASE}/${userId}/media?${params}`);
    await this.handleApiError(res);

    const json = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
    };

    return (json.data ?? []).map((item) => this.mapToContentInfo(item));
  }

  // ---------------------------------------------------------------------------
  // getAnalytics
  // ---------------------------------------------------------------------------

  async getAnalytics(
    usernameOrId: string,
    period: DateRange,
  ): Promise<AnalyticsData> {
    const token = this.accessToken;

    if (!token) {
      return {
        period,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        subscriberChange: 0,
        topContents: [],
      };
    }

    const userId = await this.resolveUserId(usernameOrId, token);

    // Try insights endpoint first
    try {
      return await this.fetchInsights(userId, period, token);
    } catch {
      // Fall back to aggregating from contents
      return await this.aggregateFromContents(userId, period, token);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Instagram Graph API는 username이 아닌 user ID가 필요하다.
   * 숫자 ID가 아니면 'me' 엔드포인트로 ID를 조회한다.
   * (실제로는 access token 소유자의 ID가 반환된다.)
   */
  private async resolveUserId(
    usernameOrId: string,
    token: string,
  ): Promise<string> {
    // Already a numeric ID
    if (/^\d+$/.test(usernameOrId)) return usernameOrId;

    // For the Graph API, we use the token owner's ID (self-account access)
    const params = new URLSearchParams({
      fields: "id",
      access_token: token,
    });

    const res = await fetch(`${GRAPH_API_BASE}/me?${params}`);
    await this.handleApiError(res);

    const data = (await res.json()) as { id?: string };
    if (!data.id) {
      throw new ChannelNotFoundError(PLATFORM, usernameOrId);
    }

    return data.id;
  }

  private async fetchInsights(
    userId: string,
    period: DateRange,
    token: string,
  ): Promise<AnalyticsData> {
    const since = Math.floor(period.from.getTime() / 1000);
    const until = Math.floor(period.to.getTime() / 1000);

    const params = new URLSearchParams({
      metric: "reach,impressions,follower_count",
      period: "day",
      since: String(since),
      until: String(until),
      access_token: token,
    });

    const res = await fetch(`${GRAPH_API_BASE}/${userId}/insights?${params}`);
    await this.handleApiError(res);

    const json = (await res.json()) as {
      data?: Array<{
        name: string;
        values: Array<{ value: number }>;
      }>;
    };

    const metricsMap = new Map<string, number[]>();
    for (const metric of json.data ?? []) {
      metricsMap.set(
        metric.name,
        metric.values.map((v) => v.value),
      );
    }

    const sumValues = (vals: number[] | undefined): number =>
      vals ? vals.reduce((a, b) => a + b, 0) : 0;

    const followerValues = metricsMap.get("follower_count") ?? [];
    const subscriberChange =
      followerValues.length >= 2
        ? followerValues[followerValues.length - 1]! - followerValues[0]!
        : 0;

    // Fetch top contents for the period
    const contents = await this.getContents(userId, { limit: 50 });
    const periodContents = contents.filter(
      (c) => c.publishedAt >= period.from && c.publishedAt <= period.to,
    );
    const topContents = periodContents
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 10);

    return {
      period,
      totalViews: sumValues(metricsMap.get("impressions")),
      totalLikes: periodContents.reduce((s, c) => s + c.likeCount, 0),
      totalComments: periodContents.reduce((s, c) => s + c.commentCount, 0),
      subscriberChange,
      topContents,
    };
  }

  private async aggregateFromContents(
    userId: string,
    period: DateRange,
    _token: string,
  ): Promise<AnalyticsData> {
    const contents = await this.getContents(userId, { limit: 50 });
    const periodContents = contents.filter(
      (c) => c.publishedAt >= period.from && c.publishedAt <= period.to,
    );

    const topContents = periodContents
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 10);

    return {
      period,
      totalViews: 0,
      totalLikes: periodContents.reduce((s, c) => s + c.likeCount, 0),
      totalComments: periodContents.reduce((s, c) => s + c.commentCount, 0),
      subscriberChange: 0,
      topContents,
    };
  }

  private mapToContentInfo(item: Record<string, unknown>): ContentInfo {
    return {
      platform: PLATFORM,
      platformContentId: String(item.id ?? ""),
      title: truncate(String(item.caption ?? ""), 100),
      description: item.caption != null ? String(item.caption) : null,
      publishedAt: new Date(String(item.timestamp)),
      thumbnailUrl:
        (item.thumbnail_url as string) ?? (item.media_url as string) ?? null,
      viewCount: 0, // Instagram Graph API doesn't expose view count on media list
      likeCount: item.like_count != null ? Number(item.like_count) : 0,
      commentCount:
        item.comments_count != null ? Number(item.comments_count) : 0,
    };
  }

  private async handleApiError(res: Response): Promise<void> {
    if (res.ok) return;

    let body: { error?: { code?: number; message?: string } } = {};
    try {
      body = (await res.json()) as typeof body;
    } catch {
      // ignore JSON parse failures
    }

    const code = body.error?.code;
    const message = body.error?.message ?? `Instagram API error: ${res.status}`;

    // Token expired / invalid
    if (code === 190) {
      throw new AuthenticationError(PLATFORM, message);
    }

    // User not found
    if (code === 803) {
      throw new ChannelNotFoundError(PLATFORM, message);
    }

    // Rate limit
    if (code === 4) {
      const retryAfterHeader = res.headers.get("retry-after");
      const retryAfterMs = retryAfterHeader
        ? Number(retryAfterHeader) * 1000
        : 60_000;
      throw new RateLimitError(PLATFORM, retryAfterMs, message);
    }

    throw new PlatformApiError(PLATFORM, res.status, message);
  }
}

/** Truncate a string to a maximum length, appending "…" if truncated. */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}
