/**
 * NaverSearchApiAdapter
 *
 * 네이버 검색 API를 통해 블로그/뉴스 키워드 멘션을 수집.
 *
 * 공식 API:
 * - https://developers.naver.com/docs/serviceapi/search/blog/blog.md
 * - https://developers.naver.com/docs/serviceapi/search/news/news.md
 *
 * 제약:
 * - Client ID + Client Secret 필요 (무료, 일일 25,000건)
 * - 검색 결과만 제공 (전문 크롤링 아님)
 * - 블로그/뉴스 제목+설명+링크+날짜
 * - HTML 태그 포함 응답 (strip 필요)
 */

import type {
  SocialProviderAdapter,
  SocialMention,
  ProviderConfig,
  ProviderFetchResult,
} from "./social-provider-registry.service";

export class NaverBlogSearchAdapter implements SocialProviderAdapter {
  readonly config: ProviderConfig = {
    name: "naver_blog",
    platform: "NAVER_BLOG",
    requiresApiKey: true,
    envKeyName: "NAVER_CLIENT_ID",
    authType: "API_KEY",
    rateLimitPerDay: 25000,
    documentation:
      "https://developers.naver.com/docs/serviceapi/search/blog/blog.md",
  };

  private clientId: string | undefined;
  private clientSecret: string | undefined;

  constructor() {
    this.clientId = process.env.NAVER_CLIENT_ID;
    this.clientSecret = process.env.NAVER_CLIENT_SECRET;
  }

  isConfigured(): boolean {
    return (
      !!this.clientId &&
      !!this.clientSecret &&
      this.clientId !== "your-naver-client-id"
    );
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        error:
          "NAVER_CLIENT_ID/SECRET 미설정 — 네이버 개발자센터에서 발급 필요",
      };
    }
    try {
      const res = await fetch(
        `https://openapi.naver.com/v1/search/blog.json?query=test&display=1`,
        {
          headers: {
            "X-Naver-Client-Id": this.clientId!,
            "X-Naver-Client-Secret": this.clientSecret!,
          },
        },
      );
      if (!res.ok) return { ok: false, error: `Naver API ${res.status}` };
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: `연결 실패: ${err.message}` };
    }
  }

  async fetchMentions(
    keyword: string,
    options?: { maxResults?: number },
  ): Promise<ProviderFetchResult> {
    if (!this.isConfigured()) {
      return {
        mentions: [],
        fetchedAt: new Date().toISOString(),
        error: "NAVER_CLIENT_ID 미설정",
      };
    }

    const display = Math.min(options?.maxResults ?? 20, 100);
    const mentions: SocialMention[] = [];

    try {
      const url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(keyword)}&display=${display}&sort=date`;
      const res = await fetch(url, {
        headers: {
          "X-Naver-Client-Id": this.clientId!,
          "X-Naver-Client-Secret": this.clientSecret!,
        },
      });

      if (!res.ok) {
        return {
          mentions: [],
          fetchedAt: new Date().toISOString(),
          error: `Naver Blog API ${res.status}`,
        };
      }

      const data = await res.json();
      for (const item of data.items ?? []) {
        mentions.push({
          id: `naver-blog-${Buffer.from(item.link).toString("base64").slice(0, 20)}`,
          platform: "NAVER_BLOG",
          text: stripHtml(item.title + " " + (item.description ?? "")),
          authorName: item.bloggername ?? null,
          authorHandle: null,
          sentiment: null,
          topics: [],
          publishedAt: item.postdate
            ? `${item.postdate.slice(0, 4)}-${item.postdate.slice(4, 6)}-${item.postdate.slice(6, 8)}`
            : new Date().toISOString(),
          url: item.link,
          engagement: { likes: 0, comments: 0, shares: 0 },
        });
      }
    } catch (err: any) {
      return {
        mentions: [],
        fetchedAt: new Date().toISOString(),
        error: err.message,
      };
    }

    return { mentions, fetchedAt: new Date().toISOString() };
  }
}

export class NaverNewsSearchAdapter implements SocialProviderAdapter {
  readonly config: ProviderConfig = {
    name: "naver_news",
    platform: "NAVER_NEWS",
    requiresApiKey: true,
    envKeyName: "NAVER_CLIENT_ID",
    authType: "API_KEY",
    rateLimitPerDay: 25000,
    documentation:
      "https://developers.naver.com/docs/serviceapi/search/news/news.md",
  };

  private clientId: string | undefined;
  private clientSecret: string | undefined;

  constructor() {
    this.clientId = process.env.NAVER_CLIENT_ID;
    this.clientSecret = process.env.NAVER_CLIENT_SECRET;
  }

  isConfigured(): boolean {
    return (
      !!this.clientId &&
      !!this.clientSecret &&
      this.clientId !== "your-naver-client-id"
    );
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, error: "NAVER_CLIENT_ID/SECRET 미설정" };
    }
    try {
      const res = await fetch(
        `https://openapi.naver.com/v1/search/news.json?query=test&display=1`,
        {
          headers: {
            "X-Naver-Client-Id": this.clientId!,
            "X-Naver-Client-Secret": this.clientSecret!,
          },
        },
      );
      return res.ok
        ? { ok: true }
        : { ok: false, error: `Naver API ${res.status}` };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async fetchMentions(
    keyword: string,
    options?: { maxResults?: number },
  ): Promise<ProviderFetchResult> {
    if (!this.isConfigured()) {
      return {
        mentions: [],
        fetchedAt: new Date().toISOString(),
        error: "NAVER_CLIENT_ID 미설정",
      };
    }

    const display = Math.min(options?.maxResults ?? 20, 100);
    const mentions: SocialMention[] = [];

    try {
      const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(keyword)}&display=${display}&sort=date`;
      const res = await fetch(url, {
        headers: {
          "X-Naver-Client-Id": this.clientId!,
          "X-Naver-Client-Secret": this.clientSecret!,
        },
      });

      if (!res.ok) {
        return {
          mentions: [],
          fetchedAt: new Date().toISOString(),
          error: `Naver News API ${res.status}`,
        };
      }

      const data = await res.json();
      for (const item of data.items ?? []) {
        mentions.push({
          id: `naver-news-${Buffer.from(item.link).toString("base64").slice(0, 20)}`,
          platform: "NAVER_NEWS",
          text: stripHtml(item.title + " " + (item.description ?? "")),
          authorName: null,
          authorHandle: null,
          sentiment: null,
          topics: [],
          publishedAt: item.pubDate
            ? new Date(item.pubDate).toISOString()
            : new Date().toISOString(),
          url: item.originallink ?? item.link,
          engagement: { likes: 0, comments: 0, shares: 0 },
        });
      }
    } catch (err: any) {
      return {
        mentions: [],
        fetchedAt: new Date().toISOString(),
        error: err.message,
      };
    }

    return { mentions, fetchedAt: new Date().toISOString() };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z]+;/gi, " ")
    .trim();
}
