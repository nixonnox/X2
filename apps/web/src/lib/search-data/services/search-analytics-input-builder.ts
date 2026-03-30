/**
 * Search Analytics Input Builder
 *
 * 검색 데이터 수집 → 정규화 → 각 엔진 입력 생성을 하나의 파이프라인으로 연결한다.
 *
 * 사용 흐름:
 * 1. resolveSearchData()로 통합 데이터 수집
 * 2. buildEngineInputs()로 엔진별 입력 변환
 * 3. 각 엔진 서비스에 입력 전달
 *
 * 또는 buildFullAnalysisInput()으로 한번에 수집 + 변환
 */

import { resolveSearchData } from "../resolver";
import {
  toIntentEngineInput,
  toClusterEngineInput,
  toJourneyEngineInput,
  toPersonaEngineInput,
  toGeoAeoEngineInput,
} from "./search-normalization-service";
import type {
  CollectOptions,
  NormalizedSearchAnalyticsPayload,
  IntentEngineInput,
  ClusterEngineInput,
  JourneyEngineInput,
  PersonaEngineInput,
  GeoAeoEngineInput,
} from "../types";

// ═══════════════════════════════════════════════════════════════
// Engine Inputs Bundle
// ═══════════════════════════════════════════════════════════════

export type EngineInputBundle = {
  /** 원본 통합 페이로드 */
  payload: NormalizedSearchAnalyticsPayload;
  /** intent-engine용 입력 */
  intentInput: IntentEngineInput;
  /** cluster-finder용 입력 */
  clusterInput: ClusterEngineInput;
  /** pathfinder/roadview용 입력 */
  journeyInput: JourneyEngineInput;
  /** persona-engine용 입력 */
  personaInput: PersonaEngineInput;
  /** GEO/AEO 엔진용 입력 */
  geoAeoInput: GeoAeoEngineInput;
  /** 수집 메타 정보 */
  meta: {
    seedKeyword: string;
    locale: string;
    totalSources: number;
    successfulSources: number;
    totalRelatedKeywords: number;
    hasSerpData: boolean;
    hasTrendData: boolean;
    hasQuestionData: boolean;
    collectedAt: string;
  };
};

// ═══════════════════════════════════════════════════════════════
// 빌더 함수
// ═══════════════════════════════════════════════════════════════

/**
 * 이미 수집된 페이로드에서 엔진별 입력을 변환한다.
 */
export function buildEngineInputs(
  payload: NormalizedSearchAnalyticsPayload,
): EngineInputBundle {
  const successfulSources = payload.sources.filter(
    (s) => s.status === "ready",
  ).length;

  return {
    payload,
    intentInput: toIntentEngineInput(payload),
    clusterInput: toClusterEngineInput(payload),
    journeyInput: toJourneyEngineInput(payload),
    personaInput: toPersonaEngineInput(payload),
    geoAeoInput: toGeoAeoEngineInput(payload),
    meta: {
      seedKeyword: payload.seedKeyword,
      locale: payload.locale,
      totalSources: payload.sources.length,
      successfulSources,
      totalRelatedKeywords: payload.relatedKeywords.length,
      hasSerpData: payload.serpDocuments.length > 0,
      hasTrendData: payload.trendSeries.length > 0,
      hasQuestionData: payload.serpDocuments.some((d) => d.peopleAlsoAsk.length > 0) ||
        payload.relatedKeywords.some((kw) => kw.sourceType === "paa" || kw.sourceType === "question"),
      collectedAt: payload.collectedAt,
    },
  };
}

/**
 * 데이터 수집 + 엔진 입력 변환을 한번에 수행한다.
 *
 * 이것이 프론트엔드/API에서 호출하는 메인 진입점.
 */
export async function buildFullAnalysisInput(
  seedKeyword: string,
  options?: CollectOptions,
): Promise<EngineInputBundle> {
  // 1. 모든 활성 어댑터에서 데이터 수집
  const payload = await resolveSearchData(seedKeyword, options);

  // 2. 엔진별 입력 변환
  return buildEngineInputs(payload);
}

/**
 * 수집 상태 요약 문자열 (디버그/로깅용)
 */
export function summarizeCollection(bundle: EngineInputBundle): string {
  const { meta } = bundle;
  const lines = [
    `[Search Data] "${meta.seedKeyword}" (${meta.locale})`,
    `  Sources: ${meta.successfulSources}/${meta.totalSources} active`,
    `  Related Keywords: ${meta.totalRelatedKeywords}`,
    `  SERP Data: ${meta.hasSerpData ? "available" : "none"}`,
    `  Trend Data: ${meta.hasTrendData ? "available" : "none"}`,
    `  Question Data: ${meta.hasQuestionData ? "available" : "none"}`,
    `  Engine Inputs: intent, cluster, journey, persona, geo-aeo`,
    `  Collected: ${meta.collectedAt}`,
  ];
  return lines.join("\n");
}
