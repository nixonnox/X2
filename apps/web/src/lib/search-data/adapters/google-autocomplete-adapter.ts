/**
 * Google Autocomplete Adapter
 *
 * Google 자동완성 API를 통해 연관 키워드를 수집한다.
 *
 * 연결 방식:
 * - 옵션 1: SerpAPI Google Autocomplete (안정적, 유료)
 * - 옵션 2: 공개 엔드포인트 (무료, 불안정)
 *
 * 환경 변수:
 * - SERP_API_KEY: SerpAPI 사용 시 (옵션 1)
 * - 없으면: 공개 엔드포인트 시도 → 실패 시 빈 배열
 *
 * 제약:
 * - 공개 엔드포인트는 과도한 호출 시 IP 차단 가능
 * - SerpAPI 경유 권장 ($50/5,000 searches)
 */

import { BaseSearchAdapter } from "./base-adapter";
import type {
  AdapterCapability,
  HealthCheckResult,
  CollectOptions,
  NormalizedRelatedKeyword,
} from "../types";

export class GoogleAutocompleteAdapter extends BaseSearchAdapter {
  readonly source = "google_autocomplete" as const;
  readonly displayName = "Google Autocomplete";

  private get serpApiKey(): string | undefined {
    return process.env.SERP_API_KEY;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      // SerpAPI 사용 가능 여부 확인
      if (this.serpApiKey) {
        return this.buildHealthResult("ready", Date.now() - start, "SerpAPI key available");
      }
      // 공개 엔드포인트 테스트
      const res = await this.fetchWithTimeout(
        "https://suggestqueries.google.com/complete/search?client=firefox&q=test&hl=ko",
        {},
        5000,
      );
      return this.buildHealthResult(
        res.ok ? "ready" : "unavailable",
        Date.now() - start,
        res.ok ? "Public endpoint available" : `HTTP ${res.status}`,
      );
    } catch (err) {
      return this.buildHealthResult("unavailable", Date.now() - start, (err as Error).message);
    }
  }

  getCapabilities(): AdapterCapability[] {
    return ["autocomplete", "related_keywords"];
  }

  async collectRelatedKeywords(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedRelatedKeyword[]> {
    const locale = options?.locale ?? "ko";
    const maxResults = options?.maxResults ?? 20;

    if (this.serpApiKey) {
      return this.collectViaSerpApi(keyword, locale, maxResults);
    }
    return this.collectViaPublicEndpoint(keyword, locale, maxResults);
  }

  // ── SerpAPI 경유 ──

  private async collectViaSerpApi(
    keyword: string,
    locale: string,
    maxResults: number,
  ): Promise<NormalizedRelatedKeyword[]> {
    const params = new URLSearchParams({
      engine: "google_autocomplete",
      q: keyword,
      hl: locale,
      api_key: this.serpApiKey!,
    });

    try {
      const res = await this.fetchWithTimeout(
        `https://serpapi.com/search.json?${params}`,
      );
      if (!res.ok) return [];

      const data = await res.json();
      const suggestions: string[] = (data.suggestions || [])
        .map((s: { value: string }) => s.value)
        .slice(0, maxResults);

      return suggestions.map((suggestion, i) => ({
        keyword: suggestion,
        normalizedKeyword: this.normalizeKeyword(suggestion),
        parentKeyword: keyword,
        locale,
        source: "google_autocomplete" as const,
        sourceType: "autocomplete" as const,
        position: i + 1,
        collectedAt: new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  // ── 공개 엔드포인트 ──

  private async collectViaPublicEndpoint(
    keyword: string,
    locale: string,
    maxResults: number,
  ): Promise<NormalizedRelatedKeyword[]> {
    try {
      const params = new URLSearchParams({
        client: "firefox",
        q: keyword,
        hl: locale,
      });

      const res = await this.fetchWithTimeout(
        `https://suggestqueries.google.com/complete/search?${params}`,
        {},
        10000,
      );
      if (!res.ok) return [];

      const data = await res.json();
      // Firefox JSON format: [query, [suggestions]]
      const suggestions: string[] = (data[1] || []).slice(0, maxResults);

      return suggestions.map((suggestion, i) => ({
        keyword: suggestion,
        normalizedKeyword: this.normalizeKeyword(suggestion),
        parentKeyword: keyword,
        locale,
        source: "google_autocomplete" as const,
        sourceType: "autocomplete" as const,
        position: i + 1,
        collectedAt: new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }
}
