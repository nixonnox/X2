/**
 * InstagramGraphApiAdapter
 *
 * Instagram Graph API (Meta Business Suite)를 통해 키워드 관련 멘션을 수집.
 *
 * 제약사항:
 * - Business/Creator 계정 필수
 * - Facebook Page 연결 필요
 * - OAuth 2.0 Long-lived Access Token 필요 (60일 갱신)
 * - Hashtag Search: 7일 이내 데이터만 조회 가능
 * - Rate Limit: 200 calls/user/hour
 *
 * API Flow:
 * 1. GET /me/accounts?fields=instagram_business_account → IG Business Account ID
 * 2. GET /ig_hashtag_search?q={keyword}&user_id={igAccountId} → hashtag ID
 * 3. GET /{hashtagId}/recent_media?user_id={igAccountId}&fields=... → media list
 * 4. Convert each media item to SocialMention
 */

import type {
  SocialProviderAdapter,
  SocialMention,
  ProviderConfig,
  ProviderFetchResult,
} from "./social-provider-registry.service";

export class InstagramGraphApiAdapter implements SocialProviderAdapter {
  readonly config: ProviderConfig = {
    name: "instagram",
    platform: "INSTAGRAM",
    requiresApiKey: true,
    envKeyName: "INSTAGRAM_ACCESS_TOKEN",
    authType: "OAUTH2",
    rateLimitPerDay: 4800, // 200/hour × 24
    documentation: "https://developers.facebook.com/docs/instagram-api/",
  };

  private accessToken: string | undefined;
  private baseUrl = "https://graph.facebook.com/v19.0";

  /** Cached Instagram Business Account ID to avoid re-fetching every call */
  private cachedIgAccountId: string | null = null;

  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  }

  isConfigured(): boolean {
    return (
      !!this.accessToken && this.accessToken !== "your-instagram-access-token"
    );
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        error:
          "INSTAGRAM_ACCESS_TOKEN 미설정 — Meta Business Suite에서 Long-lived Token 발급 필요",
      };
    }

    try {
      const igAccountId = await this.getIgAccountId();
      if (!igAccountId) {
        return {
          ok: false,
          error:
            "Instagram Business Account를 찾을 수 없음 — Facebook Page에 IG 비즈니스 계정 연결 필요",
        };
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
        error: "INSTAGRAM_ACCESS_TOKEN 미설정",
      };
    }

    const maxResults = options?.maxResults ?? 25;

    try {
      // Step 1: Get IG Business Account ID
      const igAccountId = await this.getIgAccountId();
      if (!igAccountId) {
        return {
          mentions: [],
          fetchedAt: new Date().toISOString(),
          error: "Instagram Business Account를 찾을 수 없음",
        };
      }

      // Step 2: Search for hashtag ID
      const cleanKeyword = keyword.replace(/^#/, "").trim().toLowerCase();
      const hashtagId = await this.searchHashtag(cleanKeyword, igAccountId);
      if (!hashtagId) {
        return {
          mentions: [],
          fetchedAt: new Date().toISOString(),
          error: `해시태그 "${cleanKeyword}"를 찾을 수 없음`,
        };
      }

      // Step 3: Get recent media for this hashtag
      const mediaItems = await this.getRecentMedia(hashtagId, igAccountId);

      // Step 4: Convert to SocialMention[], apply filters
      let mentions: SocialMention[] = mediaItems.map((item) =>
        this.toSocialMention(item),
      );

      // Filter by since date if provided
      if (options?.since) {
        const sinceTime = options.since.getTime();
        mentions = mentions.filter(
          (m) => new Date(m.publishedAt).getTime() >= sinceTime,
        );
      }

      // Limit results
      mentions = mentions.slice(0, maxResults);

      return {
        mentions,
        fetchedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      const errorMsg = err.message ?? "Instagram API 호출 실패";

      // Re-throw auth/rate-limit errors so the registry can classify them
      if (
        errorMsg.includes("AUTH_EXPIRED") ||
        errorMsg.includes("rate") ||
        errorMsg.includes("token")
      ) {
        throw err;
      }

      return {
        mentions: [],
        fetchedAt: new Date().toISOString(),
        error: errorMsg,
      };
    }
  }

  // ─── Private helpers ──────────────────────────────────────────

  /**
   * Get the Instagram Business Account ID from the connected Facebook Page.
   * Caches the result so subsequent calls skip the API request.
   */
  private async getIgAccountId(): Promise<string | null> {
    if (this.cachedIgAccountId) {
      return this.cachedIgAccountId;
    }

    const url = `${this.baseUrl}/me/accounts?fields=instagram_business_account&access_token=${this.accessToken}`;
    const res = await fetch(url);

    if (!res.ok) {
      await this.handleErrorResponse(res);
    }

    const body = await res.json();
    const pages = body?.data as Array<{
      instagram_business_account?: { id: string };
    }>;

    if (!pages || pages.length === 0) {
      return null;
    }

    // Find the first page that has an instagram_business_account
    for (const page of pages) {
      if (page.instagram_business_account?.id) {
        this.cachedIgAccountId = page.instagram_business_account.id;
        return this.cachedIgAccountId;
      }
    }

    return null;
  }

  /**
   * Search for a hashtag ID by keyword.
   */
  private async searchHashtag(
    keyword: string,
    igAccountId: string,
  ): Promise<string | null> {
    const url =
      `${this.baseUrl}/ig_hashtag_search` +
      `?q=${encodeURIComponent(keyword)}` +
      `&user_id=${igAccountId}` +
      `&access_token=${this.accessToken}`;

    const res = await fetch(url);

    if (!res.ok) {
      await this.handleErrorResponse(res);
    }

    const body = await res.json();
    const data = body?.data as Array<{ id: string }>;

    if (!data || data.length === 0) {
      return null;
    }

    return data[0]?.id ?? null;
  }

  /**
   * Get recent media for a given hashtag ID.
   * Returns up to 50 media items (API default limit).
   */
  private async getRecentMedia(
    hashtagId: string,
    igAccountId: string,
  ): Promise<InstagramMediaItem[]> {
    const fields = "id,caption,timestamp,like_count,comments_count,permalink";
    const url =
      `${this.baseUrl}/${hashtagId}/recent_media` +
      `?user_id=${igAccountId}` +
      `&fields=${fields}` +
      `&access_token=${this.accessToken}`;

    const res = await fetch(url);

    if (!res.ok) {
      await this.handleErrorResponse(res);
    }

    const body = await res.json();
    return (body?.data as InstagramMediaItem[]) ?? [];
  }

  /**
   * Convert an Instagram media item to the standard SocialMention format.
   */
  private toSocialMention(item: InstagramMediaItem): SocialMention {
    return {
      id: `ig-${item.id}`,
      platform: "INSTAGRAM",
      text: item.caption ?? "",
      authorName: null, // Hashtag search does not return author info
      authorHandle: null,
      sentiment: null, // To be filled by sentiment analysis service
      topics: this.extractHashtags(item.caption),
      publishedAt: item.timestamp ?? new Date().toISOString(),
      url: item.permalink ?? null,
      engagement: {
        likes: item.like_count ?? 0,
        comments: item.comments_count ?? 0,
        shares: 0, // Instagram API does not expose share counts
      },
    };
  }

  /**
   * Extract hashtags from a caption string.
   */
  private extractHashtags(caption: string | undefined): string[] {
    if (!caption) return [];
    const matches = caption.match(/#[\w\u3131-\u318E\uAC00-\uD7A3]+/g);
    return matches ? [...new Set(matches.map((t) => t.toLowerCase()))] : [];
  }

  /**
   * Handle non-OK responses from the Graph API.
   * Throws descriptive errors for known error codes.
   */
  private async handleErrorResponse(res: Response): Promise<never> {
    const body = await res.json().catch(() => ({}));
    const apiError = body?.error;
    const code = apiError?.code;
    const message = apiError?.message ?? `HTTP ${res.status}`;

    if (res.status === 403 || code === 190 || code === 102) {
      // 190 = Invalid/expired access token
      // 102 = API session expired
      throw new Error(`AUTH_EXPIRED: ${message}`);
    }

    if (res.status === 429 || code === 4 || code === 32) {
      // 4 = Application-level rate limit
      // 32 = User-level rate limit
      throw new Error(`rate limit exceeded: ${message}`);
    }

    throw new Error(`Instagram API 오류 (${res.status}): ${message}`);
  }
}

// ─── Internal type for raw API response ─────────────────────────

interface InstagramMediaItem {
  id: string;
  caption?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
}
