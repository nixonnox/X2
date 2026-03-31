/**
 * Naver DataLab Adapter
 *
 * 네이버 DataLab API를 통해 검색 트렌드 시계열 데이터를 수집한다.
 *
 * API: https://developers.naver.com/docs/serviceapi/datalab/search/search.md
 *
 * 환경 변수:
 * - NAVER_CLIENT_ID: 네이버 개발자센터 Client ID
 * - NAVER_CLIENT_SECRET: 네이버 개발자센터 Client Secret
 *
 * 제약:
 * - 일 1,000건 호출 제한
 * - 상대적 검색량만 제공 (0-100 스케일)
 * - 최대 5개 키워드 동시 비교 가능
 */

import { BaseSearchAdapter } from "./base-adapter";
import type {
  AdapterCapability,
  HealthCheckResult,
  CollectOptions,
  NormalizedTrendSeries,
} from "../types";

export class NaverDatalabAdapter extends BaseSearchAdapter {
  readonly source = "naver_datalab" as const;
  readonly displayName = "Naver DataLab API";

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
    // DataLab API는 POST만 지원하므로 간단한 쿼리로 테스트
    try {
      const body = buildDatalabBody("테스트", 1);
      const res = await this.fetchWithTimeout(
        "https://openapi.naver.com/v1/datalab/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Naver-Client-Id": this.clientId,
            "X-Naver-Client-Secret": this.clientSecret,
          },
          body: JSON.stringify(body),
        },
        5000,
      );
      return this.buildHealthResult(
        res.ok ? "ready" : res.status === 429 ? "rate_limited" : "unavailable",
        Date.now() - start,
        res.ok ? "Naver DataLab connected" : `HTTP ${res.status}`,
      );
    } catch (err) {
      return this.buildHealthResult("unavailable", Date.now() - start, (err as Error).message);
    }
  }

  getCapabilities(): AdapterCapability[] {
    return ["trend_series", "demographic"];
  }

  /**
   * 성별/연령별 검색 트렌드 비교 수집.
   * 네이버 DataLab 검색어 트렌드 API의 gender/ages 필터를 활용.
   *
   * gender: "" (전체), "m" (남성), "f" (여성)
   * ages: "1"(0-12), "2"(13-18), "3"(19-24), "4"(25-29), "5"(30-34),
   *        "6"(35-39), "7"(40-44), "8"(45-49), "9"(50-54), "10"(55-59), "11"(60+)
   */
  async collectDemographicTrend(
    keyword: string,
    options?: { months?: number },
  ): Promise<DemographicTrendResult | null> {
    if (!this.clientId || !this.clientSecret) return null;

    const months = options?.months ?? 12;
    const genders = ["", "m", "f"] as const;
    const ageGroups = [
      { code: "3", label: "19-24" },
      { code: "4", label: "25-29" },
      { code: "5", label: "30-34" },
      { code: "6", label: "35-39" },
      { code: "7", label: "40-44" },
      { code: "8", label: "45-49" },
      { code: "9", label: "50-54" },
      { code: "10", label: "55-59" },
      { code: "11", label: "60+" },
    ];

    try {
      // 1. Gender comparison
      const genderResults: { gender: string; avgRatio: number }[] = [];
      for (const g of genders) {
        const body = { ...buildDatalabBody(keyword, months), ...(g ? { gender: g } : {}) };
        const res = await this.fetchWithTimeout(
          "https://openapi.naver.com/v1/datalab/search",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Naver-Client-Id": this.clientId!,
              "X-Naver-Client-Secret": this.clientSecret!,
            },
            body: JSON.stringify(body),
          },
        );
        if (!res.ok) continue;
        const data = await res.json();
        const points = data.results?.[0]?.data ?? [];
        const avg = points.length > 0
          ? points.reduce((s: number, p: any) => s + p.ratio, 0) / points.length
          : 0;
        genderResults.push({ gender: g || "all", avgRatio: Math.round(avg * 10) / 10 });
      }

      // 2. Age group comparison
      const ageResults: { ageGroup: string; label: string; avgRatio: number }[] = [];
      for (const ag of ageGroups) {
        const body = { ...buildDatalabBody(keyword, months), ages: [ag.code] };
        const res = await this.fetchWithTimeout(
          "https://openapi.naver.com/v1/datalab/search",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Naver-Client-Id": this.clientId!,
              "X-Naver-Client-Secret": this.clientSecret!,
            },
            body: JSON.stringify(body),
          },
        );
        if (!res.ok) continue;
        const data = await res.json();
        const points = data.results?.[0]?.data ?? [];
        const avg = points.length > 0
          ? points.reduce((s: number, p: any) => s + p.ratio, 0) / points.length
          : 0;
        ageResults.push({ ageGroup: ag.code, label: ag.label, avgRatio: Math.round(avg * 10) / 10 });
      }

      return {
        keyword,
        genderBreakdown: genderResults,
        ageBreakdown: ageResults,
        collectedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  async collectTrendSeries(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedTrendSeries | null> {
    if (!this.clientId || !this.clientSecret) return null;

    const months = 12;

    try {
      const body = buildDatalabBody(keyword, months);
      const res = await this.fetchWithTimeout(
        "https://openapi.naver.com/v1/datalab/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Naver-Client-Id": this.clientId,
            "X-Naver-Client-Secret": this.clientSecret,
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) return null;

      const data = await res.json();
      const results = data.results?.[0]?.data || [];

      const timelineData = results.map((point: { period: string; ratio: number }) => ({
        date: point.period.substring(0, 7), // "2025-01-01" → "2025-01"
        value: Math.round(point.ratio),
      }));

      if (timelineData.length === 0) return null;

      // 트렌드 분석
      const values = timelineData.map((d: { value: number }) => d.value);
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const avgFirst = firstHalf.reduce((s: number, v: number) => s + v, 0) / (firstHalf.length || 1);
      const avgSecond = secondHalf.reduce((s: number, v: number) => s + v, 0) / (secondHalf.length || 1);
      const trendScore = avgFirst > 0 ? (avgSecond - avgFirst) / avgFirst : 0;

      // 계절성 계산 (표준편차 기반)
      const mean = values.reduce((s: number, v: number) => s + v, 0) / values.length;
      const variance = values.reduce((s: number, v: number) => s + (v - mean) ** 2, 0) / values.length;
      const seasonality = Math.min(1, Math.sqrt(variance) / (mean || 1));

      return {
        keyword,
        locale: options?.locale ?? "ko",
        source: "naver_datalab",
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

// ── 유틸리티 ──

function buildDatalabBody(keyword: string, months: number) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    timeUnit: "month",
    keywordGroups: [
      {
        groupName: keyword,
        keywords: [keyword],
      },
    ],
  };
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── Types ──

export type DemographicTrendResult = {
  keyword: string;
  genderBreakdown: { gender: string; avgRatio: number }[];
  ageBreakdown: { ageGroup: string; label: string; avgRatio: number }[];
  collectedAt: string;
};
