/**
 * Google Ads Keyword Planner Adapter
 *
 * Google Ads API v17 REST를 통해 키워드 검색량, CPC, 경쟁도를 수집한다.
 *
 * API: https://developers.google.com/google-ads/api/docs/keyword-planning/overview
 *
 * 환경 변수:
 * - GOOGLE_ADS_CLIENT_ID: OAuth 2.0 Client ID
 * - GOOGLE_ADS_CLIENT_SECRET: OAuth 2.0 Client Secret
 * - GOOGLE_ADS_DEVELOPER_TOKEN: Google Ads Developer Token
 * - GOOGLE_ADS_REFRESH_TOKEN: OAuth 2.0 Refresh Token
 * - GOOGLE_ADS_CUSTOMER_ID: Google Ads Customer ID (MCC or leaf)
 * - GOOGLE_ADS_LOGIN_CUSTOMER_ID: MCC 경유 시 로그인 Customer ID (optional)
 *
 * 제약:
 * - 광고 계정 + 최소 지출 필요 (Standard Access → 정확한 검색량)
 * - Basic Access: 범위 형태의 검색량만 제공 (e.g., 1K-10K)
 * - Standard Access: 정확한 월별 검색량 제공
 * - 일 15,000 operations
 *
 * 인증 흐름:
 * 1. refresh_token으로 access_token 발급 (Google OAuth2)
 * 2. access_token + developer_token으로 REST API 호출
 * 3. access_token 만료 시 자동 갱신
 */

import { BaseSearchAdapter } from "./base-adapter";
import type {
  AdapterCapability,
  HealthCheckResult,
  CollectOptions,
  NormalizedSearchKeyword,
  NormalizedRelatedKeyword,
} from "../types";

const GOOGLE_ADS_API_VERSION = "v17";
const GOOGLE_ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

export class GoogleAdsAdapter extends BaseSearchAdapter {
  readonly source = "google_ads" as const;
  readonly displayName = "Google Ads Keyword Planner";

  private cachedAccessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  private get hasCredentials(): boolean {
    return !!(
      process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN &&
      process.env.GOOGLE_ADS_CUSTOMER_ID
    );
  }

  private get customerId(): string {
    return (process.env.GOOGLE_ADS_CUSTOMER_ID ?? "").replace(/-/g, "");
  }

  private get loginCustomerId(): string | undefined {
    const id = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
    return id ? id.replace(/-/g, "") : undefined;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    if (!this.hasCredentials) {
      return this.buildHealthResult(
        "unavailable",
        Date.now() - start,
        "Missing Google Ads API credentials (CLIENT_ID, CLIENT_SECRET, DEVELOPER_TOKEN, REFRESH_TOKEN, CUSTOMER_ID)",
      );
    }

    try {
      const token = await this.getAccessToken();
      if (!token) {
        return this.buildHealthResult(
          "error",
          Date.now() - start,
          "OAuth2 token refresh failed",
        );
      }

      // listAccessibleCustomers로 연결 확인
      const res = await this.fetchWithTimeout(
        `${GOOGLE_ADS_BASE_URL}/customers:listAccessibleCustomers`,
        {
          method: "GET",
          headers: this.buildHeaders(token),
        },
        10000,
      );

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "");
        return this.buildHealthResult(
          "error",
          Date.now() - start,
          `Google Ads API HTTP ${res.status}: ${errorBody.substring(0, 200)}`,
        );
      }

      const data = await res.json();
      const customerCount = data.resourceNames?.length ?? 0;
      return this.buildHealthResult(
        "ready",
        Date.now() - start,
        `Google Ads connected — ${customerCount} accessible customer(s)`,
      );
    } catch (err) {
      return this.buildHealthResult(
        "error",
        Date.now() - start,
        `Google Ads health check failed: ${(err as Error).message}`,
      );
    }
  }

  getCapabilities(): AdapterCapability[] {
    return ["seed_keyword_volume", "related_keywords", "competition"];
  }

  /**
   * 키워드 검색량/CPC/경쟁도 수집
   *
   * REST Endpoint: POST /customers/{customerId}:generateKeywordIdeas
   *
   * KeywordPlanIdeaService.generateKeywordIdeas() 사용.
   * keyword_seed에 시드 키워드를 전달하고 결과에서 시드와 일치하는 항목을 추출.
   */
  async collectSeedKeywordData(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedSearchKeyword | null> {
    if (!this.hasCredentials) return null;

    try {
      const ideas = await this.generateKeywordIdeas(keyword, options);
      if (!ideas || ideas.length === 0) return null;

      // 시드 키워드와 일치하는 결과 우선, 없으면 첫 번째 사용
      const normalizedSeed = keyword.toLowerCase().trim();
      const seedIdea = ideas.find(
        (idea: GoogleAdsKeywordIdea) => idea.text?.toLowerCase().trim() === normalizedSeed,
      ) ?? ideas[0];

      const metrics = seedIdea!.keywordIdeaMetrics ?? {};

      return {
        keyword,
        normalizedKeyword: this.normalizeKeyword(keyword),
        locale: options?.locale ?? "ko",
        source: "google_ads",
        avgMonthlySearches: metrics.avgMonthlySearches ?? 0,
        cpc: parseMicros(metrics.highTopOfPageBidMicros) ?? parseMicros(metrics.lowTopOfPageBidMicros),
        competitionIndex: mapCompetitionToIndex(metrics.competition),
        competitionLevel: mapCompetitionToLevel(metrics.competition),
        monthlyBreakdown: (metrics.monthlySearchVolumes ?? []).map(
          (m: { year: number; month: string; monthlySearches: number }) => ({
            year: m.year,
            month: parseMonthEnum(m.month),
            searches: m.monthlySearches ?? 0,
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
   * generateKeywordIdeas()의 결과에서 시드를 제외한 키워드를 추출.
   */
  async collectRelatedKeywords(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedRelatedKeyword[]> {
    if (!this.hasCredentials) return [];

    const locale = options?.locale ?? "ko";
    const maxResults = options?.maxResults ?? 30;

    try {
      const ideas = await this.generateKeywordIdeas(keyword, options);
      if (!ideas || ideas.length === 0) return [];

      const normalizedSeed = keyword.toLowerCase().trim();
      return ideas
        .filter((idea: GoogleAdsKeywordIdea) => idea.text?.toLowerCase().trim() !== normalizedSeed)
        .slice(0, maxResults)
        .map((idea: GoogleAdsKeywordIdea, i: number) => ({
          keyword: idea.text ?? "",
          normalizedKeyword: this.normalizeKeyword(idea.text ?? ""),
          parentKeyword: keyword,
          locale,
          source: "google_ads" as const,
          sourceType: "related" as const,
          avgMonthlySearches: idea.keywordIdeaMetrics?.avgMonthlySearches ?? 0,
          position: i + 1,
          collectedAt: new Date().toISOString(),
        }));
    } catch {
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Private: OAuth2 + API 호출
  // ═══════════════════════════════════════════════════════════════

  /**
   * OAuth2 refresh token → access token
   * 캐시된 토큰이 유효하면 재사용.
   */
  private async getAccessToken(): Promise<string | null> {
    if (this.cachedAccessToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedAccessToken;
    }

    try {
      const body = new URLSearchParams({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
        grant_type: "refresh_token",
      });

      const res = await this.fetchWithTimeout(
        OAUTH_TOKEN_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        },
        10000,
      );

      if (!res.ok) return null;

      const data = await res.json();
      this.cachedAccessToken = data.access_token;
      // 만료 5분 전에 갱신하도록 설정
      this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
      return this.cachedAccessToken;
    } catch {
      return null;
    }
  }

  private buildHeaders(accessToken: string): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      "Content-Type": "application/json",
    };
    if (this.loginCustomerId) {
      headers["login-customer-id"] = this.loginCustomerId;
    }
    return headers;
  }

  /**
   * KeywordPlanIdeaService.generateKeywordIdeas REST 호출
   */
  private async generateKeywordIdeas(
    keyword: string,
    options?: CollectOptions,
  ): Promise<GoogleAdsKeywordIdea[] | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    const body = {
      keywordSeed: { keywords: [keyword] },
      language: "languageConstants/1012",              // Korean
      geoTargetConstants: ["geoTargetConstants/2410"], // South Korea
      keywordPlanNetwork: "GOOGLE_SEARCH",
      ...(options?.dateRange && {
        historicalMetricsOptions: {
          yearMonthRange: {
            start: { year: parseInt(options.dateRange!.start.split("-")[0]!, 10), month: parseMonthString(options.dateRange!.start) },
            end: { year: parseInt(options.dateRange!.end.split("-")[0]!, 10), month: parseMonthString(options.dateRange!.end) },
          },
        },
      }),
    };

    const res = await this.fetchWithTimeout(
      `${GOOGLE_ADS_BASE_URL}/customers/${this.customerId}:generateKeywordIdeas`,
      {
        method: "POST",
        headers: this.buildHeaders(token),
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data.results ?? [];
  }
}

// ═══════════════════════════════════════════════════════════════
// Type helpers (Google Ads API response shapes)
// ═══════════════════════════════════════════════════════════════

type GoogleAdsKeywordIdea = {
  text?: string;
  keywordIdeaMetrics?: {
    avgMonthlySearches?: number;
    competition?: string; // "UNSPECIFIED" | "UNKNOWN" | "LOW" | "MEDIUM" | "HIGH"
    highTopOfPageBidMicros?: string;
    lowTopOfPageBidMicros?: string;
    monthlySearchVolumes?: {
      year: number;
      month: string; // "JANUARY" etc.
      monthlySearches: number;
    }[];
  };
};

function parseMicros(micros?: string): number | undefined {
  if (!micros) return undefined;
  const val = parseInt(micros, 10);
  return isNaN(val) ? undefined : val / 1_000_000;
}

function mapCompetitionToIndex(competition?: string): number | undefined {
  switch (competition) {
    case "LOW": return 0.2;
    case "MEDIUM": return 0.5;
    case "HIGH": return 0.8;
    default: return undefined;
  }
}

function mapCompetitionToLevel(competition?: string): "low" | "medium" | "high" | undefined {
  switch (competition) {
    case "LOW": return "low";
    case "MEDIUM": return "medium";
    case "HIGH": return "high";
    default: return undefined;
  }
}

const MONTH_ENUM_MAP: Record<string, number> = {
  JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, MAY: 5, JUNE: 6,
  JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12,
};

function parseMonthEnum(month: string): number {
  return MONTH_ENUM_MAP[month] ?? 1;
}

function parseMonthString(dateStr: string): string {
  const monthNum = parseInt(dateStr.split("-")[1]!, 10);
  return Object.keys(MONTH_ENUM_MAP).find((k) => MONTH_ENUM_MAP[k] === monthNum) ?? "JANUARY";
}
