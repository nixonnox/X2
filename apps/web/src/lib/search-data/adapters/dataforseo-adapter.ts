/**
 * DataForSEO Adapter (Scaffold)
 *
 * DataForSEO API를 통해 검색량, 연관 키워드, SERP, 트렌드를 수집한다.
 * 가장 포괄적인 데이터 소스로, 대규모 운영 시 비용 효율적.
 *
 * API: https://docs.dataforseo.com/
 *
 * 환경 변수:
 * - DATAFORSEO_LOGIN: API login (email)
 * - DATAFORSEO_PASSWORD: API password
 *
 * 제약:
 * - $0.002/task (종량제)
 * - 초당 2,000 요청 가능
 * - Sandbox 모드로 무료 테스트 가능 (sandbox.dataforseo.com)
 */

import { BaseSearchAdapter } from "./base-adapter";
import type {
  AdapterCapability,
  HealthCheckResult,
  CollectOptions,
  NormalizedSearchKeyword,
  NormalizedRelatedKeyword,
  NormalizedTrendSeries,
  NormalizedSerpDocument,
  SerpOrganicResult,
} from "../types";

export class DataForSeoAdapter extends BaseSearchAdapter {
  readonly source = "dataforseo" as const;
  readonly displayName = "DataForSEO";

  private get login(): string | undefined {
    return process.env.DATAFORSEO_LOGIN;
  }

  private get password(): string | undefined {
    return process.env.DATAFORSEO_PASSWORD;
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.login}:${this.password}`).toString("base64")}`;
  }

  private get baseUrl(): string {
    // sandbox.dataforseo.com 으로 전환 가능
    return process.env.DATAFORSEO_SANDBOX === "true"
      ? "https://sandbox.dataforseo.com"
      : "https://api.dataforseo.com";
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    if (!this.login || !this.password) {
      return this.buildHealthResult(
        "unavailable",
        Date.now() - start,
        "Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD",
      );
    }

    try {
      const res = await this.fetchWithTimeout(
        `${this.baseUrl}/v3/appendix/user_data`,
        {
          method: "GET",
          headers: { Authorization: this.authHeader },
        },
        5000,
      );
      if (!res.ok) {
        return this.buildHealthResult("unavailable", Date.now() - start, `HTTP ${res.status}`);
      }
      const data = await res.json();
      const balance = data.tasks?.[0]?.result?.[0]?.money?.balance;
      return this.buildHealthResult(
        "ready",
        Date.now() - start,
        `DataForSEO connected — balance: $${balance ?? "?"}`,
      );
    } catch (err) {
      return this.buildHealthResult("unavailable", Date.now() - start, (err as Error).message);
    }
  }

  getCapabilities(): AdapterCapability[] {
    return ["seed_keyword_volume", "related_keywords", "trend_series", "serp_documents", "questions", "competition"];
  }

  /**
   * 키워드 검색량 수집
   *
   * Endpoint: /v3/keywords_data/google_ads/search_volume/live
   */
  async collectSeedKeywordData(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedSearchKeyword | null> {
    if (!this.login || !this.password) return null;

    try {
      const body = [
        {
          keywords: [keyword],
          language_code: options?.locale ?? "ko",
          location_code: 2410, // South Korea
        },
      ];

      const res = await this.fetchWithTimeout(
        `${this.baseUrl}/v3/keywords_data/google_ads/search_volume/live`,
        {
          method: "POST",
          headers: {
            Authorization: this.authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) return null;

      const data = await res.json();
      const result = data.tasks?.[0]?.result?.[0];
      if (!result) return null;

      return {
        keyword,
        normalizedKeyword: this.normalizeKeyword(keyword),
        locale: options?.locale ?? "ko",
        source: "dataforseo",
        avgMonthlySearches: result.search_volume ?? 0,
        cpc: result.cpc ?? undefined,
        competitionIndex: result.competition ?? undefined,
        competitionLevel: mapCompetition(result.competition),
        monthlyBreakdown: (result.monthly_searches || []).map(
          (m: { year: number; month: number; search_volume: number }) => ({
            year: m.year,
            month: m.month,
            searches: m.search_volume,
          }),
        ),
        collectedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * 연관 키워드 수집
   *
   * Endpoint: /v3/keywords_data/google_ads/keywords_for_keywords/live
   */
  async collectRelatedKeywords(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedRelatedKeyword[]> {
    if (!this.login || !this.password) return [];

    const locale = options?.locale ?? "ko";
    const maxResults = options?.maxResults ?? 30;

    try {
      const body = [
        {
          keywords: [keyword],
          language_code: locale,
          location_code: 2410,
        },
      ];

      const res = await this.fetchWithTimeout(
        `${this.baseUrl}/v3/keywords_data/google_ads/keywords_for_keywords/live`,
        {
          method: "POST",
          headers: {
            Authorization: this.authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) return [];

      const data = await res.json();
      const items = data.tasks?.[0]?.result || [];

      return items.slice(0, maxResults).map(
        (item: { keyword: string; search_volume: number }, i: number) => ({
          keyword: item.keyword,
          normalizedKeyword: this.normalizeKeyword(item.keyword),
          parentKeyword: keyword,
          locale,
          source: "dataforseo" as const,
          sourceType: "related" as const,
          avgMonthlySearches: item.search_volume ?? 0,
          position: i + 1,
          collectedAt: new Date().toISOString(),
        }),
      );
    } catch {
      return [];
    }
  }

  /**
   * SERP 문서 수집
   *
   * Endpoint: /v3/serp/google/organic/live/advanced
   */
  async collectSerpDocuments(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedSerpDocument | null> {
    if (!this.login || !this.password) return null;

    try {
      const body = [
        {
          keyword,
          language_code: options?.locale ?? "ko",
          location_code: 2410,
          device: "desktop",
          depth: 20,
        },
      ];

      const res = await this.fetchWithTimeout(
        `${this.baseUrl}/v3/serp/google/organic/live/advanced`,
        {
          method: "POST",
          headers: {
            Authorization: this.authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) return null;

      const data = await res.json();
      const items = data.tasks?.[0]?.result?.[0]?.items || [];

      const organicResults: SerpOrganicResult[] = [];
      const relatedSearches: string[] = [];
      const peopleAlsoAsk: string[] = [];
      let featuredSnippet: NormalizedSerpDocument["featuredSnippet"];

      for (const item of items) {
        if (item.type === "organic") {
          organicResults.push({
            position: item.rank_group ?? organicResults.length + 1,
            url: item.url ?? "",
            domain: item.domain ?? "",
            title: item.title ?? "",
            snippet: item.description ?? "",
            isAd: false,
          });
        } else if (item.type === "people_also_ask") {
          for (const q of item.items || []) {
            if (q.title) peopleAlsoAsk.push(q.title);
          }
        } else if (item.type === "related_searches") {
          for (const r of item.items || []) {
            if (r.title) relatedSearches.push(r.title);
          }
        } else if (item.type === "featured_snippet") {
          featuredSnippet = {
            title: item.title ?? "",
            snippet: item.description ?? "",
            url: item.url ?? "",
          };
        }
      }

      return {
        keyword,
        locale: options?.locale ?? "ko",
        engine: "google",
        source: "dataforseo",
        organicResults,
        relatedSearches,
        peopleAlsoAsk,
        featuredSnippet,
        totalResults: data.tasks?.[0]?.result?.[0]?.se_results_count,
        collectedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * 트렌드 수집
   *
   * Endpoint: /v3/keywords_data/google_trends/explore/live
   */
  async collectTrendSeries(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedTrendSeries | null> {
    if (!this.login || !this.password) return null;

    try {
      const body = [
        {
          keywords: [keyword],
          location_code: 2410,
          language_code: options?.locale ?? "ko",
          time_range: "past_12_months",
        },
      ];

      const res = await this.fetchWithTimeout(
        `${this.baseUrl}/v3/keywords_data/google_trends/explore/live`,
        {
          method: "POST",
          headers: {
            Authorization: this.authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) return null;

      const data = await res.json();
      const points = data.tasks?.[0]?.result?.[0]?.items?.[0]?.data || [];

      const timelineData = points.map(
        (p: { date_from: string; values: number[] }) => ({
          date: p.date_from?.substring(0, 7) ?? "",
          value: p.values?.[0] ?? 0,
        }),
      );

      if (timelineData.length === 0) return null;

      const values = timelineData.map((d: { value: number }) => d.value);
      const half = Math.floor(values.length / 2);
      const avgFirst = values.slice(0, half).reduce((s: number, v: number) => s + v, 0) / (half || 1);
      const avgSecond = values.slice(half).reduce((s: number, v: number) => s + v, 0) / ((values.length - half) || 1);
      const trendScore = avgFirst > 0 ? (avgSecond - avgFirst) / avgFirst : 0;

      const mean = values.reduce((s: number, v: number) => s + v, 0) / values.length;
      const variance = values.reduce((s: number, v: number) => s + (v - mean) ** 2, 0) / values.length;
      const seasonality = Math.min(1, Math.sqrt(variance) / (mean || 1));

      return {
        keyword,
        locale: options?.locale ?? "ko",
        source: "dataforseo",
        timelineData,
        overallTrend: trendScore > 0.1 ? "rising" : trendScore < -0.1 ? "declining" : "stable",
        trendScore: Math.round(trendScore * 100) / 100,
        seasonality: Math.round(seasonality * 100) / 100,
        yoyGrowth: Math.round(trendScore * 100),
        isBreakout: trendScore > 0.5,
        collectedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }
}

function mapCompetition(value?: number): "low" | "medium" | "high" | undefined {
  if (value == null) return undefined;
  if (value < 0.33) return "low";
  if (value < 0.67) return "medium";
  return "high";
}
