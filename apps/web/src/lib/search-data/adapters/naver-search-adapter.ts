/**
 * Naver Search Adapter
 *
 * 네이버 검색 API를 통해 연관 키워드와 자동완성을 수집한다.
 *
 * API: https://developers.naver.com/docs/serviceapi/search/web/web.md
 *
 * 환경 변수:
 * - NAVER_CLIENT_ID: 네이버 개발자센터 Client ID
 * - NAVER_CLIENT_SECRET: 네이버 개발자센터 Client Secret
 *
 * 제약:
 * - 일 25,000건 호출 제한
 * - 연관 검색어는 별도 공식 API 없음 → 검색 결과에서 추출
 */

import { BaseSearchAdapter } from "./base-adapter";
import type {
  AdapterCapability,
  HealthCheckResult,
  CollectOptions,
  NormalizedRelatedKeyword,
} from "../types";

export class NaverSearchAdapter extends BaseSearchAdapter {
  readonly source = "naver_search" as const;
  readonly displayName = "Naver Search API";

  private get clientId(): string | undefined {
    return process.env.NAVER_CLIENT_ID;
  }

  private get clientSecret(): string | undefined {
    return process.env.NAVER_CLIENT_SECRET;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    if (!this.clientId || !this.clientSecret) {
      return this.buildHealthResult(
        "unavailable",
        Date.now() - start,
        "Missing NAVER_CLIENT_ID or NAVER_CLIENT_SECRET",
      );
    }

    try {
      const res = await this.fetchWithTimeout(
        "https://openapi.naver.com/v1/search/webkr.json?query=test&display=1",
        {
          headers: {
            "X-Naver-Client-Id": this.clientId,
            "X-Naver-Client-Secret": this.clientSecret,
          },
        },
        5000,
      );
      return this.buildHealthResult(
        res.ok ? "ready" : res.status === 429 ? "rate_limited" : "unavailable",
        Date.now() - start,
        res.ok ? "Naver API connected" : `HTTP ${res.status}`,
      );
    } catch (err) {
      return this.buildHealthResult("unavailable", Date.now() - start, (err as Error).message);
    }
  }

  getCapabilities(): AdapterCapability[] {
    return ["related_keywords", "autocomplete"];
  }

  async collectRelatedKeywords(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedRelatedKeyword[]> {
    if (!this.clientId || !this.clientSecret) return [];

    const locale = options?.locale ?? "ko";
    const maxResults = options?.maxResults ?? 20;
    const results: NormalizedRelatedKeyword[] = [];

    // 네이버 검색 API로 웹 검색 → 연관 키워드 추출
    try {
      const params = new URLSearchParams({
        query: keyword,
        display: String(Math.min(maxResults, 100)),
        sort: "sim",
      });

      const res = await this.fetchWithTimeout(
        `https://openapi.naver.com/v1/search/webkr.json?${params}`,
        {
          headers: {
            "X-Naver-Client-Id": this.clientId,
            "X-Naver-Client-Secret": this.clientSecret,
          },
        },
      );

      if (!res.ok) return [];

      const data = await res.json();
      const items: { title: string; description: string }[] = data.items || [];

      // 검색 결과 제목에서 키워드 변형 추출
      const seen = new Set<string>();
      for (const item of items) {
        const cleanTitle = item.title
          .replace(/<\/?b>/g, "")
          .replace(/&[a-z]+;/g, " ")
          .trim();

        if (cleanTitle && !seen.has(cleanTitle.toLowerCase()) && cleanTitle !== keyword) {
          seen.add(cleanTitle.toLowerCase());
          results.push({
            keyword: cleanTitle,
            normalizedKeyword: this.normalizeKeyword(cleanTitle),
            parentKeyword: keyword,
            locale,
            source: "naver_search",
            sourceType: "related",
            position: results.length + 1,
            collectedAt: new Date().toISOString(),
          });
        }

        if (results.length >= maxResults) break;
      }
    } catch {
      // 실패 시 빈 배열 반환
    }

    return results;
  }
}
