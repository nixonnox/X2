/**
 * GDELT News Adapter
 *
 * GDELT (Global Database of Events, Language, and Tone) 기반
 * 글로벌 뉴스/이슈 메타데이터 수집.
 *
 * API: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
 * - 무료, API 키 불필요
 * - 실시간 글로벌 뉴스 데이터
 * - 65개 언어, 국가/언어/시간 필터
 * - 감성 분석(tone) 포함
 *
 * 제약:
 * - 분당 호출 제한 있음 (문서화 안 됨, 합리적 사용 권장)
 * - 최대 250건/요청
 * - 최근 3개월 데이터만 검색 가능
 */

import type {
  SocialProviderAdapter,
  SocialMention,
  ProviderConfig,
  ProviderFetchResult,
} from "./social-provider-registry.service";

export class GdeltNewsAdapter implements SocialProviderAdapter {
  readonly config: ProviderConfig = {
    name: "gdelt_news",
    platform: "GDELT",
    requiresApiKey: false,
    envKeyName: "",
    authType: "NONE",
    rateLimitPerDay: 1000,
    documentation: "https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/",
  };

  isConfigured(): boolean {
    return true; // No API key needed
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(
        "https://api.gdeltproject.org/api/v2/doc/doc?query=test&mode=artlist&maxrecords=1&format=json",
      );
      return res.ok ? { ok: true } : { ok: false, error: `GDELT API ${res.status}` };
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
      startDate?: string; // YYYYMMDDHHMMSS
      endDate?: string;
      tone?: "positive" | "negative";
    },
  ): Promise<ProviderFetchResult> {
    const maxRecords = Math.min(options?.maxResults ?? 50, 250);

    // Build GDELT query
    let query = encodeURIComponent(keyword);

    // Language filter (GDELT uses language codes like "Korean", "English")
    if (options?.language) {
      const langMap: Record<string, string> = {
        ko: "Korean",
        en: "English",
        ja: "Japanese",
        zh: "Chinese",
        de: "German",
        fr: "French",
        es: "Spanish",
        pt: "Portuguese",
        th: "Thai",
        vi: "Vietnamese",
        id: "Indonesian",
      };
      const gdeltLang = langMap[options.language];
      if (gdeltLang) query += `+sourcelang:${gdeltLang.toLowerCase()}`;
    }

    // Country filter
    if (options?.country) {
      query += `+sourcecountry:${options.country}`;
    }

    // Tone filter
    if (options?.tone === "positive") {
      query += "+tone>5";
    } else if (options?.tone === "negative") {
      query += "+tone<-5";
    }

    const params = new URLSearchParams({
      query,
      mode: "artlist",
      maxrecords: String(maxRecords),
      format: "json",
      sort: "datedesc",
    });

    if (options?.startDate) params.set("startdatetime", options.startDate);
    if (options?.endDate) params.set("enddatetime", options.endDate);

    try {
      const res = await fetch(
        `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`,
      );

      if (!res.ok) {
        return {
          mentions: [],
          fetchedAt: new Date().toISOString(),
          error: `GDELT API ${res.status}`,
        };
      }

      const data = await res.json();
      const articles = data.articles ?? [];

      const mentions: SocialMention[] = articles.map((article: any) => {
        // GDELT tone: -100 to +100, map to sentiment
        const tone = article.tone ?? 0;
        let sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | null = null;
        if (tone > 3) sentiment = "POSITIVE";
        else if (tone < -3) sentiment = "NEGATIVE";
        else sentiment = "NEUTRAL";

        return {
          id: `gdelt-${article.url ? Buffer.from(article.url).toString("base64").slice(0, 20) : Date.now()}`,
          platform: "GDELT",
          text: [article.title, article.seendate ? `(${article.seendate})` : ""].filter(Boolean).join(" "),
          authorName: article.domain ?? article.sourcecountry ?? null,
          authorHandle: null,
          sentiment,
          topics: [],
          publishedAt: article.seendate
            ? parseGdeltDate(article.seendate)
            : new Date().toISOString(),
          url: article.url ?? null,
          engagement: { likes: 0, comments: 0, shares: article.socialimage ? 1 : 0 },
          metadata: {
            source: article.domain,
            country: article.sourcecountry,
            language: article.language,
            tone: article.tone,
            socialImage: article.socialimage,
          },
        };
      });

      return { mentions, fetchedAt: new Date().toISOString() };
    } catch (err: any) {
      return {
        mentions: [],
        fetchedAt: new Date().toISOString(),
        error: err.message,
      };
    }
  }

  /**
   * GDELT Geo API — 국가별 뉴스 볼륨 히트맵 데이터
   */
  async fetchGeoData(
    keyword: string,
  ): Promise<{ countries: { country: string; count: number }[]; error?: string }> {
    try {
      const res = await fetch(
        `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(keyword)}&mode=pointdata&format=json&maxrecords=250`,
      );

      if (!res.ok) return { countries: [], error: `HTTP ${res.status}` };

      const data = await res.json();
      const countryMap = new Map<string, number>();

      for (const point of data.features ?? []) {
        const country = point.properties?.sourcecountry ?? "UNKNOWN";
        countryMap.set(country, (countryMap.get(country) ?? 0) + 1);
      }

      const countries = Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);

      return { countries };
    } catch (err: any) {
      return { countries: [], error: err.message };
    }
  }
}

function parseGdeltDate(dateStr: string): string {
  // GDELT format: "20260331T120000Z" or "2026-03-31T12:00:00Z"
  if (dateStr.includes("T") && dateStr.length === 16) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T${dateStr.slice(9, 11)}:${dateStr.slice(11, 13)}:${dateStr.slice(13, 15)}Z`;
  }
  return new Date(dateStr).toISOString();
}
