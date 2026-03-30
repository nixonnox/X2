/**
 * Google Trends Adapter (Scaffold)
 *
 * Google Trends 데이터를 수집하여 트렌드 시계열을 제공한다.
 *
 * 연결 방식 (우선순위):
 * 1. SerpAPI Google Trends Engine (SERP_API_KEY)
 * 2. 자체 프록시 서버 (GOOGLE_TRENDS_PROXY_URL) — pytrends 기반
 * 3. 미지원 시 null 반환
 *
 * 환경 변수:
 * - SERP_API_KEY: SerpAPI 경유 시
 * - GOOGLE_TRENDS_PROXY_URL: 자체 pytrends 프록시 서버 URL
 *
 * 제약:
 * - 공식 API 없음 — pytrends(비공식) 또는 유료 API 경유 필수
 * - pytrends 직접 사용 시 분당 ~5회 권장
 * - SerpAPI 경유 시 안정적이나 유료
 */

import { BaseSearchAdapter } from "./base-adapter";
import type {
  AdapterCapability,
  HealthCheckResult,
  CollectOptions,
  NormalizedTrendSeries,
} from "../types";

export class GoogleTrendsAdapter extends BaseSearchAdapter {
  readonly source = "google_trends" as const;
  readonly displayName = "Google Trends";

  private get serpApiKey(): string | undefined {
    return process.env.SERP_API_KEY;
  }

  private get proxyUrl(): string | undefined {
    return process.env.GOOGLE_TRENDS_PROXY_URL;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();

    if (this.serpApiKey) {
      return this.buildHealthResult(
        "ready",
        Date.now() - start,
        "SerpAPI key available for Google Trends",
      );
    }

    if (this.proxyUrl) {
      try {
        const res = await this.fetchWithTimeout(
          `${this.proxyUrl}/health`,
          {},
          5000,
        );
        return this.buildHealthResult(
          res.ok ? "ready" : "unavailable",
          Date.now() - start,
          res.ok ? "Proxy server connected" : `Proxy HTTP ${res.status}`,
        );
      } catch (err) {
        return this.buildHealthResult(
          "unavailable",
          Date.now() - start,
          `Proxy error: ${(err as Error).message}`,
        );
      }
    }

    return this.buildHealthResult(
      "unavailable",
      Date.now() - start,
      "No SERP_API_KEY or GOOGLE_TRENDS_PROXY_URL configured",
    );
  }

  getCapabilities(): AdapterCapability[] {
    return ["trend_series"];
  }

  async collectTrendSeries(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedTrendSeries | null> {
    if (this.serpApiKey) {
      return this.collectViaSerpApi(keyword, options);
    }
    if (this.proxyUrl) {
      return this.collectViaProxy(keyword, options);
    }
    return null;
  }

  // ── SerpAPI Google Trends Engine ──

  private async collectViaSerpApi(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedTrendSeries | null> {
    try {
      const params = new URLSearchParams({
        engine: "google_trends",
        q: keyword,
        geo: options?.country ?? "KR",
        date: "today 12-m",
        api_key: this.serpApiKey!,
      });

      const res = await this.fetchWithTimeout(
        `https://serpapi.com/search.json?${params}`,
      );
      if (!res.ok) return null;

      const data = await res.json();
      const interestOverTime = data.interest_over_time?.timeline_data || [];

      const timelineData = interestOverTime.map(
        (point: { date: string; values: { value: string }[] }) => ({
          date: point.date,
          value: parseInt(point.values?.[0]?.value ?? "0", 10),
        }),
      );

      const relatedQueries = (data.related_queries?.rising || []).map(
        (q: { query: string; value: number }) => ({
          query: q.query,
          score: q.value,
        }),
      );

      const relatedTopics = (data.related_topics?.rising || []).map(
        (t: { topic: { title: string }; value: number }) => ({
          topic: t.topic?.title ?? "",
          score: t.value,
        }),
      );

      return this.buildTrendResult(
        keyword,
        options?.locale ?? "ko",
        timelineData,
        relatedTopics,
        relatedQueries,
      );
    } catch {
      return null;
    }
  }

  // ── 자체 Proxy (pytrends 기반) ──

  private async collectViaProxy(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedTrendSeries | null> {
    try {
      const res = await this.fetchWithTimeout(
        `${this.proxyUrl}/trends`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword,
            geo: options?.country ?? "KR",
            timeframe: "today 12-m",
          }),
        },
      );

      if (!res.ok) return null;

      const data = await res.json();
      const timelineData = (data.interest_over_time || []).map(
        (point: { date: string; value: number }) => ({
          date: point.date,
          value: point.value,
        }),
      );

      return this.buildTrendResult(
        keyword,
        options?.locale ?? "ko",
        timelineData,
        data.related_topics || [],
        data.related_queries || [],
      );
    } catch {
      return null;
    }
  }

  // ── 공통 결과 빌더 ──

  private buildTrendResult(
    keyword: string,
    locale: string,
    timelineData: { date: string; value: number }[],
    relatedTopics: { topic: string; score: number }[],
    relatedQueries: { query: string; score: number }[],
  ): NormalizedTrendSeries | null {
    if (timelineData.length === 0) return null;

    const values = timelineData.map((d) => d.value);
    const half = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, half);
    const secondHalf = values.slice(half);
    const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / (firstHalf.length || 1);
    const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / (secondHalf.length || 1);
    const trendScore = avgFirst > 0 ? (avgSecond - avgFirst) / avgFirst : 0;

    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const seasonality = Math.min(1, Math.sqrt(variance) / (mean || 1));

    return {
      keyword,
      locale,
      source: "google_trends",
      timelineData,
      relatedTopics,
      relatedQueries,
      overallTrend: trendScore > 0.1 ? "rising" : trendScore < -0.1 ? "declining" : "stable",
      trendScore: Math.round(trendScore * 100) / 100,
      seasonality: Math.round(seasonality * 100) / 100,
      yoyGrowth: Math.round(trendScore * 100),
      isBreakout: trendScore > 0.5,
      collectedAt: new Date().toISOString(),
    };
  }
}
