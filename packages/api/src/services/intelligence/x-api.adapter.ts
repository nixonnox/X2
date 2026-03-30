/**
 * XApiAdapter (formerly Twitter)
 *
 * X API v2를 통해 키워드 관련 트윗/멘션을 수집.
 *
 * 제약사항:
 * - Basic tier ($100/month): 10,000 tweets/month read
 * - Pro tier ($5,000/month): 1,000,000 tweets/month read
 * - Free tier: Write-only, 검색 불가
 * - Bearer Token 인증 (App-only)
 * - 최근 7일 데이터만 검색 가능 (Recent Search)
 * - Full-archive search는 Academic/Enterprise만 가능
 *
 * API Endpoints (Basic tier 이상):
 * - GET /2/tweets/search/recent → 최근 7일 트윗 검색
 * - GET /2/tweets/:id → 단일 트윗 상세
 *
 * 현재 상태: SCAFFOLD — Basic tier 유료 요금제 필요, 구조만 준비
 */

import type {
  SocialProviderAdapter,
  ProviderConfig,
  ProviderFetchResult,
  SocialMention,
} from "./social-provider-registry.service";

export class XApiAdapter implements SocialProviderAdapter {
  readonly config: ProviderConfig = {
    name: "x",
    platform: "X",
    requiresApiKey: true,
    envKeyName: "X_API_BEARER_TOKEN",
    authType: "BEARER_TOKEN",
    rateLimitPerDay: 300, // Basic tier: 300 requests/15min window → ~28,800/day
    documentation:
      "https://developer.x.com/en/docs/x-api/tweets/search/introduction",
  };

  private bearerToken: string | undefined;
  private baseUrl = "https://api.x.com/2";

  constructor() {
    this.bearerToken = process.env.X_API_BEARER_TOKEN;
  }

  isConfigured(): boolean {
    return !!this.bearerToken && this.bearerToken !== "your-x-bearer-token";
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        error: "X_API_BEARER_TOKEN 미설정 — Basic tier($100/월) 이상 필요",
      };
    }

    try {
      const res = await fetch(
        `${this.baseUrl}/tweets/search/recent?query=test&max_results=10`,
        {
          headers: { Authorization: `Bearer ${this.bearerToken}` },
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 403) {
          return {
            ok: false,
            error: "X API 접근 권한 없음 — Basic tier 이상 필요",
          };
        }
        return { ok: false, error: body?.detail ?? `HTTP ${res.status}` };
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
        error: "X_API_BEARER_TOKEN 미설정",
      };
    }

    try {
      const maxResults = Math.min(options?.maxResults ?? 20, 100);
      const query = encodeURIComponent(`${keyword} lang:ko -is:retweet`);
      const fields = "tweet.fields=created_at,public_metrics,author_id,lang";
      const url = `${this.baseUrl}/tweets/search/recent?query=${query}&max_results=${maxResults}&${fields}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.bearerToken}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        data?: Array<{
          id: string;
          text: string;
          created_at: string;
          author_id: string;
          public_metrics: {
            retweet_count: number;
            reply_count: number;
            like_count: number;
            quote_count: number;
          };
        }>;
      };

      const mentions: SocialMention[] = (data.data ?? []).map((tweet) => ({
        id: `x-${tweet.id}`,
        platform: "X",
        text: tweet.text,
        authorName: null,
        authorHandle: tweet.author_id, // Would need users lookup for handle
        sentiment: null,
        topics: [],
        publishedAt: tweet.created_at,
        url: `https://x.com/i/status/${tweet.id}`,
        engagement: {
          likes: tweet.public_metrics.like_count,
          comments: tweet.public_metrics.reply_count,
          shares:
            tweet.public_metrics.retweet_count +
            tweet.public_metrics.quote_count,
        },
      }));

      return {
        mentions,
        fetchedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        mentions: [],
        fetchedAt: new Date().toISOString(),
        error: err.message,
      };
    }
  }
}
