/**
 * Trace Builder
 *
 * SearchTraceMetadata를 생성하는 공통 빌더.
 * 모든 서비스에서 재사용.
 */

import type { NormalizedSearchAnalyticsPayload } from "@/lib/search-data/types";
import type { SearchTraceMetadata } from "./types";

const ENGINE_VERSION = "0.3.0";
const STALE_HOURS = 24;

/**
 * payload의 수집 메타에서 SearchTraceMetadata를 생성한다.
 */
export function buildTraceFromPayload(
  payload: NormalizedSearchAnalyticsPayload,
  overrides?: {
    analysisId?: string;
    batchId?: string;
    engine?: string;
  },
): SearchTraceMetadata {
  const now = new Date().toISOString();
  const collectedDate = new Date(payload.collectedAt);
  const hoursAge = (Date.now() - collectedDate.getTime()) / (1000 * 60 * 60);

  const successfulSources = payload.sources.filter((s) => s.status === "ready");
  const totalSources = payload.sources.length;

  // 경고 수집
  const warnings: string[] = [];
  const lowConfidenceReasons: string[] = [];
  const partialDataFlags: string[] = [];

  if (totalSources === 0) {
    warnings.push("데이터 소스가 하나도 연결되지 않았습니다");
  }
  if (successfulSources.length < totalSources) {
    partialDataFlags.push(
      `${totalSources - successfulSources.length}/${totalSources} 소스 실패`,
    );
  }
  if (payload.relatedKeywords.length < 5) {
    lowConfidenceReasons.push("연관 키워드 부족 (< 5개)");
  }
  if (payload.serpDocuments.length === 0) {
    lowConfidenceReasons.push("SERP 데이터 없음");
  }
  if (hoursAge > STALE_HOURS) {
    warnings.push(`데이터 수집 후 ${Math.round(hoursAge)}시간 경과 — 최신 데이터가 아닐 수 있습니다`);
  }

  // 신뢰도 계산
  const sourceRatio = totalSources > 0 ? successfulSources.length / totalSources : 0;
  const dataRichness = Math.min(1.0, (
    (payload.relatedKeywords.length > 0 ? 0.3 : 0) +
    (payload.serpDocuments.length > 0 ? 0.25 : 0) +
    (payload.trendSeries.length > 0 ? 0.2 : 0) +
    (payload.seedData ? 0.15 : 0) +
    (payload.intentCandidates.length > 0 ? 0.1 : 0)
  ));
  const confidence = Math.round(sourceRatio * 0.4 + dataRichness * 0.6 * 100) / 100;

  // 신선도
  let freshness: SearchTraceMetadata["freshness"];
  if (hoursAge < 1) freshness = "fresh";
  else if (hoursAge < STALE_HOURS) freshness = "recent";
  else freshness = "stale";

  // mock 전용 소스인지 확인
  const allMock = payload.sources.every((s) => s.source === "mock");
  if (allMock && payload.sources.length > 0) {
    warnings.push("모든 데이터가 Mock 소스에서 제공됨 — 실제 검색 데이터가 아닙니다");
  }

  return {
    analysisId: overrides?.analysisId ?? `si-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    batchId: overrides?.batchId,
    seedKeyword: payload.seedKeyword,
    locale: payload.locale,
    analyzedAt: now,
    sourceSummary: {
      totalSources,
      successfulSources: successfulSources.length,
      sources: payload.sources.map((s) => ({
        name: s.source,
        status: s.status,
        itemCount: s.itemCount,
        latencyMs: s.latencyMs,
      })),
    },
    confidence,
    freshness,
    isPartial: partialDataFlags.length > 0,
    engineVersion: ENGINE_VERSION,
    warnings,
    lowConfidenceReasons,
    partialDataFlags,
    evidenceRefs: [],
  };
}

/**
 * 엔진 실행 완료 후 trace를 업데이트한다.
 */
export function finalizeTrace(
  trace: SearchTraceMetadata,
  extras?: {
    durationMs?: number;
    evidenceRefs?: string[];
    additionalWarnings?: string[];
  },
): SearchTraceMetadata {
  return {
    ...trace,
    completedAt: new Date().toISOString(),
    durationMs: extras?.durationMs,
    evidenceRefs: [...trace.evidenceRefs, ...(extras?.evidenceRefs ?? [])],
    warnings: [...trace.warnings, ...(extras?.additionalWarnings ?? [])],
  };
}
