/**
 * SerpAPI Adapter
 *
 * SerpAPI를 통해 Google/Naver SERP 문서, PAA, 연관 검색을 수집한다.
 *
 * API: https://serpapi.com/search-api
 *
 * 환경 변수:
 * - SERP_API_KEY: SerpAPI API Key
 *
 * 제약:
 * - $50/5,000 searches (Startup plan)
 * - 플랜별 동시 요청 수 제한
 */

import { BaseSearchAdapter } from "./base-adapter";
import type {
  AdapterCapability,
  HealthCheckResult,
  CollectOptions,
  NormalizedRelatedKeyword,
  NormalizedSerpDocument,
  SerpOrganicResult,
} from "../types";

export class SerpApiAdapter extends BaseSearchAdapter {
  readonly source = "serp_api" as const;
  readonly displayName = "SerpAPI";

  private get apiKey(): string | undefined {
    return process.env.SERP_API_KEY;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    if (!this.apiKey) {
      return this.buildHealthResult(
        "unavailable",
        Date.now() - start,
        "Missing SERP_API_KEY",
      );
    }

    try {
      // account info로 잔여 크레딧 확인
      const res = await this.fetchWithTimeout(
        `https://serpapi.com/account.json?api_key=${this.apiKey}`,
        {},
        5000,
      );
      if (!res.ok) {
        return this.buildHealthResult("unavailable", Date.now() - start, `HTTP ${res.status}`);
      }
      const account = await res.json();
      return this.buildHealthResult(
        "ready",
        Date.now() - start,
        `SerpAPI connected — ${account.searches_remaining ?? "?"} searches remaining`,
      );
    } catch (err) {
      return this.buildHealthResult("unavailable", Date.now() - start, (err as Error).message);
    }
  }

  getCapabilities(): AdapterCapability[] {
    return ["serp_documents", "related_keywords", "questions", "autocomplete"];
  }

  async collectSerpDocuments(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedSerpDocument | null> {
    if (!this.apiKey) return null;

    try {
      const params = new URLSearchParams({
        engine: "google",
        q: keyword,
        hl: options?.locale ?? "ko",
        gl: options?.country ?? "kr",
        num: "20",
        api_key: this.apiKey,
      });

      const res = await this.fetchWithTimeout(
        `https://serpapi.com/search.json?${params}`,
      );
      if (!res.ok) return null;

      const data = await res.json();

      // Organic results
      const organicResults: SerpOrganicResult[] = (data.organic_results || []).map(
        (r: { position: number; link: string; title: string; snippet: string }, i: number) => ({
          position: r.position ?? i + 1,
          url: r.link ?? "",
          domain: extractDomain(r.link ?? ""),
          title: r.title ?? "",
          snippet: r.snippet ?? "",
          isAd: false,
        }),
      );

      // Related searches
      const relatedSearches: string[] = (data.related_searches || []).map(
        (r: { query: string }) => r.query,
      );

      // People Also Ask
      const peopleAlsoAsk: string[] = (data.related_questions || []).map(
        (q: { question: string }) => q.question,
      );

      // Featured snippet
      const featuredSnippet = data.answer_box
        ? {
            title: data.answer_box.title ?? "",
            snippet: data.answer_box.snippet ?? data.answer_box.answer ?? "",
            url: data.answer_box.link ?? "",
          }
        : undefined;

      return {
        keyword,
        locale: options?.locale ?? "ko",
        engine: "google",
        source: "serp_api",
        organicResults,
        relatedSearches,
        peopleAlsoAsk,
        featuredSnippet,
        totalResults: data.search_information?.total_results,
        collectedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  async collectRelatedKeywords(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedRelatedKeyword[]> {
    if (!this.apiKey) return [];

    const locale = options?.locale ?? "ko";
    const results: NormalizedRelatedKeyword[] = [];

    try {
      // SERP 결과에서 연관 검색어 + PAA 추출
      const serpDoc = await this.collectSerpDocuments(keyword, options);
      if (!serpDoc) return [];

      // Related searches → related keywords
      for (const [i, query] of serpDoc.relatedSearches.entries()) {
        results.push({
          keyword: query,
          normalizedKeyword: this.normalizeKeyword(query),
          parentKeyword: keyword,
          locale,
          source: "serp_api",
          sourceType: "related",
          position: i + 1,
          collectedAt: new Date().toISOString(),
        });
      }

      // People Also Ask → question keywords
      for (const [i, question] of serpDoc.peopleAlsoAsk.entries()) {
        results.push({
          keyword: question,
          normalizedKeyword: this.normalizeKeyword(question),
          parentKeyword: keyword,
          locale,
          source: "serp_api",
          sourceType: "paa",
          position: i + 1,
          collectedAt: new Date().toISOString(),
        });
      }
    } catch {
      // 실패 시 빈 배열
    }

    const maxResults = options?.maxResults ?? 30;
    return results.slice(0, maxResults);
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
