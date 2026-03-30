/**
 * Search Connector Registry
 *
 * 모든 검색 데이터 어댑터를 등록/관리하는 싱글턴 레지스트리.
 * 환경 변수 기반으로 사용 가능한 어댑터를 자동 감지하고,
 * real/mock 전환을 투명하게 처리한다.
 */

import type {
  ISearchDataAdapter,
  SearchDataSource,
  SearchConnectorConfig,
  HealthCheckResult,
  AdapterCapability,
} from "./types";
import { DEFAULT_CONNECTOR_CONFIG, DATA_SOURCE_META, ENGINE_CAPABILITY_MAP } from "./types";

// ═══════════════════════════════════════════════════════════════
// Registry
// ═══════════════════════════════════════════════════════════════

class SearchConnectorRegistryImpl {
  private adapters = new Map<SearchDataSource, ISearchDataAdapter>();
  private config: SearchConnectorConfig = DEFAULT_CONNECTOR_CONFIG;

  /**
   * 어댑터 등록
   */
  register(adapter: ISearchDataAdapter): void {
    this.adapters.set(adapter.source, adapter);
  }

  /**
   * 어댑터 해제
   */
  unregister(source: SearchDataSource): void {
    this.adapters.delete(source);
  }

  /**
   * 특정 소스의 어댑터 조회
   */
  get(source: SearchDataSource): ISearchDataAdapter | undefined {
    return this.adapters.get(source);
  }

  /**
   * 등록된 모든 어댑터 목록
   */
  listAll(): ISearchDataAdapter[] {
    return [...this.adapters.values()];
  }

  /**
   * 활성화된(config에 포함된) 어댑터만 반환
   */
  listEnabled(): ISearchDataAdapter[] {
    return this.config.enabledSources
      .map((source) => this.adapters.get(source))
      .filter(Boolean) as ISearchDataAdapter[];
  }

  /**
   * 특정 capability를 지원하는 어댑터 조회 (우선순위 순)
   */
  findByCapability(capability: AdapterCapability): ISearchDataAdapter[] {
    return this.listEnabled().filter((adapter) =>
      adapter.getCapabilities().includes(capability),
    );
  }

  /**
   * 전체 건강 상태 확인
   */
  async healthCheckAll(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    for (const adapter of this.listEnabled()) {
      try {
        const result = await adapter.healthCheck();
        results.push(result);
      } catch (err) {
        results.push({
          source: adapter.source,
          status: "error",
          latencyMs: 0,
          message: (err as Error).message,
          checkedAt: new Date().toISOString(),
        });
      }
    }
    return results;
  }

  /**
   * 설정 업데이트
   */
  configure(config: Partial<SearchConnectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 현재 설정 조회
   */
  getConfig(): SearchConnectorConfig {
    return { ...this.config };
  }

  /**
   * 환경 변수 기반 자동 감지
   *
   * 각 데이터 소스의 필수 env 키가 존재하면 "available"로 판단.
   * 없으면 mock fallback으로 전환.
   */
  detectAvailableSources(): {
    available: SearchDataSource[];
    unavailable: { source: SearchDataSource; missingKeys: string[] }[];
  } {
    const available: SearchDataSource[] = [];
    const unavailable: { source: SearchDataSource; missingKeys: string[] }[] = [];

    for (const [source, meta] of Object.entries(DATA_SOURCE_META)) {
      if (source === "mock") {
        available.push("mock");
        continue;
      }

      if (meta.envKeys.length === 0) {
        // 인증 불필요 소스 (google_autocomplete 등)
        available.push(source as SearchDataSource);
        continue;
      }

      const missingKeys = meta.envKeys.filter(
        (key) => !process.env[key],
      );

      if (missingKeys.length === 0) {
        available.push(source as SearchDataSource);
      } else {
        unavailable.push({
          source: source as SearchDataSource,
          missingKeys,
        });
      }
    }

    return { available, unavailable };
  }

  /**
   * 레지스트리 초기화 — 환경에 맞는 어댑터 자동 등록
   */
  async initialize(): Promise<void> {
    if (!this.config.autoDetect) return;

    const { available } = this.detectAvailableSources();

    // mock이 항상 fallback으로 등록되도록
    if (this.config.enableMockFallback && !this.adapters.has("mock")) {
      const { MockSearchAdapter } = await import("./adapters/mock-adapter");
      this.register(new MockSearchAdapter());
    }

    // 가용 소스 중 아직 등록 안 된 것들 동적 등록
    for (const source of available) {
      if (this.adapters.has(source)) continue;

      try {
        const adapter = await loadAdapter(source);
        if (adapter) this.register(adapter);
      } catch {
        // 로딩 실패 시 무시 — mock fallback 사용
      }
    }
  }

  /**
   * 현재 활성 어댑터 기준, 각 capability를 제공하는 소스 목록
   */
  getCapabilityMap(): Record<AdapterCapability, SearchDataSource[]> {
    const map = {} as Record<AdapterCapability, SearchDataSource[]>;
    for (const adapter of this.listEnabled()) {
      for (const cap of adapter.getCapabilities()) {
        if (!map[cap]) map[cap] = [];
        map[cap].push(adapter.source);
      }
    }
    return map;
  }

  /**
   * 각 엔진의 데이터 준비 상태 확인
   *
   * required capability가 모두 충족되면 "ready",
   * 일부만 충족되면 "partial", 하나도 없으면 "unavailable".
   */
  getEngineReadiness(): Record<string, {
    status: "ready" | "partial" | "unavailable";
    fulfilled: AdapterCapability[];
    missing: AdapterCapability[];
    optional: { capability: AdapterCapability; available: boolean }[];
  }> {
    const capMap = this.getCapabilityMap();
    const result: Record<string, {
      status: "ready" | "partial" | "unavailable";
      fulfilled: AdapterCapability[];
      missing: AdapterCapability[];
      optional: { capability: AdapterCapability; available: boolean }[];
    }> = {};

    for (const [engine, spec] of Object.entries(ENGINE_CAPABILITY_MAP)) {
      const fulfilled = spec.required.filter((cap) => (capMap[cap]?.length ?? 0) > 0);
      const missing = spec.required.filter((cap) => (capMap[cap]?.length ?? 0) === 0);
      const optional = spec.optional.map((cap) => ({
        capability: cap,
        available: (capMap[cap]?.length ?? 0) > 0,
      }));

      let status: "ready" | "partial" | "unavailable";
      if (missing.length === 0) status = "ready";
      else if (fulfilled.length > 0) status = "partial";
      else status = "unavailable";

      result[engine] = { status, fulfilled, missing, optional };
    }

    return result;
  }

  /**
   * 레지스트리 상태 요약
   */
  getSummary(): {
    registered: { source: SearchDataSource; capabilities: AdapterCapability[] }[];
    enabled: SearchDataSource[];
    config: SearchConnectorConfig;
  } {
    return {
      registered: [...this.adapters.entries()].map(([source, adapter]) => ({
        source,
        capabilities: adapter.getCapabilities(),
      })),
      enabled: this.config.enabledSources,
      config: this.config,
    };
  }
}

/**
 * 소스별 어댑터 동적 로딩
 */
async function loadAdapter(
  source: SearchDataSource,
): Promise<ISearchDataAdapter | null> {
  switch (source) {
    case "google_autocomplete": {
      const { GoogleAutocompleteAdapter } = await import("./adapters/google-autocomplete-adapter");
      return new GoogleAutocompleteAdapter();
    }
    case "naver_search": {
      const { NaverSearchAdapter } = await import("./adapters/naver-search-adapter");
      return new NaverSearchAdapter();
    }
    case "google_ads": {
      const { GoogleAdsAdapter } = await import("./adapters/google-ads-adapter");
      return new GoogleAdsAdapter();
    }
    case "google_trends": {
      const { GoogleTrendsAdapter } = await import("./adapters/google-trends-adapter");
      return new GoogleTrendsAdapter();
    }
    case "serp_api": {
      const { SerpApiAdapter } = await import("./adapters/serp-adapter");
      return new SerpApiAdapter();
    }
    case "dataforseo": {
      const { DataForSeoAdapter } = await import("./adapters/dataforseo-adapter");
      return new DataForSeoAdapter();
    }
    case "naver_datalab": {
      const { NaverDatalabAdapter } = await import("./adapters/naver-datalab-adapter");
      return new NaverDatalabAdapter();
    }
    case "mock": {
      const { MockSearchAdapter } = await import("./adapters/mock-adapter");
      return new MockSearchAdapter();
    }
    default:
      return null;
  }
}

// ─── Singleton Export ─────────────────────────────────────────

export const SearchConnectorRegistry = new SearchConnectorRegistryImpl();
