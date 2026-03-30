/**
 * Mock Search Adapter
 *
 * 기존 intent-engine의 시뮬레이션 로직을 재사용하여
 * 개발/테스트용 mock 데이터를 제공한다.
 *
 * 실제 API 키 없이도 전체 파이프라인을 테스트할 수 있다.
 */

import { BaseSearchAdapter } from "./base-adapter";
import type {
  AdapterCapability,
  HealthCheckResult,
  CollectOptions,
  NormalizedSearchKeyword,
  NormalizedRelatedKeyword,
  NormalizedTrendSeries,
} from "../types";

export class MockSearchAdapter extends BaseSearchAdapter {
  readonly source = "mock" as const;
  readonly displayName = "Mock Data (시뮬레이션)";

  async healthCheck(): Promise<HealthCheckResult> {
    return this.buildHealthResult("ready", 0, "Mock adapter always available");
  }

  getCapabilities(): AdapterCapability[] {
    return ["seed_keyword_volume", "related_keywords", "trend_series", "autocomplete"];
  }

  async collectSeedKeywordData(
    keyword: string,
    _options?: CollectOptions,
  ): Promise<NormalizedSearchKeyword> {
    const volume = estimateSearchVolume(keyword, 0);
    return {
      keyword,
      normalizedKeyword: this.normalizeKeyword(keyword),
      locale: "ko",
      source: "mock",
      avgMonthlySearches: volume,
      cpc: Math.round(seededRandom(keyword, 100) * 200) / 100,
      competitionIndex: Math.round(seededRandom(keyword, 200) * 100) / 100,
      collectedAt: new Date().toISOString(),
    };
  }

  async collectRelatedKeywords(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedRelatedKeyword[]> {
    const maxResults = options?.maxResults ?? 30;
    const suffixes = getKoreanSuffixes();
    const results: NormalizedRelatedKeyword[] = [];

    for (let i = 0; i < Math.min(maxResults, suffixes.length); i++) {
      const related = `${keyword} ${suffixes[i]}`;
      results.push({
        keyword: related,
        normalizedKeyword: this.normalizeKeyword(related),
        parentKeyword: keyword,
        locale: "ko",
        source: "mock",
        sourceType: i < 10 ? "autocomplete" : "related",
        avgMonthlySearches: estimateSearchVolume(related, 1),
        position: i + 1,
        collectedAt: new Date().toISOString(),
      });
    }

    return results;
  }

  async collectTrendSeries(
    keyword: string,
    _options?: CollectOptions,
  ): Promise<NormalizedTrendSeries> {
    const now = new Date();
    const timelineData: { date: string; value: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const base = 50 + seededRandom(keyword, i) * 50;
      const seasonal = Math.sin((d.getMonth() / 12) * Math.PI * 2) * 15;
      timelineData.push({
        date: period,
        value: Math.round(Math.max(0, Math.min(100, base + seasonal))),
      });
    }

    const values = timelineData.map((d) => d.value);
    const firstHalf = values.slice(0, 6).reduce((s, v) => s + v, 0) / 6;
    const secondHalf = values.slice(6).reduce((s, v) => s + v, 0) / 6;
    const trendScore = firstHalf > 0 ? (secondHalf - firstHalf) / firstHalf : 0;

    return {
      keyword,
      locale: "ko",
      source: "mock",
      timelineData,
      overallTrend: trendScore > 0.1 ? "rising" : trendScore < -0.1 ? "declining" : "stable",
      trendScore: Math.round(trendScore * 100) / 100,
      seasonality: 0.3,
      yoyGrowth: Math.round(trendScore * 100),
      isBreakout: trendScore > 0.5,
      collectedAt: new Date().toISOString(),
    };
  }
}

// ─── 시뮬레이션 유틸리티 (기존 intent-engine에서 이동) ──────

function seededRandom(seed: string, index: number): number {
  let hash = 0;
  const str = `${seed}-${index}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return ((hash & 0x7fffffff) % 10000) / 10000;
}

function estimateSearchVolume(keyword: string, depth: number): number {
  const baseVolumes = [10000, 3000, 800, 200, 50];
  const base = baseVolumes[Math.min(depth, 4)]!;
  const variation = seededRandom(keyword, 0) * 0.8 + 0.2;
  return Math.round(base * variation);
}

function getKoreanSuffixes(): string[] {
  return [
    "추천", "비교", "가격", "후기", "방법", "순위", "종류",
    "효과", "부작용", "대안", "할인", "무료", "최신", "인기",
    "사용법", "장단점", "선택", "차이", "리뷰", "평가",
    "구매", "신청", "가입", "설치", "다운로드",
    "에러", "오류", "해결", "환불", "취소",
  ];
}
