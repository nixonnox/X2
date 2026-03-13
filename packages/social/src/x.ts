/**
 * X (Twitter) Provider — X API v2
 *
 * 환경 변수:
 *   X_API_BEARER_TOKEN — App-only Bearer Token (Basic tier 이상 필요)
 */

import type {
  ChannelInfo,
  ContentInfo,
  DateRange,
  SocialPlatform,
} from "@x2/types";
import type { SocialProvider, FetchOptions, AnalyticsData } from "./types";
import {
  PlatformApiError,
  RateLimitError,
  AuthenticationError,
  ChannelNotFoundError,
} from "./errors";

const API_BASE = "https://api.x.com/2";

export class XProvider implements SocialProvider {
  readonly platform: SocialPlatform = "x";

  private get bearerToken(): string | undefined {
    return process.env.X_API_BEARER_TOKEN;
  }

  // ── URL 파싱 ──

  parseChannelUrl(url: string): string | null {
    try {
      let input = url.trim();
      if (!/^https?:\/\//i.test(input)) input = `https://${input}`;
      const parsed = new URL(input);
      const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

      if (host !== "x.com" && host !== "twitter.com") return null;

      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments.length === 0) return null;

      const username = segments[0]!;
      // 시스템 경로 제외
      const reserved = [
        "i",
        "settings",
        "home",
        "explore",
        "search",
        "notifications",
        "messages",
        "compose",
        "hashtag",
      ];
      if (reserved.includes(username.toLowerCase())) return null;

      return username.replace(/^@/, "");
    } catch {
      return null;
    }
  }

  // ── 채널 정보 ──

  async getChannelInfo(username: string): Promise<ChannelInfo> {
    if (!this.bearerToken) {
      return {
        platform: "x",
        platformChannelId: username,
        name: `@${username}`,
        url: `https://x.com/${username}`,
        thumbnailUrl: null,
        subscriberCount: null,
        contentCount: null,
      };
    }

    const data = await this.apiGet<{
      data: {
        id: string;
        name: string;
        username: string;
        profile_image_url?: string;
        public_metrics?: {
          followers_count: number;
          tweet_count: number;
        };
      };
    }>(
      `/users/by/username/${encodeURIComponent(username)}?user.fields=id,name,username,profile_image_url,public_metrics`,
    );

    const user = data.data;
    return {
      platform: "x",
      platformChannelId: user.id,
      name: user.name,
      url: `https://x.com/${user.username}`,
      thumbnailUrl: user.profile_image_url ?? null,
      subscriberCount: user.public_metrics?.followers_count ?? null,
      contentCount: user.public_metrics?.tweet_count ?? null,
    };
  }

  // ── 콘텐츠 목록 ──

  async getContents(
    username: string,
    options?: FetchOptions,
  ): Promise<ContentInfo[]> {
    if (!this.bearerToken) return [];

    // username → user ID 변환
    const info = await this.getChannelInfo(username);
    const userId = info.platformChannelId;
    const limit = Math.min(options?.limit ?? 20, 100);

    let url = `/users/${userId}/tweets?max_results=${limit}&tweet.fields=id,text,created_at,public_metrics`;
    if (options?.cursor) url += `&pagination_token=${options.cursor}`;

    const data = await this.apiGet<{
      data?: Array<{
        id: string;
        text: string;
        created_at?: string;
        public_metrics?: {
          impression_count?: number;
          like_count?: number;
          reply_count?: number;
          retweet_count?: number;
        };
      }>;
    }>(url);

    if (!data.data) return [];

    return data.data.map((tweet) => ({
      platform: "x" as SocialPlatform,
      platformContentId: tweet.id,
      title:
        tweet.text.length > 100 ? tweet.text.slice(0, 97) + "..." : tweet.text,
      description: tweet.text,
      publishedAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
      thumbnailUrl: null,
      viewCount: tweet.public_metrics?.impression_count ?? 0,
      likeCount: tweet.public_metrics?.like_count ?? 0,
      commentCount: tweet.public_metrics?.reply_count ?? 0,
    }));
  }

  // ── 분석 지표 ──

  async getAnalytics(
    username: string,
    period: DateRange,
  ): Promise<AnalyticsData> {
    if (!this.bearerToken) {
      return {
        period,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        subscriberChange: 0,
        topContents: [],
      };
    }

    const info = await this.getChannelInfo(username);
    const userId = info.platformChannelId;

    const startTime = period.from.toISOString();
    const endTime = period.to.toISOString();

    const data = await this.apiGet<{
      data?: Array<{
        id: string;
        text: string;
        created_at?: string;
        public_metrics?: {
          impression_count?: number;
          like_count?: number;
          reply_count?: number;
          retweet_count?: number;
        };
      }>;
    }>(
      `/users/${userId}/tweets?max_results=100&start_time=${startTime}&end_time=${endTime}&tweet.fields=id,text,created_at,public_metrics`,
    );

    const tweets = data.data ?? [];

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;

    const contents: ContentInfo[] = tweets.map((t) => {
      const views = t.public_metrics?.impression_count ?? 0;
      const likes = t.public_metrics?.like_count ?? 0;
      const comments = t.public_metrics?.reply_count ?? 0;
      totalViews += views;
      totalLikes += likes;
      totalComments += comments;
      return {
        platform: "x" as SocialPlatform,
        platformContentId: t.id,
        title: t.text.length > 100 ? t.text.slice(0, 97) + "..." : t.text,
        description: t.text,
        publishedAt: t.created_at ? new Date(t.created_at) : new Date(),
        thumbnailUrl: null,
        viewCount: views,
        likeCount: likes,
        commentCount: comments,
      };
    });

    // 인기 콘텐츠: 조회수 기준 상위 5개
    const topContents = [...contents]
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5);

    return {
      period,
      totalViews,
      totalLikes,
      totalComments,
      subscriberChange: 0,
      topContents,
    };
  }

  // ── API 호출 헬퍼 ──

  private async apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${this.bearerToken}` },
    });

    if (!res.ok) {
      if (res.status === 401)
        throw new AuthenticationError("x", "Invalid or expired bearer token");
      if (res.status === 429) {
        const resetHeader = res.headers.get("x-rate-limit-reset");
        const retryMs = resetHeader
          ? Number(resetHeader) * 1000 - Date.now()
          : 60_000;
        throw new RateLimitError("x", Math.max(retryMs, 1000));
      }
      if (res.status === 404) throw new ChannelNotFoundError("x", path);
      throw new PlatformApiError(
        "x",
        res.status,
        `X API error: ${res.statusText}`,
      );
    }

    return res.json() as Promise<T>;
  }
}
