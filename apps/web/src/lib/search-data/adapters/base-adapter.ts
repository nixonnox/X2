/**
 * Base Search Data Adapter
 *
 * 모든 어댑터의 공통 기반 클래스.
 * 공통 유틸리티와 기본 구현을 제공한다.
 */

import type {
  ISearchDataAdapter,
  SearchDataSource,
  HealthCheckResult,
  AdapterCapability,
  CollectOptions,
  NormalizedSearchKeyword,
  NormalizedRelatedKeyword,
  NormalizedTrendSeries,
  NormalizedSerpDocument,
  NormalizedSearchAnalyticsPayload,
} from "../types";

export abstract class BaseSearchAdapter implements ISearchDataAdapter {
  abstract readonly source: SearchDataSource;
  abstract readonly displayName: string;

  abstract healthCheck(): Promise<HealthCheckResult>;
  abstract getCapabilities(): AdapterCapability[];

  // ── 기본 구현 (override 가능) ──

  async collectSeedKeywordData(
    _keyword: string,
    _options?: CollectOptions,
  ): Promise<NormalizedSearchKeyword | null> {
    return null; // 미지원 capability는 null 반환
  }

  async collectRelatedKeywords(
    _keyword: string,
    _options?: CollectOptions,
  ): Promise<NormalizedRelatedKeyword[]> {
    return [];
  }

  async collectTrendSeries(
    _keyword: string,
    _options?: CollectOptions,
  ): Promise<NormalizedTrendSeries | null> {
    return null;
  }

  async collectSerpDocuments(
    _keyword: string,
    _options?: CollectOptions,
  ): Promise<NormalizedSerpDocument | null> {
    return null;
  }

  normalize(_rawData: unknown): NormalizedSearchAnalyticsPayload {
    return {
      seedKeyword: "",
      locale: "ko",
      collectedAt: new Date().toISOString(),
      relatedKeywords: [],
      trendSeries: [],
      serpDocuments: [],
      intentCandidates: [],
      sources: [],
    };
  }

  // ── 공통 유틸리티 ──

  protected normalizeKeyword(keyword: string): string {
    return keyword.toLowerCase().trim().replace(/\s+/g, " ");
  }

  protected async fetchWithTimeout(
    url: string,
    init?: RequestInit,
    timeoutMs: number = 30000,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  protected buildHealthResult(
    status: HealthCheckResult["status"],
    latencyMs: number,
    message?: string,
  ): HealthCheckResult {
    return {
      source: this.source,
      status,
      latencyMs,
      message,
      checkedAt: new Date().toISOString(),
    };
  }
}
