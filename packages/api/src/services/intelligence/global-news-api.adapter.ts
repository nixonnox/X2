/**
 * GlobalNewsApiAdapter
 *
 * NewsAPI.org를 통한 글로벌 뉴스 수집.
 * https://newsapi.org/docs/endpoints/everything
 *
 * 환경변수:
 * - NEWS_API_KEY: NewsAPI.org API 키
 *
 * 제약:
 * - 무료: 100건/일, 1개월 이전 기사 제한
 * - Business: 250,000건/월, 실시간
 * - 국가/언어 필터 지원
 */

import type {
  SocialProviderAdapter,
  SocialMention,
  ProviderConfig,
  ProviderFetchResult,
} from "./social-provider-registry.service";

export class GlobalNewsApiAdapter implements SocialProviderAdapter {
  readonly config: ProviderConfig = {
    name: "global_news",
    platform: "NEWS",
    requiresApiKey: true,
    envKeyName: "NEWS_API_KEY",
    authType: "API_KEY",
    rateLimitPerDay: 100,
    documentation: "https://newsapi.org/docs",
  };

  private apiKey = process.env.NEWS_API_KEY;

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== "your-newsapi-key";
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, error: "NEWS_API_KEY 미설정 — newsapi.org에서 발급 필요" };
    }
    try {
      const res = await fetch(
        `https://newsapi.org/v2/everything?q=test&pageSize=1&apiKey=${this.apiKey}`,
      );
      if (!res.ok) return { ok: false, error: `NewsAPI ${res.status}` };
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async fetchMentions(
    keyword: string,
    options?: {
      maxResults?: number;
      language?: string;
      country?: string;
      from?: string;
      to?: string;
      sortBy?: "relevancy" | "popularity" | "publishedAt";
    },
  ): Promise<ProviderFetchResult> {
    if (!this.isConfigured()) {
      return { mentions: [], fetchedAt: new Date().toISOString(), error: "NEWS_API_KEY 미설정" };
    }

    const pageSize = Math.min(options?.maxResults ?? 20, 100);
    const language = options?.language ?? "";
    const sortBy = options?.sortBy ?? "publishedAt";

    const params = new URLSearchParams({
      q: keyword,
      pageSize: String(pageSize),
      sortBy,
      apiKey: this.apiKey!,
    });

    if (language) params.set("language", language);
    if (options?.from) params.set("from", options.from);
    if (options?.to) params.set("to", options.to);

    try {
      const res = await fetch(
        `https://newsapi.org/v2/everything?${params.toString()}`,
      );

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          mentions: [],
          fetchedAt: new Date().toISOString(),
          error: `NewsAPI ${res.status}: ${body.slice(0, 200)}`,
        };
      }

      const data = await res.json();
      const mentions: SocialMention[] = (data.articles ?? []).map(
        (article: any) => ({
          id: `news-${Buffer.from(article.url ?? "").toString("base64").slice(0, 20)}`,
          platform: "NEWS",
          text: [article.title, article.description].filter(Boolean).join(" — "),
          authorName: article.author ?? article.source?.name ?? null,
          authorHandle: article.source?.id ?? null,
          sentiment: null,
          topics: [],
          publishedAt: article.publishedAt ?? new Date().toISOString(),
          url: article.url,
          engagement: { likes: 0, comments: 0, shares: 0 },
          metadata: {
            source: article.source?.name,
            sourceId: article.source?.id,
            imageUrl: article.urlToImage,
            country: options?.country,
            language: language || undefined,
          },
        }),
      );

      return { mentions, fetchedAt: new Date().toISOString() };
    } catch (err: any) {
      return { mentions: [], fetchedAt: new Date().toISOString(), error: err.message };
    }
  }
}

/**
 * NewsAPI Top Headlines — 국가별 주요 뉴스
 */
export class GlobalNewsHeadlinesAdapter implements SocialProviderAdapter {
  readonly config: ProviderConfig = {
    name: "global_news_headlines",
    platform: "NEWS_HEADLINES",
    requiresApiKey: true,
    envKeyName: "NEWS_API_KEY",
    authType: "API_KEY",
    rateLimitPerDay: 100,
    documentation: "https://newsapi.org/docs/endpoints/top-headlines",
  };

  private apiKey = process.env.NEWS_API_KEY;

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== "your-newsapi-key";
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!this.isConfigured()) return { ok: false, error: "NEWS_API_KEY 미설정" };
    try {
      const res = await fetch(
        `https://newsapi.org/v2/top-headlines?country=us&pageSize=1&apiKey=${this.apiKey}`,
      );
      return res.ok ? { ok: true } : { ok: false, error: `NewsAPI ${res.status}` };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async fetchMentions(
    keyword: string,
    options?: { maxResults?: number; country?: string; category?: string },
  ): Promise<ProviderFetchResult> {
    if (!this.isConfigured()) {
      return { mentions: [], fetchedAt: new Date().toISOString(), error: "NEWS_API_KEY 미설정" };
    }

    const pageSize = Math.min(options?.maxResults ?? 20, 100);
    const country = options?.country ?? "us";

    const params = new URLSearchParams({
      q: keyword,
      country,
      pageSize: String(pageSize),
      apiKey: this.apiKey!,
    });
    if (options?.category) params.set("category", options.category);

    try {
      const res = await fetch(
        `https://newsapi.org/v2/top-headlines?${params.toString()}`,
      );
      if (!res.ok) return { mentions: [], fetchedAt: new Date().toISOString(), error: `NewsAPI ${res.status}` };

      const data = await res.json();
      const mentions: SocialMention[] = (data.articles ?? []).map(
        (article: any) => ({
          id: `headlines-${Buffer.from(article.url ?? "").toString("base64").slice(0, 20)}`,
          platform: "NEWS_HEADLINES",
          text: [article.title, article.description].filter(Boolean).join(" — "),
          authorName: article.author ?? article.source?.name ?? null,
          authorHandle: null,
          sentiment: null,
          topics: [],
          publishedAt: article.publishedAt ?? new Date().toISOString(),
          url: article.url,
          engagement: { likes: 0, comments: 0, shares: 0 },
          metadata: {
            source: article.source?.name,
            country,
            category: options?.category,
          },
        }),
      );

      return { mentions, fetchedAt: new Date().toISOString() };
    } catch (err: any) {
      return { mentions: [], fetchedAt: new Date().toISOString(), error: err.message };
    }
  }
}
