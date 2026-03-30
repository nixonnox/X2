/**
 * YouTubeDataApiAdapter
 *
 * YouTube Data API v3를 통해 키워드 관련 댓글/영상을 수집.
 *
 * API Endpoints:
 * - commentThreads.list: 키워드 관련 댓글 검색
 * - search.list: 키워드 관련 영상 검색 → 댓글 추출
 *
 * Quota:
 * - 기본 할당: 10,000 units/day
 * - search.list: 100 units/call
 * - commentThreads.list: 1 unit/call
 *
 * Authentication: API Key (서버 키, OAuth 불필요)
 */

import type {
  SocialProviderAdapter,
  ProviderConfig,
  ProviderFetchResult,
  SocialMention,
} from "./social-provider-registry.service";

// ─── YouTube API Response Types ──────────────────────────────────

type YouTubeSearchItem = {
  id: { videoId?: string };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
  };
};

type YouTubeCommentThread = {
  id: string;
  snippet: {
    topLevelComment: {
      id: string;
      snippet: {
        textDisplay: string;
        authorDisplayName: string;
        authorChannelUrl?: string;
        likeCount: number;
        publishedAt: string;
        updatedAt: string;
      };
    };
    totalReplyCount: number;
  };
};

type YouTubeApiResponse<T> = {
  items?: T[];
  pageInfo?: { totalResults: number; resultsPerPage: number };
  nextPageToken?: string;
  error?: {
    code: number;
    message: string;
    errors: Array<{ reason: string; domain: string; message: string }>;
  };
};

// ─── Adapter ─────────────────────────────────────────────────────

export class YouTubeDataApiAdapter implements SocialProviderAdapter {
  readonly config: ProviderConfig = {
    name: "youtube",
    platform: "YOUTUBE",
    requiresApiKey: true,
    envKeyName: "YOUTUBE_API_KEY",
    authType: "API_KEY",
    rateLimitPerDay: 10000,
    documentation: "https://developers.google.com/youtube/v3/docs",
  };

  private apiKey: string | undefined;
  private baseUrl = "https://www.googleapis.com/youtube/v3";
  private dailyQuotaUsed = 0;
  private lastQuotaReset: Date = new Date();

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== "your-youtube-api-key";
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        error: "YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다",
      };
    }

    try {
      // Lightweight test: search for a single result (costs 100 quota units)
      const url = `${this.baseUrl}/search?part=snippet&q=test&maxResults=1&type=video&key=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const errMsg = body?.error?.message ?? `HTTP ${res.status}`;
        if (res.status === 403) {
          return { ok: false, error: `Quota 초과 또는 API 비활성: ${errMsg}` };
        }
        if (res.status === 400) {
          return { ok: false, error: `잘못된 API 키: ${errMsg}` };
        }
        return { ok: false, error: errMsg };
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: `연결 실패: ${err.message}` };
    }
  }

  async fetchMentions(
    keyword: string,
    options?: { maxResults?: number; since?: Date },
  ): Promise<ProviderFetchResult> {
    if (!this.isConfigured()) {
      return {
        mentions: [],
        fetchedAt: new Date().toISOString(),
        error: "YOUTUBE_API_KEY 미설정",
      };
    }

    this.resetQuotaIfNewDay();
    const maxResults = Math.min(options?.maxResults ?? 20, 50);
    const mentions: SocialMention[] = [];

    try {
      // Step 1: Search for relevant videos (100 quota units)
      const videoIds = await this.searchVideos(
        keyword,
        Math.min(maxResults, 10),
      );
      this.dailyQuotaUsed += 100;

      // Step 2: Fetch comment threads for each video (1 unit per call)
      for (const videoId of videoIds.slice(0, 5)) {
        const comments = await this.fetchCommentThreads(videoId, keyword, 10);
        this.dailyQuotaUsed += 1;
        mentions.push(...comments);
      }

      return {
        mentions: mentions.slice(0, maxResults),
        fetchedAt: new Date().toISOString(),
        quotaUsed: this.dailyQuotaUsed,
        quotaRemaining: Math.max(
          0,
          (this.config.rateLimitPerDay ?? 10000) - this.dailyQuotaUsed,
        ),
      };
    } catch (err: any) {
      return {
        mentions,
        fetchedAt: new Date().toISOString(),
        quotaUsed: this.dailyQuotaUsed,
        quotaRemaining: Math.max(
          0,
          (this.config.rateLimitPerDay ?? 10000) - this.dailyQuotaUsed,
        ),
        error: err.message,
      };
    }
  }

  // ─── Private API calls ─────────────────────────────────────────

  private async searchVideos(
    keyword: string,
    maxResults: number,
  ): Promise<string[]> {
    const params = new URLSearchParams({
      part: "snippet",
      q: keyword,
      maxResults: String(maxResults),
      type: "video",
      order: "relevance",
      relevanceLanguage: "ko",
      key: this.apiKey!,
    });

    const res = await fetch(`${this.baseUrl}/search?${params}`);
    if (!res.ok) {
      await this.handleApiError(res);
    }

    const data: YouTubeApiResponse<YouTubeSearchItem> = await res.json();
    return (data.items ?? [])
      .map((item) => item.id.videoId)
      .filter((id): id is string => !!id);
  }

  private async fetchCommentThreads(
    videoId: string,
    keyword: string,
    maxResults: number,
  ): Promise<SocialMention[]> {
    const params = new URLSearchParams({
      part: "snippet",
      videoId,
      maxResults: String(maxResults),
      order: "relevance",
      searchTerms: keyword,
      key: this.apiKey!,
    });

    const res = await fetch(`${this.baseUrl}/commentThreads?${params}`);
    if (!res.ok) {
      // Comments might be disabled — not a fatal error
      if (res.status === 403) return [];
      await this.handleApiError(res);
    }

    const data: YouTubeApiResponse<YouTubeCommentThread> = await res.json();
    return (data.items ?? []).map((item) => this.toMention(item, videoId));
  }

  private toMention(
    thread: YouTubeCommentThread,
    videoId: string,
  ): SocialMention {
    const comment = thread.snippet.topLevelComment.snippet;
    return {
      id: `yt-${thread.id}`,
      platform: "YOUTUBE",
      text: this.stripHtml(comment.textDisplay),
      authorName: comment.authorDisplayName,
      authorHandle: comment.authorChannelUrl
        ? (comment.authorChannelUrl.split("/").pop() ?? null)
        : null,
      sentiment: null, // To be analyzed by downstream service
      topics: [],
      publishedAt: comment.publishedAt,
      url: `https://www.youtube.com/watch?v=${videoId}&lc=${thread.id}`,
      engagement: {
        likes: comment.likeCount,
        comments: thread.snippet.totalReplyCount,
        shares: 0,
      },
    };
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  private async handleApiError(res: Response): Promise<never> {
    const body = (await res
      .json()
      .catch(() => ({}))) as YouTubeApiResponse<unknown>;
    const message = body?.error?.message ?? `YouTube API error: ${res.status}`;
    const reason = body?.error?.errors?.[0]?.reason;

    if (res.status === 403 && reason === "quotaExceeded") {
      throw new Error(
        `YouTube quota 초과 (일일 ${this.config.rateLimitPerDay} units)`,
      );
    }
    if (res.status === 403) {
      throw new Error(`YouTube API 접근 거부: ${message}`);
    }
    throw new Error(message);
  }

  private resetQuotaIfNewDay(): void {
    const now = new Date();
    // YouTube quota resets at midnight Pacific Time (UTC-8)
    const pacificOffset = -8 * 60;
    const nowPT = new Date(now.getTime() + pacificOffset * 60000);
    const lastPT = new Date(
      this.lastQuotaReset.getTime() + pacificOffset * 60000,
    );

    if (
      nowPT.getUTCFullYear() !== lastPT.getUTCFullYear() ||
      nowPT.getUTCMonth() !== lastPT.getUTCMonth() ||
      nowPT.getUTCDate() !== lastPT.getUTCDate()
    ) {
      this.dailyQuotaUsed = 0;
      this.lastQuotaReset = now;
    }
  }
}
