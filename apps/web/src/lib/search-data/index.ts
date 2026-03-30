/**
 * Search Data Connector — Public API
 *
 * 검색 데이터 수집/정규화/엔진연결을 위한 통합 진입점.
 *
 * 사용 예:
 * ```ts
 * import { buildFullAnalysisInput, SearchConnectorRegistry } from "@/lib/search-data";
 *
 * // 레지스트리 초기화 (앱 시작 시 1회)
 * await SearchConnectorRegistry.initialize();
 *
 * // 데이터 수집 + 엔진 입력 생성
 * const bundle = await buildFullAnalysisInput("화장품 추천");
 *
 * // 개별 엔진에 전달
 * const intentResult = await intentEngine.analyze({
 *   seedKeyword: bundle.intentInput.seedKeyword,
 *   // ... bundle.intentInput 활용
 * });
 * ```
 */

// ── Registry & Resolver ──
export { SearchConnectorRegistry } from "./registry";
export { resolveSearchData } from "./resolver";

// ── Services ──
export {
  buildFullAnalysisInput,
  buildEngineInputs,
  summarizeCollection,
  type EngineInputBundle,
} from "./services/search-analytics-input-builder";
export {
  toIntentEngineInput,
  toClusterEngineInput,
  toJourneyEngineInput,
  toPersonaEngineInput,
  toGeoAeoEngineInput,
} from "./services/search-normalization-service";

// ── Types ──
export type {
  SearchDataSource,
  AdapterStatus,
  AdapterCapability,
  HealthCheckResult,
  CollectOptions,
  ISearchDataAdapter,
  NormalizedSearchKeyword,
  NormalizedRelatedKeyword,
  NormalizedTrendSeries,
  NormalizedSerpDocument,
  SerpOrganicResult,
  NormalizedSearchIntentCandidate,
  NormalizedSearchAnalyticsPayload,
  SearchConnectorConfig,
  IntentEngineInput,
  ClusterEngineInput,
  JourneyEngineInput,
  PersonaEngineInput,
  GeoAeoEngineInput,
} from "./types";

export { DEFAULT_CONNECTOR_CONFIG, DATA_SOURCE_META, ENGINE_CAPABILITY_MAP } from "./types";

// ── Adapters (동적 import 권장, 직접 import도 가능) ──
export { BaseSearchAdapter } from "./adapters/base-adapter";
export { MockSearchAdapter } from "./adapters/mock-adapter";
export { GoogleAutocompleteAdapter } from "./adapters/google-autocomplete-adapter";
export { NaverSearchAdapter } from "./adapters/naver-search-adapter";
export { NaverDatalabAdapter } from "./adapters/naver-datalab-adapter";
export { GoogleAdsAdapter } from "./adapters/google-ads-adapter";
export { GoogleTrendsAdapter } from "./adapters/google-trends-adapter";
export { SerpApiAdapter } from "./adapters/serp-adapter";
export { DataForSeoAdapter } from "./adapters/dataforseo-adapter";
